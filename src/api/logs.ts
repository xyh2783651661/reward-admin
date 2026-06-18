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

export const getAccessLogsList = (params?: object) => {
  return http.request<ApiResult<Record<string, any>[]>>(
    "get",
    "/api/access-logs/list",
    { params }
  );
};

export const getAccessLogDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/access-logs/${id}`
  );
};

export const getSystemLogsDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/access-logs-detail/${id}`
  );
};

/** 获取访问日志筛选选项 */
export const getAccessLogsFilterOptions = () => {
  return http.request<
    ApiResult<{
      modules: string[];
      methods: string[];
      actions: string[];
      resourceTypes: string[];
      bizTypes: string[];
      operatorNames: string[];
      ipLocations: string[];
      browserTypes: string[];
    }>
  >("get", "/api/access-logs/filter-options");
};

/** 删除单条访问日志 */
export const deleteAccessLog = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/access-logs/${id}`);
};

/** 批量删除访问日志 */
export const batchDeleteAccessLogs = (ids: Array<string | number>) => {
  return http.request<ApiResult>("delete", "/api/access-logs", {
    data: { ids }
  });
};

export const exportAccessLogsList = (data?: object) => {
  return http.request<Blob>("post", "/api/access-logs/export-excel", {
    data,
    responseType: "blob"
  });
};

/** 获取链路追踪详情 */
export const getTraceDetail = (traceId: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/traces/${traceId}`
  );
};

/** 获取任务日志筛选选项 */
export const getTaskLogsFilterOptions = () => {
  return http.request<
    ApiResult<{
      taskNames: string[];
      classMethods: string[];
    }>
  >("get", "/api/task-logs/filter-options");
};
