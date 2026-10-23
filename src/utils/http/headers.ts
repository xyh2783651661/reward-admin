import { generateSignature } from "@/utils/http/sign";

export const APP_ID = "wep-client";
export const CLIENT_TYPE = "web";
export const CLIENT_VERSION = __APP_INFO__?.pkg?.version ?? "1.0";

export function getDeviceType() {
  if (typeof window === "undefined") return "PC";
  const width = window.innerWidth;
  if (width < 768) return "MOBILE";
  if (width < 1200) return "TABLET";
  return "PC";
}

/**
 * 每个请求都必须携带的应用签名头。
 *
 * axios 拦截器与基于 fetch 的 SSE 订阅共用这一份：
 * SSE 绕开了 axios，若不手动补上这些头，后端网关会直接拒绝连接，
 * 前端表现就是「进度一直拿不到」。
 */
export function buildSignedHeaders(): Record<string, string | number> {
  const timestamp = Date.now();
  return {
    "X-App-Id": APP_ID,
    "X-Timestamp": timestamp,
    "X-Signature": generateSignature(APP_ID, timestamp),
    "X-Device-Type": getDeviceType(),
    "X-Client-Type": CLIENT_TYPE,
    "X-Client-Version": CLIENT_VERSION
  };
}
