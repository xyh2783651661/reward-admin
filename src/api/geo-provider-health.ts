import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 地理来源健康 ====================

/** 地理来源健康分页查询 */
export const getGeoProviderHealthPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/geo-providers/health/page",
    { data }
  );
};

/** 地理来源健康详情 */
export const getGeoProviderHealthDetail = <T = Record<string, any>>(
  poolName: string,
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "get",
    `/api/geo-providers/health/${poolName}/${provider}`
  );
};

/** 手动探测 */
export const probeGeoProvider = <T = Record<string, any>>(
  poolName: string,
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/geo-providers/${poolName}/${provider}/probe`
  );
};

/** 启用 */
export const enableGeoProvider = <T = Record<string, any>>(
  poolName: string,
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/geo-providers/${poolName}/${provider}/enable`
  );
};

/** 禁用 */
export const disableGeoProvider = <T = Record<string, any>>(
  poolName: string,
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/geo-providers/${poolName}/${provider}/disable`
  );
};

/** 重置熔断 */
export const resetGeoProviderCircuit = <T = Record<string, any>>(
  poolName: string,
  provider: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/geo-providers/${poolName}/${provider}/reset`
  );
};

/** 更新路由参数 */
export const updateGeoProviderRouting = <T = Record<string, any>>(
  poolName: string,
  provider: string,
  data: { enabled?: boolean; priority?: number; weight?: number }
) => {
  return http.request<ApiResult<T>>(
    "put",
    `/api/geo-providers/${poolName}/${provider}/routing`,
    { data }
  );
};

/** 批量启用 */
export const batchEnableGeoProviders = <T = Record<string, any>>(
  items: Array<{ poolName: string; provider: string }>
) => {
  return http.request<ApiResult<T>>("post", "/api/geo-providers/batch/enable", {
    data: { items }
  });
};

/** 批量禁用 */
export const batchDisableGeoProviders = <T = Record<string, any>>(
  items: Array<{ poolName: string; provider: string }>
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/geo-providers/batch/disable",
    { data: { items } }
  );
};

/** 批量重置熔断 */
export const batchResetGeoProviders = <T = Record<string, any>>(
  items: Array<{ poolName: string; provider: string }>
) => {
  return http.request<ApiResult<T>>("post", "/api/geo-providers/batch/reset", {
    data: { items }
  });
};

// ==================== 检测流水 ====================

export const getGeoProviderCheckRecordPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/geo-providers/check-record/page",
    { data }
  );
};

export const exportGeoProviderCheckRecord = (data?: object) => {
  return http.request("post", "/api/geo-providers/check-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 告警 ====================

export const getGeoProviderAlertRecordPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/geo-providers/alert-record/page",
    { data }
  );
};

export const resolveGeoProviderAlert = <T = Record<string, any>>(
  id: number,
  resolvedReason?: string
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/geo-providers/alert-record/${id}/resolve`,
    { data: { resolvedReason } }
  );
};

export const batchResolveGeoProviderAlerts = <T = Record<string, any>>(
  items: Array<{ poolName: string; provider: string }>
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/geo-providers/alert-record/batch-resolve",
    { data: { items } }
  );
};

export const exportGeoProviderAlertRecord = (data?: object) => {
  return http.request("post", "/api/geo-providers/alert-record/export", {
    data,
    responseType: "blob"
  });
};

// ==================== 统计 / 下拉 ====================

export const getGeoProviderStatsOverview = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>("get", "/api/geo-providers/stats/overview");
};

export const getGeoProviderStatsTrend = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiResult<T>>("post", "/api/geo-providers/stats/trend", {
    data
  });
};

export const getGeoProviderList = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>("get", "/api/geo-providers/providers");
};

export const getGeoProviderDropdownOptions = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>(
    "get",
    "/api/geo-providers/dropdown-options"
  );
};
