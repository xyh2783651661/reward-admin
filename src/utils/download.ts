/**
 * 全局下载工具层
 *
 * 定位：只负责「把数据变成文件」这一件纯事情，不含任何 loading / 提示逻辑。
 * 交互层的 loading 与幂等控制统一交给 `@/hooks/useDownload`，两者分工如下：
 *
 *   useDownload（交互：loading、幂等、提示）  ->  download（传输：Blob 归一化、落盘）
 *
 * 为什么需要单独抽这一层：
 * 1. 各业务接口返回形态不一致，有的是 Blob，有的是裸 ArrayBuffer，过去每处各写一遍归一化；
 * 2. 下单 / 导出接口在报错时，后端同样返回 200 + JSON 错误体，而 `responseType: "blob"`
 *    会让 axios 原样透传，历史代码会把它当文件下载下来并提示「导出成功」；
 * 3. `revokeObjectURL` 立即调用在部分浏览器下会中断下载，需统一延迟释放。
 */

/** 可下载的数据形态，覆盖后端导出接口可能返回的所有二进制类型 */
export type DownloadSource = Blob | ArrayBuffer | ArrayBufferView | string;

/** 视为「错误响应」的 content-type 片段 */
const JSON_CONTENT_TYPES = ["application/json", "text/json"];

/** 下载完成后延迟释放 ObjectURL，给浏览器留出真正开始取流的窗口 */
const REVOKE_DELAY = 1000;

/**
 * 将任意可下载数据归一化为 Blob
 *
 * 业务现状：`config` 系列接口返回 Blob，`provider-health` 系列接口返回裸 ArrayBuffer，
 * 历史代码里前者直接 `createObjectURL(blob)`、后者要 `new Blob([response])`，各不相同。
 */
export function toBlob(data: DownloadSource): Blob {
  if (data instanceof Blob) return data;

  if (typeof data === "string") {
    return new Blob([data], { type: "text/plain;charset=utf-8" });
  }

  if (data instanceof ArrayBuffer) {
    return new Blob([data]);
  }

  // ArrayBufferView（Uint8Array / DataView 等）
  // 这里强转是为了绕开 TS 5.7+ 对 ArrayBuffer vs SharedArrayBuffer 的区分，
  // 运行时两者都能被 Blob 正常接收
  return new Blob([data as unknown as BlobPart]);
}

/**
 * 探测响应是否为「伪装成文件的 JSON 错误体」
 *
 * 导出接口鉴权失败、参数非法、数据量超限时，网关/后端往往仍返回 200，
 * 响应体是一段 JSON。此时若直接落盘，用户会得到一个打不开的 xlsx，
 * 而页面还提示「导出成功」——这是本次统一治理要消除的核心体验缺陷。
 */
export function isErrorResponse(data: unknown): boolean {
  if (data instanceof Blob) {
    const type = (data.type || "").toLowerCase();
    return JSON_CONTENT_TYPES.some(item => type.includes(item));
  }

  // 裸二进制无法读 content-type，改为嗅探首字节是否为 JSON 起始符
  const bytes = toBytes(data);
  if (!bytes) return false;

  for (let i = 0; i < bytes.length; i++) {
    const code = bytes[i];
    // 跳过 JSON 前的空白字符
    if (code === 0x20 || code === 0x0a || code === 0x0d || code === 0x09) {
      continue;
    }
    // `{` 或 `[`：几乎可以断定是 JSON 而非 xlsx(50 4B) / zip(50 4B) / pdf(25 50)
    return code === 0x7b || code === 0x5b;
  }

  return false;
}

/**
 * 读取错误响应体中的文本，用于提取后端返回的提示语
 */
export async function readErrorText(data: unknown): Promise<string> {
  if (data instanceof Blob) {
    try {
      return await data.text();
    } catch {
      return "";
    }
  }

  const bytes = toBytes(data);
  if (!bytes) return "";

  try {
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

/**
 * 从后端错误响应文本中提取人类可读的提示
 *
 * 兼容多种后端返回结构：`{ msg }` / `{ message }` / `{ error }` / 纯文本。
 */
export function extractErrorMessage(text: string): string {
  const raw = (text || "").trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const candidate =
        parsed.msg ?? parsed.message ?? parsed.error ?? parsed.errorMsg;
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  } catch {
    // 非 JSON，走下方纯文本兜底
  }

  // 纯文本过长时截断，避免把整页 HTML 怼进 message
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
}

/**
 * 触发浏览器下载（核心落盘动作）
 *
 * 历史写法把 `<a>` 留在 DOM 之外且立即 `revokeObjectURL`，在 Firefox / Safari 下
 * 存在下载被中断的风险。这里统一：挂到 DOM -> 点击 -> 移除 -> 延迟释放 URL。
 */
export function saveBlob(data: DownloadSource, fileName: string): void {
  const blob = toBlob(data);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // 延迟移除，确保点击事件已派发完成
  window.setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, REVOKE_DELAY);
}

/**
 * 通过 URL 直接下载
 *
 * 适用于后端已返回直链的场景（如 OSS 签名 URL），
 * 同源直链可用 `download` 属性重命名，跨域链接只能依赖服务端的 `Content-Disposition`。
 */
export function downloadByUrl(
  url: string,
  fileName?: string,
  target: "_self" | "_blank" = "_self"
): void {
  if (target === "_blank") {
    window.open(url, "_blank");
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  if (fileName) link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    document.body.removeChild(link);
  }, REVOKE_DELAY);
}

/** 将二进制数据源转为 Uint8Array，仅用于首字节嗅探，不可读则返回 null */
function toBytes(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  return null;
}
