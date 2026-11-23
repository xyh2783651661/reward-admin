/**
 * 统一从各种异常形态中提取可展示给用户的错误文案。
 * 支持：后端 Result{msg} / axios 响应体 / Error 实例 / HTTP 状态码 / 超时。
 *
 * 顺序很重要：**后端文案必须优先于 `Error.message`**。
 * axios 抛出的错误本身是 Error 实例，其 message 是英文内部描述
 * （"Request failed with status code 400"），若先命中它，
 * 后端在 body.msg 里给的中文提示就永远显示不出来。
 */
export function getErrorMessage(error: unknown, fallback = "操作失败"): string {
  const anyErr = error as any;

  // 1. 后端统一 Result 的 msg（axios 错误/自定义 reject 都可能是这个形态）
  const bodyMsg = anyErr?.response?.data?.msg;
  if (typeof bodyMsg === "string" && bodyMsg) return bodyMsg;
  if (typeof anyErr?.msg === "string" && anyErr.msg) return anyErr.msg;

  // 2. 业务代码主动抛出的中文 Error
  if (error instanceof Error && error.message) return error.message;

  // 3. 没有后端文案时按 HTTP 状态/超时兜底
  if (anyErr?.response?.status === 404) return "请求的资源不存在";
  if (anyErr?.response?.status === 403) return "无操作权限";
  if (anyErr?.response?.status >= 500) return "服务器异常，请稍后重试";
  if (anyErr?.code === "ECONNABORTED") return "请求超时，请重试";
  return fallback;
}
