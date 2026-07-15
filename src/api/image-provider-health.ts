import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 图片来源健康 ====================

/** 图片来源健康分页查询 */
export const getImageProviderHealthPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/image-providers/health/page",
    { data }
  );
};

/** 图片来源健康详情 */
export const getImageProviderHealthDetail = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "get",
    `/api/image-providers/health/${provider}`
  );
};

/** 手动探测图片来源 */
export const probeImageProvider = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/image-providers/${provider}/probe`
  );
};

/** 启用图片来源路由 */
export const enableImageProvider = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/image-providers/${provider}/enable`
  );
};

/** 禁用图片来源路由 */
export const disableImageProvider = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/image-providers/${provider}/disable`
  );
};

/** 重置图片来源熔断 */
export const resetImageProviderCircuit = <T = Record<string, any>>(
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/image-providers/${provider}/reset`
  );
};

/** 更新图片来源路由参数（enabled / priority / weight） */
export const updateImageProviderRouting = <T = Record<string, any>>(
  provider: string,
  data: { enabled?: boolean; priority?: number; weight?: number }
) => {
  return http.request<ApiResult<T>>(
    "put",
    `/api/image-providers/${provider}/routing`,
    { data }
  );
};

/** 批量启用 */
export const batchEnableImageProviders = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/image-providers/batch/enable",
    { data: { providers } }
  );
};

/** 批量禁用 */
export const batchDisableImageProviders = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/image-providers/batch/disable",
    { data: { providers } }
  );
};

/** 批量重置熔断 */
export const batchResetImageProviders = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/image-providers/batch/reset",
    { data: { providers } }
  );
};

// ==================== 检测流水 ====================

/** 检测流水分页查询 */
export const getImageProviderCheckRecordPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/image-providers/check-record/page",
    { data }
  );
};

/** 导出检测流水 */
export const exportImageProviderCheckRecord = (data?: object) => {
  return http.request("post", "/api/image-providers/check-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 告警记录 ====================

/** 告警记录分页查询 */
export const getImageProviderAlertRecordPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/image-providers/alert-record/page",
    { data }
  );
};

/** 解决告警 */
export const resolveImageProviderAlert = <T = Record<string, any>>(
  id: number,
  resolvedReason?: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/image-providers/alert-record/${id}/resolve`,
    { data: { resolvedReason } }
  );
};

/** 批量解决告警（按 provider 维度） */
export const batchResolveImageProviderAlerts = <T = Record<string, any>>(
  providers: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/image-providers/alert-record/batch-resolve",
    { data: { providers } }
  );
};

/** 导出告警记录 */
export const exportImageProviderAlertRecord = (data?: object) => {
  return http.request("post", "/api/image-providers/alert-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 统计 / 下拉 ====================

/** 统计概览 */
export const getImageProviderStatsOverview = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>(
    "get",
    "/api/image-providers/stats/overview"
  );
};

/** 趋势统计 */
export const getImageProviderStatsTrend = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/image-providers/stats/trend",
    { data }
  );
};

/** 供应商列表（下拉框，含状态和启用位） */
export const getImageProviderList = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>("get", "/api/image-providers/providers");
};

/** 所有下拉选项 */
export const getImageProviderDropdownOptions = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>(
    "get",
    "/api/image-providers/dropdown-options"
  );
};
