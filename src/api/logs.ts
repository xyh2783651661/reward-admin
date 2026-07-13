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

/** 任务日志详情 */
export interface TaskLogBatchItem {
  id?: string | number | null;
  reason?: string;
  note?: string;
  [key: string]: any;
}

export interface TaskLogStep {
  stepName: string;
  success: boolean;
  errorMessage?: string;
  costMs?: number;
  /** 操作类型标签（QUERY / PROCESS / NOTIFY / AI 等） */
  action?: string;
  /** 批处理总数（可空） */
  total?: number;
  successCount?: number;
  failedCount?: number;
  skippedCount?: number;
  /** 该步骤自由指标（不含 failures/skips，后端已拆出） */
  metadata?: Record<string, any>;
  /** 批处理失败明细（前 20 条） */
  failures?: TaskLogBatchItem[];
  /** 批处理跳过明细（前 20 条） */
  skips?: TaskLogBatchItem[];
}

export interface TaskLogException {
  type: string;
  message: string;
  stackTrace: string;
}

export interface TaskLogDetail {
  id: number;
  taskName: string;
  description?: string;
  success: boolean;
  timeCost?: number;
  startTime?: string;
  endTime?: string;
  classMethod?: string;
  createdTime?: string;
  steps: TaskLogStep[];
  exception?: TaskLogException;
}

export interface TaskLogStatsItem {
  taskName: string;
  totalCount: number;
  successCount: number;
  successRate: number;
  avgTimeCost: number;
  lastTimeCost?: number;
  lastSuccess?: string;
  lastCreatedTime?: string;
}

export interface TaskLogTrendPoint {
  date: string;
  total: number;
  success: number;
  failure: number;
  avgTimeCost: number;
}

export interface TaskLogStats {
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgTimeCost: number;
  maxTimeCost: number;
  taskStats: TaskLogStatsItem[];
  trend: TaskLogTrendPoint[];
}

/** 获取单条任务日志详情 */
export const getTaskLogDetail = (id: number | string) => {
  return http.request<ApiResult<TaskLogDetail>>("get", `/api/task-logs/${id}`);
};

/** 获取任务统计概览 */
export const getTaskLogStats = () => {
  return http.request<ApiResult<TaskLogStats>>("get", "/api/task-logs/stats");
};
