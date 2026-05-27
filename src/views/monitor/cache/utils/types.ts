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
