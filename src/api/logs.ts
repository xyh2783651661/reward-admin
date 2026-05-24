import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

export const getOnlineLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/online-logs", { data });
};

export const getLoginLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/login-logs", { data });
};

export const getOperationLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/task-logs/page", { data });
};

export const getSystemLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/access-logs/page", { data });
};

export const getSystemLogsDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/access-logs-detail/${id}`
  );
};

export const exportAccessLogsList = (data?: object) => {
  return http.request<Blob>("post", "/api/access-logs/export-excel", {
    data,
    responseType: "blob"
  });
};
