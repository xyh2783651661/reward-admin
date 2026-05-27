import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 缓存管理 ====================

/** 获取缓存概览 */
export const getCacheInfo = () => {
  return http.request<ApiResult<{ cacheType: string; size: number }>>(
    "get",
    "/api/system/cache/info"
  );
};

/** 分页获取缓存 key */
export const getCacheKeys = (params?: {
  current?: number;
  size?: number;
  pattern?: string;
}) => {
  return http.request<
    ApiPageResult<{ key: string; ttl: number; type: string; size: number }>
  >("get", "/api/system/cache/keys", { params });
};

/** 获取指定 key 的值 */
export const getCacheValue = (key: string) => {
  return http.request<ApiResult<any>>(
    "get",
    `/api/system/cache/${encodeURIComponent(key)}`
  );
};

/** 删除指定 key */
export const deleteCacheKey = (key: string) => {
  return http.request<ApiResult>(
    "delete",
    `/api/system/cache/${encodeURIComponent(key)}`
  );
};

/** 清空所有缓存 */
export const clearAllCache = () => {
  return http.request<ApiResult>("delete", "/api/system/cache");
};

// ==================== 缓存监控 ====================

/** 实时统计 */
export const getCacheStats = () => {
  return http.request<
    ApiResult<{
      cacheType: string;
      keyCount: number;
      requestCount: number;
      hitCount: number;
      missCount: number;
      hitRate: number;
      evictionCount: number | null;
      loadSuccessCount: number | null;
      loadFailureCount: number | null;
      avgLoadTimeMs: number | null;
      usedMemory: number | null;
      maxMemory: number | null;
      memoryUsageRate: number | null;
      uptimeInSeconds: number;
    }>
  >("get", "/api/system/cache/stats");
};

/** 趋势图数据 */
export const getCacheStatsHistory = (params?: {
  type?: string;
  duration?: string;
}) => {
  return http.request<
    ApiResult<{
      points: {
        time: string;
        hitRate: number;
        size: number;
        requestCount: number;
        usedMemory: number;
      }[];
    }>
  >("get", "/api/system/cache/stats/history", { params });
};

/** 健康状态 */
export const getCacheHealth = () => {
  return http.request<
    ApiResult<{
      status: string;
      cacheType: string;
      available: boolean;
      message: string;
    }>
  >("get", "/api/system/cache/health");
};

/** 热点 key 排行 */
export const getCacheTopKeys = (limit?: number) => {
  return http.request<
    ApiResult<{
      keys: { key: string; accessCount: number; hitCount: number }[];
    }>
  >("get", "/api/system/cache/top", { params: { limit } });
};

/** 大 key 分析 */
export const getCacheBigKeys = (limit?: number) => {
  return http.request<
    ApiResult<{
      keys: { key: string; size: number; sizeHuman: string; type: string }[];
    }>
  >("get", "/api/system/cache/bigkeys", { params: { limit } });
};

/** 操作日志 */
export const getCacheLogs = (limit?: number) => {
  return http.request<
    ApiResult<{
      logs: {
        operator: string;
        action: string;
        key: string;
        time: string;
        description: string;
      }[];
    }>
  >("get", "/api/system/cache/logs", { params: { limit } });
};

/** Redis 运行信息 */
export const getRedisInfo = () => {
  return http.request<
    ApiResult<{
      version: string;
      usedMemory: number;
      usedMemoryHuman: string;
      maxMemory: number | null;
      connectedClients: number;
      opsPerSec: number;
      expiredKeys: number;
      evictedKeys: number;
      uptimeInSeconds: number;
      keyspaceHits: number;
      keyspaceMisses: number;
    }>
  >("get", "/api/system/cache/redis/info");
};
