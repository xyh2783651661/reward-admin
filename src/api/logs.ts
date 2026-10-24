import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

export const getOnlineLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/online-logs", { data });
};

export const getOperationLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/task-logs/page", { data });
};

/** 导出任务日志（筛选条件与列表一致） */
export const exportOperationLogs = (data?: object) => {
  return http.request<Blob>("post", "/api/task-logs/export-excel", {
    data,
    responseType: "blob"
  });
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

/**
 * 获取任务日志选项。
 *
 * <p>后端目前仍只返回 successOptions（成功/失败二选一）；statusOptions /
 * triggerTypeOptions 为前向兼容字段，后端补齐后前端可直接使用。</p>
 */
export const getTaskLogOptions = () => {
  return http.request<
    ApiResult<{
      successOptions?: { value: boolean; label: string }[];
      statusOptions?: { value: TaskLogStatus; label: string }[];
      triggerTypeOptions?: { value: TaskLogTriggerType; label: string }[];
    }>
  >("get", "/api/task-logs/options");
};

/** 获取访问日志选项（成功/失败等） */
export const getAccessLogOptions = () => {
  return http.request<
    ApiResult<{ successOptions: { value: string; label: string }[] }>
  >("get", "/api/access-logs/options");
};

/** 定时任务执行状态，与后端 TaskStatus 对齐 */
export type TaskLogStatus =
  | "WAITING"
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL_SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "SKIPPED"
  | "LOCKED"
  | "CANCELLED";

/** 触发来源，与后端 TriggerType 对齐 */
export type TaskLogTriggerType = "SCHEDULE" | "MANUAL" | "RETRY" | "SYSTEM";

/** 任务日志分页查询条件（POST /api/task-logs/page） */
export interface TaskLogPageReq {
  taskName?: string;
  classMethod?: string;
  /** 兼容旧接口的布尔筛选；新页面优先使用 status */
  success?: boolean;
  /** 执行状态筛选 */
  status?: TaskLogStatus | "";
  /** 触发来源筛选 */
  triggerType?: TaskLogTriggerType | "";
  /** [开始时间, 结束时间] */
  timeRange?: string[];
  current?: number;
  size?: number;
}

/**
 * 任务日志列表行（后端 lite map，不解析 detail / exception 大字段）。
 *
 * <p>状态以 {@link TaskLogStatus} 为准；{@code success} 仅作为历史数据的兜底字段，
 * 不要再拿它判断「成功/失败」——部分成功在 success 上就是 false。</p>
 */
export interface TaskLogListItem {
  id: number;
  taskName: string;
  /** 任务定义编码（稳定身份） */
  taskCode?: string | null;
  /** 本次执行唯一 ID */
  executionId?: string | null;
  description?: string | null;
  /** 执行状态（新状态机） */
  status: TaskLogStatus;
  /** 触发来源 */
  triggerType?: TaskLogTriggerType | null;
  /** 兼容旧看板：仅 SUCCESS 为 true */
  success: boolean;
  timeCost?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  classMethod?: string | null;
  createdTime?: string | null;
  // 执行环境
  serverHost?: string | null;
  serverIp?: string | null;
  applicationName?: string | null;
  environment?: string | null;
  // 业务计数
  totalCount?: number | null;
  successCount?: number | null;
  failedCount?: number | null;
  skippedCount?: number | null;
  // 步骤统计
  stepCount?: number | null;
  failedStepCount?: number | null;
  slowestStep?: string | null;
  slowestStepTime?: number | null;
  // 锁 / 超时概览
  lockEnabled?: boolean | null;
  lockAcquired?: boolean | null;
  timeout?: boolean | null;
  /** 是否记录了步骤明细 */
  hasSteps?: boolean;
  /** 是否记录了异常信息 */
  hasException?: boolean;
}

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
  type?: string | null;
  message?: string | null;
  stackTrace?: string | null;
}

/**
 * 任务日志详情（GET /api/task-logs/{id}）。
 *
 * <p>在列表字段基础上补齐执行环境、配置快照、参数（已脱敏）、结果摘要、
 * 结构化异常、超时与分布式锁信息。</p>
 */
export interface TaskLogDetail extends TaskLogListItem {
  threadName?: string | null;
  threadId?: number | null;
  /** 任务配置快照 JSON */
  configSnapshot?: string | null;
  /** 任务参数快照 JSON（已脱敏） */
  paramJson?: string | null;
  /** 业务结果摘要 JSON */
  resultSummary?: string | null;
  // 结构化异常（新列，后端已优先用它们组装 exception）
  exceptionClass?: string | null;
  exceptionMessage?: string | null;
  exceptionStackTrace?: string | null;
  timeoutMinutes?: number | null;
  lockKey?: string | null;
  lockAcquireTime?: string | null;
  lockReleaseTime?: string | null;
  parentExecutionId?: string | null;
  retryCount?: number | null;
  steps: TaskLogStep[];
  /** 兼容旧看板的结构化异常（type/message/stackTrace） */
  exception?: TaskLogException | null;
}

/**
 * 任务统计概览（GET /task-logs/stats，近 7 天）。
 *
 * <p>后端已按新状态机拆分：failureCount 只含 FAILED + TIMEOUT，
 * PARTIAL_SUCCESS 单列，SKIPPED/LOCKED/CANCELLED 归入未执行。</p>
 */
export interface TaskLogStatsItem {
  taskName: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  partialSuccessCount: number;
  successRate: number;
  avgTimeCost: number;
  lastTimeCost?: number;
  lastSuccess?: string;
  lastStatus?: TaskLogStatus;
  lastStatusLabel?: string;
  lastCreatedTime?: string;
}

export interface TaskLogTrendPoint {
  date: string;
  total: number;
  success: number;
  failure: number;
  partialSuccess: number;
  timeout: number;
  skipped: number;
  locked: number;
  cancelled: number;
  running: number;
  waiting: number;
  avgTimeCost: number;
}

export interface TaskLogStats {
  totalCount: number;
  /** 干净成功 */
  successCount: number;
  /** FAILED + TIMEOUT */
  failureCount: number;
  partialSuccessCount: number;
  timeoutCount: number;
  skippedCount: number;
  lockedCount: number;
  cancelledCount: number;
  runningCount: number;
  waitingCount: number;
  /** 真正执行过的次数（不含等待 / 跳过 / 未获锁 / 取消） */
  executedCount: number;
  /** 干净成功率 = successCount / totalCount */
  successRate: number;
  /** 执行成功率 = successCount / executedCount */
  executedSuccessRate: number;
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
