# 缓存管理

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含缓存管理接口和缓存监控接口，用于查看系统缓存使用情况和维护缓存。

---

## 接口概览

### 缓存管理

| 场景            | 方法   | 路径                  |
| --------------- | ------ | --------------------- |
| 获取缓存概览    | GET    | `/system/cache/info`  |
| 分页获取 key    | GET    | `/system/cache/keys`  |
| 获取指定 key 值 | GET    | `/system/cache/{key}` |
| 删除指定 key    | DELETE | `/system/cache/{key}` |
| 清空所有缓存    | DELETE | `/system/cache`       |

### 缓存监控

| 场景           | 方法 | 路径                          |
| -------------- | ---- | ----------------------------- |
| 实时统计       | GET  | `/system/cache/stats`         |
| 趋势图数据     | GET  | `/system/cache/stats/history` |
| 健康状态       | GET  | `/system/cache/health`        |
| 热点 key 排行  | GET  | `/system/cache/top`           |
| 大 key 分析    | GET  | `/system/cache/bigkeys`       |
| 操作日志       | GET  | `/system/cache/logs`          |
| Redis 运行信息 | GET  | `/system/cache/redis/info`    |

---

## 1. 缓存管理接口

### 1.1 GET /system/cache/info — 获取缓存概览

**响应：**

```json
{
  "code": 200,
  "data": {
    "cacheType": "local",
    "size": 42
  }
}
```

| 字段      | 说明                                    |
| --------- | --------------------------------------- |
| cacheType | 缓存类型：`local`（Caffeine）或 `redis` |
| size      | 当前缓存条目数                          |

---

### 1.2 GET /system/cache/keys — 分页获取缓存 key

**请求参数：**

| 参数    | 类型   | 默认 | 说明                        |
| ------- | ------ | ---- | --------------------------- |
| current | number | 1    | 当前页                      |
| size    | number | 20   | 每页数量                    |
| pattern | string | \*   | key 匹配模式，如 `system:*` |

**示例：**

```
GET /system/cache/keys?current=1&size=10&pattern=system:*
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "key": "system:config:options",
        "ttl": 3600,
        "type": "string",
        "size": 1024
      }
    ],
    "total": 42,
    "current": 1,
    "size": 10
  }
}
```

| 字段           | 说明                                        |
| -------------- | ------------------------------------------- |
| records[].key  | 缓存 key                                    |
| records[].ttl  | 剩余过期时间（秒），-1 表示永不过期         |
| records[].type | 数据类型：string / hash / list / set / zset |
| records[].size | 占用内存大小（字节）                        |

---

### 1.3 GET /system/cache/{key} — 获取指定 key 的值

**响应：**

```json
{
  "code": 200,
  "data": {
    "valueTypes": [...],
    "statusOptions": [...]
  }
}
```

失败响应：

```json
{
  "code": 404,
  "msg": "缓存不存在或已过期",
  "data": null
}
```

---

### 1.4 DELETE /system/cache/{key} — 删除指定 key

**响应：**

```json
{
  "code": 200,
  "msg": "删除成功"
}
```

---

### 1.5 DELETE /system/cache — 清空所有缓存

**响应：**

```json
{
  "code": 200,
  "msg": "清空成功"
}
```

> 危险操作，请谨慎使用。清空后所有缓存失效，需要重新加载。

---

## 2. 缓存监控接口

### 2.1 GET /system/cache/stats — 实时统计

获取缓存整体运行状态，用于页面顶部统计卡片、实时监控、健康分析。

**响应：**

```json
{
  "code": 200,
  "data": {
    "cacheType": "local",
    "keyCount": 1245,
    "requestCount": 102344,
    "hitCount": 100122,
    "missCount": 2222,
    "hitRate": 97.83,
    "evictionCount": 334,
    "loadSuccessCount": 9988,
    "loadFailureCount": 12,
    "avgLoadTimeMs": 11.2,
    "usedMemory": null,
    "maxMemory": null,
    "memoryUsageRate": null,
    "uptimeInSeconds": 86400
  }
}
```

| 字段             | 说明                             |
| ---------------- | -------------------------------- |
| cacheType        | 缓存类型：`local` / `redis`      |
| keyCount         | 当前 key 数量                    |
| requestCount     | 总请求次数                       |
| hitCount         | 命中次数                         |
| missCount        | 未命中次数                       |
| hitRate          | 命中率（百分比）                 |
| evictionCount    | 淘汰次数                         |
| loadSuccessCount | 加载成功次数                     |
| loadFailureCount | 加载失败次数                     |
| avgLoadTimeMs    | 平均加载耗时（毫秒）             |
| usedMemory       | 内存使用（字节），Redis 专用     |
| maxMemory        | 最大内存（字节），Redis 专用     |
| memoryUsageRate  | 内存使用率（百分比），Redis 专用 |
| uptimeInSeconds  | 运行时间（秒）                   |

**前端展示建议：**

适合概览卡片、仪表盘，例如：

| 指标         | 值    |
| ------------ | ----- |
| 命中率       | 97.8% |
| 当前缓存数   | 1245  |
| 淘汰次数     | 334   |
| 平均加载耗时 | 11ms  |

---

### 2.2 GET /system/cache/stats/history — 趋势图数据

获取缓存历史趋势数据，用于折线图、趋势分析、观察雪崩、观察命中率变化。

**请求参数：**

| 参数     | 类型   | 默认 | 说明                               |
| -------- | ------ | ---- | ---------------------------------- |
| type     | string | -    | 数据类型：hitRate / size / request |
| duration | string | 1h   | 时间范围：1h / 6h / 24h            |

**示例：**

```
GET /system/cache/stats/history?type=hitRate&duration=1h
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "points": [
      {
        "time": "10:00",
        "hitRate": 98.1,
        "size": 1200,
        "requestCount": 5000,
        "usedMemory": 0
      },
      {
        "time": "10:01",
        "hitRate": 98.3,
        "size": 1215,
        "requestCount": 5200,
        "usedMemory": 0
      }
    ]
  }
}
```

| 字段                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| points[].time         | 时间点（每分钟采集一次，最多保留 60 个点） |
| points[].hitRate      | 命中率                                     |
| points[].size         | key 数量                                   |
| points[].requestCount | 请求次数                                   |
| points[].usedMemory   | 内存使用（字节），Redis 专用               |

**前端展示建议：**

适合 echarts 折线图、实时趋势。

---

### 2.3 GET /system/cache/health — 健康状态

检查缓存是否正常，用于页面健康状态、运维告警、Redis 连接检测。

**响应：**

```json
{
  "code": 200,
  "data": {
    "status": "UP",
    "cacheType": "local",
    "available": true,
    "message": "本地缓存正常运行"
  }
}
```

异常响应：

```json
{
  "code": 200,
  "data": {
    "status": "DOWN",
    "cacheType": "redis",
    "available": false,
    "message": "Redis 连接失败: connection timeout"
  }
}
```

| 字段      | 说明                             |
| --------- | -------------------------------- |
| status    | 状态：`UP` / `DOWN` / `DEGRADED` |
| cacheType | 缓存类型                         |
| available | 是否可用                         |
| message   | 描述信息                         |

**前端展示建议：**

适合红绿灯状态、顶部告警栏。

---

### 2.4 GET /system/cache/top — 热点 key 排行

获取最热门缓存 key，用于排查热点、排查缓存穿透、分析高频缓存。

**请求参数：**

| 参数  | 类型   | 默认 | 说明     |
| ----- | ------ | ---- | -------- |
| limit | number | 10   | 返回数量 |

**示例：**

```
GET /system/cache/top?limit=5
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "keys": [
      { "key": "system:config:options", "accessCount": 150, "hitCount": 148 },
      { "key": "auth:token:abc123", "accessCount": 80, "hitCount": 75 }
    ]
  }
}
```

| 字段               | 说明     |
| ------------------ | -------- |
| keys[].key         | 缓存 key |
| keys[].accessCount | 访问次数 |
| keys[].hitCount    | 命中次数 |

**前端展示建议：**

适合 TOP 排行榜、热点分析。

---

### 2.5 GET /system/cache/bigkeys — 大 key 分析

获取占用内存最大的 key，用于排查内存问题、Redis 优化、避免 OOM。

**请求参数：**

| 参数  | 类型   | 默认 | 说明     |
| ----- | ------ | ---- | -------- |
| limit | number | 10   | 返回数量 |

**示例：**

```
GET /system/cache/bigkeys?limit=5
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "keys": [
      {
        "key": "chat:history:1001",
        "size": 12582912,
        "sizeHuman": "12.0MB",
        "type": "list"
      }
    ]
  }
}
```

| 字段             | 说明             |
| ---------------- | ---------------- |
| keys[].key       | 缓存 key         |
| keys[].size      | 占用内存（字节） |
| keys[].sizeHuman | 可读的大小描述   |
| keys[].type      | 数据类型         |

> 注意：本地缓存（Caffeine）不支持精确的内存大小计算，返回空列表。

**前端展示建议：**

适合大 key 告警、内存排行。

---

### 2.6 GET /system/cache/logs — 操作日志

查看缓存操作记录，用于审计日志、运维追踪。

**请求参数：**

| 参数  | 类型   | 默认 | 说明     |
| ----- | ------ | ---- | -------- |
| limit | number | 20   | 返回数量 |

**示例：**

```
GET /system/cache/logs?limit=10
```

**响应：**

```json
{
  "code": 200,
  "data": {
    "logs": [
      {
        "operator": "admin",
        "action": "DELETE",
        "key": "system:user:1",
        "time": "2026-05-27 12:00:00",
        "description": "删除缓存"
      }
    ]
  }
}
```

| 字段               | 说明                           |
| ------------------ | ------------------------------ |
| logs[].operator    | 操作人                         |
| logs[].action      | 操作类型：DELETE / CLEAR / PUT |
| logs[].key         | 操作的 key                     |
| logs[].time        | 操作时间                       |
| logs[].description | 操作描述                       |

**前端展示建议：**

适合审计日志表格、运维追踪。

---

### 2.7 GET /system/cache/redis/info — Redis 运行信息

获取 Redis 服务器详细信息，用于 Redis 状态页。

**响应：**

```json
{
  "code": 200,
  "data": {
    "version": "7.0.0",
    "usedMemory": 33554432,
    "usedMemoryHuman": "32.0MB",
    "maxMemory": 134217728,
    "connectedClients": 12,
    "opsPerSec": 2300,
    "expiredKeys": 1233,
    "evictedKeys": 22,
    "uptimeInSeconds": 86400,
    "keyspaceHits": 100122,
    "keyspaceMisses": 2222
  }
}
```

| 字段             | 说明               |
| ---------------- | ------------------ |
| version          | Redis 版本         |
| usedMemory       | 已用内存（字节）   |
| usedMemoryHuman  | 可读的内存使用描述 |
| maxMemory        | 最大内存（字节）   |
| connectedClients | 连接客户端数       |
| opsPerSec        | 每秒操作数         |
| expiredKeys      | 已过期 key 数量    |
| evictedKeys      | 被淘汰 key 数量    |
| uptimeInSeconds  | 运行时间（秒）     |
| keyspaceHits     | 命中次数           |
| keyspaceMisses   | 未命中次数         |

> 注意：非 Redis 环境调用会返回 500 错误。

---

## 3. TypeScript 类型参考

```ts
// ========== 请求类型 ==========

export interface CacheKeyReq {
  current?: number;
  size?: number;
  pattern?: string;
}

// ========== 响应类型 ==========

export interface CacheInfo {
  cacheType: "local" | "redis";
  size: number;
}

export interface CacheKeyPageVo {
  records: {
    key: string;
    ttl: number;
    type: string;
    size: number;
  }[];
  total: number;
  current: number;
  size: number;
}

export interface CacheStatsVo {
  cacheType: "local" | "redis";
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

export interface CacheStatsHistoryVo {
  points: {
    time: string;
    hitRate: number;
    size: number;
    requestCount: number;
    usedMemory: number;
  }[];
}

export interface CacheHealthVo {
  status: "UP" | "DOWN" | "DEGRADED";
  cacheType: "local" | "redis";
  available: boolean;
  message: string;
}

export interface CacheTopKeyVo {
  keys: { key: string; accessCount: number; hitCount: number }[];
}

export interface CacheBigKeyVo {
  keys: { key: string; size: number; sizeHuman: string; type: string }[];
}

export interface CacheOperationLogVo {
  logs: {
    operator: string;
    action: string;
    key: string;
    time: string;
    description: string;
  }[];
}

export interface RedisInfoVo {
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
```

---

## 4. 推荐前端 API 封装

```ts
import request from "@/utils/request";
import type {
  CacheInfo,
  CacheKeyReq,
  CacheKeyPageVo,
  CacheStatsVo,
  CacheStatsHistoryVo,
  CacheHealthVo,
  CacheTopKeyVo,
  CacheBigKeyVo,
  CacheOperationLogVo,
  RedisInfoVo
} from "@/types/cache";

export const cacheApi = {
  // 缓存管理
  info: () => request.get<CacheInfo>("/system/cache/info"),

  keys: (params: CacheKeyReq) =>
    request.get<CacheKeyPageVo>("/system/cache/keys", { params }),

  getValue: (key: string) =>
    request.get(`/system/cache/${encodeURIComponent(key)}`),

  remove: (key: string) =>
    request.delete(`/system/cache/${encodeURIComponent(key)}`),

  clear: () => request.delete("/system/cache"),

  // 缓存监控
  stats: () => request.get<CacheStatsVo>("/system/cache/stats"),

  statsHistory: (params?: { type?: string; duration?: string }) =>
    request.get<CacheStatsHistoryVo>("/system/cache/stats/history", { params }),

  health: () => request.get<CacheHealthVo>("/system/cache/health"),

  topKeys: (limit?: number) =>
    request.get<CacheTopKeyVo>("/system/cache/top", { params: { limit } }),

  bigKeys: (limit?: number) =>
    request.get<CacheBigKeyVo>("/system/cache/bigkeys", { params: { limit } }),

  logs: (limit?: number) =>
    request.get<CacheOperationLogVo>("/system/cache/logs", {
      params: { limit }
    }),

  redisInfo: () => request.get<RedisInfoVo>("/system/cache/redis/info")
};
```

---

## 5. 联调注意事项

1. 缓存类型由配置决定：`cache.type=local` 使用 Caffeine，`cache.type=redis` 使用 Redis
2. 本地缓存（Caffeine）不支持：大 key 分析、Redis 运行信息
3. 趋势图数据每分钟采集一次，最多保留 60 个点（1 小时）
4. 操作日志为内存存储，重启后清空
5. 热点 key 统计需要在业务代码中调用 `recordAccess` 方法记录访问
6. 清空缓存是危险操作，前端建议添加二次确认
