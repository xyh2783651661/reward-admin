export interface CacheKeyItem {
  key: string;
  ttl: number;
  type: string;
  size: number;
}

export interface CacheStats {
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
}

export interface CacheHealth {
  status: string;
  cacheType: string;
  available: boolean;
  message: string;
}

export interface CacheTopKey {
  key: string;
  accessCount: number;
  hitCount: number;
}

export interface CacheBigKey {
  key: string;
  size: number;
  sizeHuman: string;
  type: string;
}

export interface CacheOperationLog {
  operator: string;
  action: string;
  key: string;
  time: string;
  description: string;
}

export interface CacheRedisInfo {
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
}

export interface CacheMetricItem {
  label: string;
  value: string | number;
  icon: string;
  gradient: string;
  description: string;
  sub?: string;
  color?: string;
  highlight?: boolean;
}

export type CacheInsightType = "success" | "warning" | "danger" | "info";

export interface CacheInsight {
  title: string;
  description: string;
  type: CacheInsightType;
  icon: string;
}
