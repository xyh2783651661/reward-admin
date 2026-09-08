/**
 * 统一从各种异常形态中提取可展示给用户的错误文案。
 * 支持：Error 实例 / 后端 { code, msg } / axios 响应体 / HTTP 状态码 / 超时。
 */
export function getErrorMessage(error: unknown, fallback = "操作失败"): string {
  if (error instanceof Error && error.message) return error.message;
  const anyErr = error as any;
  if (typeof anyErr?.msg === "string" && anyErr.msg) return anyErr.msg;
  if (anyErr?.response?.data?.msg) return anyErr.response.data.msg;
  if (anyErr?.response?.status === 404) return "请求的资源不存在";
  if (anyErr?.response?.status >= 500) return "服务器异常，请稍后重试";
  if (anyErr?.code === "ECONNABORTED") return "请求超时，请重试";
  return fallback;
}
