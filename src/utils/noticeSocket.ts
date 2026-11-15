/**
 * 通知推送 WebSocket 客户端。
 *
 * 设计要点：
 * 1. **首帧鉴权**：浏览器无法给 WebSocket 设置自定义请求头，而本项目的 Sa-Token 只认
 *    `X-Token` 头。把 token 放 URL 会进入后端访问日志的 params 字段（凭证明文落库），
 *    因此改为连接建立后立即发送 `{type:"AUTH",token}`，服务端校验通过才回 AUTH_OK。
 * 2. **自动重连**：断线后按指数退避重连（1s → 2s → 4s … 上限 30s），并带随机抖动，
 *    避免服务重启时所有客户端同时重连。
 * 3. **心跳**：每 30s 发 PING，超过 90s 没收到任何消息则主动断开重连
 *    （穿透 Nginx / 网关的空闲连接回收）。
 * 4. **无侵入降级**：连接失败只回调状态变化，由调用方决定是否退回轮询。
 */

export type NoticeSocketStatus = "idle" | "connecting" | "open" | "closed";

export type NoticeSocketMessage = {
  type: string;
  action?: string;
  noticeId?: number;
  at?: number;
};

type Options = {
  /** 获取当前 accessToken（原始 token，不带 Bearer 前缀） */
  getToken: () => string | undefined;
  /** 收到业务消息（已过滤 AUTH_OK / PONG） */
  onMessage: (msg: NoticeSocketMessage) => void;
  /** 连接状态变化，供调用方决定是否启用轮询兜底 */
  onStatus?: (status: NoticeSocketStatus) => void;
};

const AUTH_TIMEOUT_MS = 8_000;
const HEARTBEAT_MS = 30_000;
const IDLE_TIMEOUT_MS = 90_000;
const MAX_BACKOFF_MS = 30_000;

export class NoticeSocket {
  private ws: WebSocket | null = null;
  private opts: Options;
  private status: NoticeSocketStatus = "idle";
  private retry = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastInboundAt = 0;
  private manualClosed = false;

  constructor(opts: Options) {
    this.opts = opts;
  }

  get currentStatus(): NoticeSocketStatus {
    return this.status;
  }

  connect() {
    this.manualClosed = false;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    const token = this.opts.getToken();
    if (!token) {
      // 未登录不建立连接，等下次登录后再连
      this.setStatus("closed");
      return;
    }

    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws/notify`;
    this.setStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    // 鉴权超时保护：连上了但迟迟没通过鉴权，主动重连
    const authTimer = setTimeout(() => {
      if (this.status !== "open") {
        this.closeSocket();
        this.scheduleReconnect();
      }
    }, AUTH_TIMEOUT_MS);

    ws.onopen = () => {
      this.lastInboundAt = Date.now();
      ws.send(JSON.stringify({ type: "AUTH", token }));
      this.startHeartbeat();
    };

    ws.onmessage = event => {
      this.lastInboundAt = Date.now();
      let msg: NoticeSocketMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (msg.type === "AUTH_OK") {
        clearTimeout(authTimer);
        this.retry = 0;
        this.setStatus("open");
        return;
      }
      if (msg.type === "PONG") return;
      this.opts.onMessage(msg);
    };

    ws.onerror = () => {
      // 具体原因由 onclose 统一处理，这里不重复调度重连
    };

    ws.onclose = () => {
      clearTimeout(authTimer);
      this.stopHeartbeat();
      this.ws = null;
      this.setStatus("closed");
      if (!this.manualClosed) {
        this.scheduleReconnect();
      }
    };
  }

  /** 主动断开（登出或组件卸载） */
  disconnect() {
    this.manualClosed = true;
    this.clearReconnect();
    this.closeSocket();
    this.setStatus("closed");
  }

  private closeSocket() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // 忽略
      }
      this.ws = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 长时间没有任何入站消息，说明连接已经半死，主动重连
        if (Date.now() - this.lastInboundAt > IDLE_TIMEOUT_MS) {
          this.closeSocket();
          this.scheduleReconnect();
          return;
        }
        try {
          this.ws.send(JSON.stringify({ type: "PING" }));
        } catch {
          // 发送失败交给 onclose 处理
        }
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** 指数退避 + 抖动 */
  private scheduleReconnect() {
    this.clearReconnect();
    const base = Math.min(1000 * 2 ** this.retry, MAX_BACKOFF_MS);
    const delay = base + Math.floor(Math.random() * 500);
    this.retry += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: NoticeSocketStatus) {
    if (this.status === status) return;
    this.status = status;
    this.opts.onStatus?.(status);
  }
}
