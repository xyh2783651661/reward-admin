import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 供应商健康 ====================

/** 供应商健康分页查询 */
export const getProviderHealthPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/ai/provider-health/page",
    {
      data
    }
  );
};

/** 供应商健康详情 */
export const getProviderHealthDetail = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "get",
    `/api/ai/provider-health/${provider}`
  );
};

/** 手动探测供应商 */
export const probeProvider = <T = Record<string, any>>(provider: string) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/ai/provider-health/${provider}/probe`
  );
};

/** 启用供应商健康路由 */
export const enableProvider = <T = Record<string, any>>(provider: string) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/ai/provider-health/${provider}/enable`
  );
};

/** 禁用供应商健康路由 */
export const disableProvider = <T = Record<string, any>>(provider: string) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/ai/provider-health/${provider}/disable`
  );
};

/** 批量启用 */
export const batchEnableProviders = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/ai/provider-health/batch/enable",
    {
      data: { providers }
    }
  );
};

/** 批量禁用 */
export const batchDisableProviders = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/ai/provider-health/batch/disable",
    {
      data: { providers }
    }
  );
};

// ==================== 检测流水 ====================

/** 检测流水分页查询 */
export const getCheckRecordPage = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/ai/provider-health/check-record/page",
    {
      data
    }
  );
};

/** 导出检测流水 */
export const exportCheckRecord = (data?: object) => {
  return http.request("post", "/api/ai/provider-health/check-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 告警记录 ====================

/** 告警记录分页查询 */
export const getAlertRecordPage = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/ai/provider-health/alert-record/page",
    {
      data
    }
  );
};

/** 解决告警 */
export const resolveAlert = <T = Record<string, any>>(
  id: number,
  resolvedReason?: string
) => {
  return http.request<ApiResult<T>>(
    `post`,
    `/api/ai/provider-health/alert-record/${id}/resolve`,
    {
      data: { resolvedReason }
    }
  );
};

/** 批量解决告警 */
export const batchResolveAlerts = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/ai/provider-health/alert-record/batch-resolve",
    {
      data: { providers }
    }
  );
};

/** 导出告警记录 */
export const exportAlertRecord = (data?: object) => {
  return http.request("post", "/api/ai/provider-health/alert-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 统计与下拉 ====================

/** 统计概览 */
export const getStatsOverview = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>(
    "get",
    "/api/ai/provider-health/stats/overview"
  );
};

/** 趋势统计 */
export const getStatsTrend = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/ai/provider-health/stats/trend",
    {
      data
    }
  );
};

/** 供应商列表（下拉框） */
export const getProviderList = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>("get", "/api/ai/provider-health/providers");
};

/** 所有下拉选项 */
export const getDropdownOptions = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>(
    "get",
    "/api/ai/provider-health/dropdown-options"
  );
};
