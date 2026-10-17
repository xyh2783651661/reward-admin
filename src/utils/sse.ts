import { getToken, formatToken } from "@/utils/auth";

/**
 * 基于 fetch 的 SSE（Server-Sent Events）订阅。
 *
 * 为什么不用浏览器原生的 EventSource：
 * 它不支持自定义请求头，而本项目的鉴权依赖 Authorization，
 * 原生 API 根本发不出这个头，请求会被直接拒掉。
 * 用 fetch + 手动解析事件流是唯一能在带鉴权前提下使用 SSE 的方式。
 */

export type SseHandlers<T> = {
  /** 收到一条事件；event 为后端指定的事件名 */
  onMessage?: (data: T, event: string) => void;
  /** 连接失败或解析异常 */
  onError?: (err: Error) => void;
  /** 服务端正常关闭流 */
  onDone?: () => void;
};

/** 构造鉴权头；未登录时返回空对象，由服务端决定是否放行。 */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token?.accessToken
    ? { Authorization: formatToken(token.accessToken) }
    : {};
}

/**
 * 解析单个 SSE 事件块。
 *
 * 块内以换行分隔字段，形如：
 *   event: progress
 *   data: {"taskId":"..."}
 * 以 `:` 开头的是注释（本项目用作心跳 ping），直接忽略。
 */
function parseEventBlock<T>(
  block: string,
  onMessage?: (data: T, event: string) => void
): void {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    if (!line) continue;
    if (line.startsWith(":")) continue; // 心跳注释
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return;

  const payload = dataLines.join("\n");
  try {
    onMessage?.(JSON.parse(payload) as T, event);
  } catch {
    // 非 JSON 数据（如纯文本提示）忽略即可，不打断流
  }
}

/**
 * 订阅一条 SSE 流。
 *
 * @returns 取消函数；调用后中止连接且不再触发回调
 */
export function subscribeSse<T>(
  url: string,
  handlers: SseHandlers<T> = {},
  extraHeaders: Record<string, string> = {}
): () => void {
  const controller = new AbortController();
  const { onMessage, onError, onDone } = handlers;

  void (async () => {
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...authHeaders(),
          ...extraHeaders
        },
        signal: controller.signal
      });

      if (!resp.ok) {
        onError?.(new Error(`SSE 连接失败：HTTP ${resp.status}`));
        return;
      }
      if (!resp.body) {
        onError?.(new Error("SSE 连接失败：响应无内容流"));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 事件之间以空行分隔；可能一次读到多个事件或半个事件
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          parseEventBlock(block, onMessage);
        }
      }

      onDone?.();
    } catch (err) {
      // 主动取消是正常流程，不该当成错误上报
      if (controller.signal.aborted) return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => controller.abort();
}
