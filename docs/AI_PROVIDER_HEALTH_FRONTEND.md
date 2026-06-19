# AI 供应商健康管理 - 前端接口文档

## 目录

- [1. 概述](#1-概述)
- [2. 通用说明](#2-通用说明)
- [3. 接口列表](#3-接口列表)
  - [3.1 供应商健康分页查询](#31-供应商健康分页查询)
  - [3.2 供应商健康详情](#32-供应商健康详情)
  - [3.3 手动探测供应商](#33-手动探测供应商)
  - [3.4 查询供应商余额](#34-查询供应商余额)
  - [3.5 启用供应商健康路由](#35-启用供应商健康路由)
  - [3.6 禁用供应商健康路由](#36-禁用供应商健康路由)
  - [3.7 检测流水分页查询](#37-检测流水分页查询)
  - [3.8 告警记录分页查询](#38-告警记录分页查询)
  - [3.9 统计概览](#39-统计概览)
  - [3.10 趋势统计](#310-趋势统计)
  - [3.11 供应商列表（下拉框）](#311-供应商列表下拉框)
  - [3.12 所有下拉选项](#312-所有下拉选项)
  - [3.13 批量启用](#313-批量启用)
  - [3.14 批量禁用](#314-批量禁用)
  - [3.15 批量查询余额](#315-批量查询余额)
  - [3.16 解决告警](#316-解决告警)
  - [3.17 批量解决告警](#317-批量解决告警)
  - [3.18 导出检测流水](#318-导出检测流水)
  - [3.19 导出告警记录](#319-导出告警记录)
- [4. 枚举值说明](#4-枚举值说明)
- [5. 页面设计建议](#5-页面设计建议)

---

## 1. 概述

AI 供应商健康管理系统用于监控各个 AI 服务提供商（如 DeepSeek、Qwen、OpenAI 等）的可用性状态，支持自动探测、故障告警、手动探测等功能。

**基础路径：** `/ai/provider-health`

---

## 2. 通用说明

### 2.1 响应格式

所有接口统一返回 `Result<T>` 格式：

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 2.2 分页参数

分页请求继承 `PageRequest`，包含以下字段：

| 参数    | 类型 | 必填 | 默认值 | 说明     |
| ------- | ---- | ---- | ------ | -------- |
| current | Long | 否   | 1      | 当前页码 |
| size    | Long | 否   | 10     | 每页条数 |

分页响应格式：

```json
{
  "records": [],
  "total": 0,
  "size": 10,
  "current": 1,
  "pages": 0
}
```

### 2.3 时间格式

所有时间字段统一格式：`yyyy-MM-dd HH:mm:ss`

---

## 3. 接口列表

### 3.1 供应商健康分页查询

**接口地址：** `POST /ai/provider-health/page`

**接口描述：** 分页查询所有 AI 供应商的健康状态

**请求参数（Body）：**

```json
{
  "current": 1,
  "size": 10,
  "provider": "deepseek", // 可选：供应商名称筛选
  "status": "UP", // 可选：状态筛选
  "reason": "OK", // 可选：故障原因筛选
  "enabled": true, // 可选：是否启用筛选
  "updatedTime": ["2026-01-01 00:00:00", "2026-12-31 23:59:59"] // 可选：更新时间范围
}
```

**响应数据（AiProviderHealthVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "records": [
      {
        "id": 1,
        "provider": "deepseek", // 供应商标识
        "status": "UP", // 健康状态：UP/WARN/DOWN/SUSPENDED
        "reason": "OK", // 故障原因
        "enabled": true, // 是否启用健康路由
        "failCount": 0, // 连续失败次数
        "successCount": 100, // 成功次数
        "lastCheckTime": "2026-06-19 10:00:00", // 最后检测时间
        "lastSuccessTime": "2026-06-19 10:00:00", // 最后成功时间
        "lastFailureTime": null, // 最后失败时间
        "lastErrorMessage": null, // 最后错误信息
        "nextCheckTime": "2026-06-19 10:05:00", // 下次检测时间
        "alertSent": false, // 是否已发送告警
        "lastAlertTime": null, // 最后告警时间
        "balanceAmount": 100.5, // 账户余额
        "balanceCurrency": "CNY", // 余额币种
        "quotaRemaining": 10000, // 剩余配额
        "createdTime": "2026-06-01 00:00:00", // 创建时间
        "updatedTime": "2026-06-19 10:00:00" // 更新时间
      }
    ],
    "total": 5,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

**余额字段来源：** `balanceAmount`、`balanceCurrency`、`quotaRemaining` 是供应商状态列表已有字段，前端页面展示余额时仍以本接口为准。后端定时心跳任务 `aiProviderHealthCheckTask` 会在余额查询开关开启且供应商凭证已配置时自动刷新这些字段。

**推荐刷新方式：** 页面初始化和普通刷新只调用本分页接口；点击“查余额”或“批量查余额”后，再重新调用本分页接口刷新表格数据。

---

### 3.2 供应商健康详情

**接口地址：** `GET /ai/provider-health/{provider}`

**接口描述：** 获取指定供应商的健康详情

**路径参数：**

| 参数     | 类型   | 必填 | 说明                                        |
| -------- | ------ | ---- | ------------------------------------------- |
| provider | String | 是   | 供应商标识，如 `deepseek`、`qwen`、`openai` |

**响应数据：** 同 3.1 的单条记录格式

**示例请求：**

```
GET /ai/provider-health/deepseek
```

---

### 3.3 手动探测供应商

**接口地址：** `POST /ai/provider-health/{provider}/probe`

**接口描述：** 手动触发对指定供应商的健康探测，立即返回探测结果

**路径参数：**

| 参数     | 类型   | 必填 | 说明       |
| -------- | ------ | ---- | ---------- |
| provider | String | 是   | 供应商标识 |

**响应数据：** 同 3.1 的单条记录格式（探测后的最新状态）

**使用场景：**

- 管理员想要立即确认某个供应商的当前状态
- 故障恢复后手动验证

---

### 3.4 查询供应商余额

**接口地址：** `POST /ai/provider-health/{provider}/balance`

**接口描述：** 手动触发指定供应商余额查询，写入当前健康状态表和检测流水表，并返回最新供应商健康状态。

**路径参数：**

| 参数     | 类型   | 必填 | 说明       |
| -------- | ------ | ---- | ---------- |
| provider | String | 是   | 供应商标识 |

**响应数据：** 同 3.1 的单条记录格式，重点刷新 `balanceAmount`、`balanceCurrency`、`quotaRemaining`。

**注意事项：**

- 本接口用于“立即触发一次余额查询并写库”，不是供应商状态列表的替代接口。
- 查询成功后建议重新调用 `POST /ai/provider-health/page`，用列表接口返回的 `balanceAmount`、`balanceCurrency`、`quotaRemaining` 展示最新余额。
- 默认已支持 DeepSeek 的余额接口。
- 通义千问/阿里云、豆包/火山引擎、混元/腾讯云需要先配置云账号 AK/SK；智谱和讯飞星火暂无通用公开余额接口。
- 如果余额接口返回账户不可用，会记录 `BALANCE_QUERY` 失败流水，并将健康状态置为 `SUSPENDED`。

---

### 3.5 启用供应商健康路由

**接口地址：** `POST /ai/provider-health/{provider}/enable`

**接口描述：** 启用指定供应商的健康路由，使其可以被自动选择

**路径参数：**

| 参数     | 类型   | 必填 | 说明       |
| -------- | ------ | ---- | ---------- |
| provider | String | 是   | 供应商标识 |

**响应数据：** 同 3.1 的单条记录格式

**注意事项：**

- 只有状态为 `DOWN` 或 `SUSPENDED` 的供应商需要手动启用
- 启用后会重置失败计数

---

### 3.6 禁用供应商健康路由

**接口地址：** `POST /ai/provider-health/{provider}/disable`

**接口描述：** 禁用指定供应商的健康路由，使其不会被自动选择

**路径参数：**

| 参数     | 类型   | 必填 | 说明       |
| -------- | ------ | ---- | ---------- |
| provider | String | 是   | 供应商标识 |

**响应数据：** 同 3.1 的单条记录格式

**使用场景：**

- 计划维护时临时禁用
- 某供应商长期不稳定，手动下线

---

### 3.7 检测流水分页查询

**接口地址：** `POST /ai/provider-health/check-record/page`

**接口描述：** 分页查询供应商检测流水记录

**请求参数（Body）：**

```json
{
  "current": 1,
  "size": 10,
  "provider": "deepseek", // 可选：供应商名称筛选
  "checkType": "ACTIVE_PROBE", // 可选：检测类型筛选
  "status": "SUCCESS", // 可选：检测结果筛选
  "reason": "OK", // 可选：故障原因筛选
  "createdTime": ["2026-01-01 00:00:00", "2026-12-31 23:59:59"] // 可选：创建时间范围
}
```

**响应数据（AiProviderCheckRecordVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "records": [
      {
        "id": 1,
        "provider": "deepseek", // 供应商标识
        "checkType": "ACTIVE_PROBE", // 检测类型
        "status": "SUCCESS", // 检测结果：SUCCESS/FAIL
        "reason": "OK", // 故障原因
        "httpStatus": 200, // HTTP 状态码
        "costTimeMs": 150, // 耗时（毫秒）
        "requestId": "req-123456", // 请求ID
        "errorMessage": null, // 错误信息
        "balanceAmount": 100.5, // 查询到的余额
        "balanceCurrency": "CNY", // 余额币种
        "quotaRemaining": 10000, // 剩余配额
        "rawPayload": "{}", // 原始响应（JSON字符串）
        "createdTime": "2026-06-19 10:00:00" // 创建时间
      }
    ],
    "total": 100,
    "size": 10,
    "current": 1,
    "pages": 10
  }
}
```

---

### 3.8 告警记录分页查询

**接口地址：** `POST /ai/provider-health/alert-record/page`

**接口描述：** 分页查询供应商告警记录

**请求参数（Body）：**

```json
{
  "current": 1,
  "size": 10,
  "provider": "deepseek", // 可选：供应商名称筛选
  "alertType": "PROVIDER_UNAVAILABLE", // 可选：告警类型筛选
  "alertLevel": "ERROR", // 可选：告警级别筛选
  "status": "OPEN", // 可选：告警状态筛选
  "createdTime": ["2026-01-01 00:00:00", "2026-12-31 23:59:59"] // 可选：创建时间范围
}
```

**响应数据（AiProviderAlertRecordVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "records": [
      {
        "id": 1,
        "provider": "deepseek", // 供应商标识
        "alertType": "PROVIDER_UNAVAILABLE", // 告警类型
        "alertLevel": "ERROR", // 告警级别
        "status": "OPEN", // 告警状态：OPEN/RESOLVED
        "title": "DeepSeek 服务不可用", // 告警标题
        "content": "连续3次探测失败，请检查...", // 告警内容
        "sentCount": 1, // 发送次数
        "firstSentTime": "2026-06-19 10:00:00", // 首次发送时间
        "lastSentTime": "2026-06-19 10:00:00", // 最后发送时间
        "resolvedTime": null, // 解决时间
        "createdTime": "2026-06-19 10:00:00", // 创建时间
        "updatedTime": "2026-06-19 10:00:00" // 更新时间
      }
    ],
    "total": 5,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

---

### 3.9 统计概览

**接口地址：** `GET /ai/provider-health/stats/overview`

**接口描述：** 获取 AI 供应商健康统计概览数据，用于首页仪表盘展示

**响应数据（AiProviderStatsOverviewVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "totalProviders": 6, // 总供应商数
    "upCount": 4, // 正常运行数
    "warnCount": 1, // 警告数
    "downCount": 1, // 不可用数
    "suspendedCount": 0, // 已暂停数
    "enabledCount": 5, // 已启用数
    "disabledCount": 1, // 已禁用数
    "todayCheckCount": 100, // 今日检测次数
    "todayFailCount": 5, // 今日失败次数
    "openAlertCount": 2 // 未解决告警数
  }
}
```

---

### 3.10 趋势统计

**接口地址：** `POST /ai/provider-health/stats/trend`

**接口描述：** 获取 AI 供应商健康趋势数据，用于图表展示

**请求参数（Body）：**

```json
{
  "provider": "deepseek", // 可选：指定供应商，不传则返回所有
  "days": 7 // 可选：天数，默认 7 天
}
```

**响应数据（AiProviderStatsTrendVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "dates": [
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19"
    ],
    "items": [
      {
        "provider": "deepseek",
        "successCounts": [10, 12, 8, 15, 11, 9, 13], // 每日成功次数
        "failCounts": [1, 0, 2, 0, 1, 0, 0], // 每日失败次数
        "avgCostTimeMs": [150, 145, 160, 140, 155, 148, 142] // 每日平均耗时
      }
    ]
  }
}
```

---

### 3.11 供应商列表（下拉框）

**接口地址：** `GET /ai/provider-health/providers`

**接口描述：** 获取所有可用的 AI 供应商列表，用于页面下拉筛选框

**响应数据：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "provider": "XING_HUO", // 供应商标识
      "status": "UP", // 当前状态
      "enabled": true // 是否启用
    },
    {
      "provider": "QIAN_WEN",
      "status": "UP",
      "enabled": true
    },
    {
      "provider": "DEEP_SEEK",
      "status": "DOWN",
      "enabled": false
    }
  ]
}
```

**使用场景：**

- 供应商状态下拉框
- 检测流水筛选框
- 告警记录筛选框
- 批量操作选择框

---

### 3.12 所有下拉选项

**接口地址：** `GET /ai/provider-health/dropdown-options`

**接口描述：** 一次性获取所有下拉框选项数据，用于页面初始化

**响应数据（AiProviderDropdownVo）：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "providers": [
      { "value": "XING_HUO", "label": "讯飞星火" },
      { "value": "QIAN_WEN", "label": "阿里千问" },
      { "value": "ZHI_PU", "label": "智谱" },
      { "value": "DEEP_SEEK", "label": "DeepSeek" },
      { "value": "DOU_BAO", "label": "字节豆包" },
      { "value": "HUN_YUAN", "label": "腾讯混元" }
    ],
    "healthStatusList": [
      { "value": "UP", "label": "正常" },
      { "value": "WARN", "label": "警告" },
      { "value": "DOWN", "label": "不可用" },
      { "value": "SUSPENDED", "label": "已暂停" }
    ],
    "failureReasonList": [
      { "value": "OK", "label": "正常" },
      { "value": "INSUFFICIENT_BALANCE", "label": "余额不足" },
      { "value": "QUOTA_EXCEEDED", "label": "配额超限" },
      { "value": "AUTH_FAILED", "label": "认证失败" },
      { "value": "RATE_LIMIT", "label": "频率限制" },
      { "value": "NETWORK_ERROR", "label": "网络错误" },
      { "value": "PROVIDER_ERROR", "label": "供应商错误" },
      { "value": "UNKNOWN_ERROR", "label": "未知错误" },
      { "value": "BALANCE_LOW", "label": "余额预警" }
    ],
    "checkTypeList": [
      { "value": "ACTIVE_PROBE", "label": "主动探测" },
      { "value": "PASSIVE_FAILURE", "label": "被动检测-失败" },
      { "value": "PASSIVE_SUCCESS", "label": "被动检测-成功" },
      { "value": "BALANCE_QUERY", "label": "余额查询" }
    ],
    "checkStatusList": [
      { "value": "SUCCESS", "label": "成功" },
      { "value": "FAIL", "label": "失败" }
    ],
    "alertTypeList": [
      { "value": "PROVIDER_UNAVAILABLE", "label": "供应商不可用" },
      { "value": "PROVIDER_RECOVERED", "label": "供应商已恢复" },
      { "value": "ALL_PROVIDERS_DOWN", "label": "所有供应商不可用" },
      { "value": "BALANCE_LOW", "label": "余额不足预警" }
    ],
    "alertLevelList": [
      { "value": "INFO", "label": "信息" },
      { "value": "WARN", "label": "警告" },
      { "value": "ERROR", "label": "错误" },
      { "value": "CRITICAL", "label": "严重" }
    ],
    "alertStatusList": [
      { "value": "OPEN", "label": "未解决" },
      { "value": "RESOLVED", "label": "已解决" }
    ]
  }
}
```

**使用场景：**

- 页面初始化时一次性加载所有下拉选项
- 避免多次请求
- 统一管理枚举显示文本

---

### 3.13 批量启用

**接口地址：** `POST /ai/provider-health/batch/enable`

**接口描述：** 批量启用多个 AI 供应商的健康路由

**请求参数（Body）：**

```json
{
  "providers": ["DEEP_SEEK", "QIAN_WEN"]
}
```

**响应数据：** 返回启用后的供应商健康状态列表

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "provider": "DEEP_SEEK",
      "status": "UP",
      "enabled": true,
      ...
    }
  ]
}
```

---

### 3.14 批量禁用

**接口地址：** `POST /ai/provider-health/batch/disable`

**接口描述：** 批量禁用多个 AI 供应商的健康路由

**请求参数（Body）：**

```json
{
  "providers": ["DEEP_SEEK", "QIAN_WEN"]
}
```

**响应数据：** 返回禁用后的供应商健康状态列表

---

### 3.15 批量查询余额

**接口地址：** `POST /ai/provider-health/batch/balance`

**接口描述：** 批量触发多个 AI 供应商余额查询，并返回刷新后的供应商健康状态列表。

**请求参数（Body）：**

```json
{
  "providers": ["DEEP_SEEK", "QIAN_WEN"]
}
```

**响应数据：** 返回查询后的供应商健康状态列表。

**注意事项：** 批量查询会跳过未配置余额接口的供应商；单个查询未配置时会返回业务错误。批量接口返回的是刷新后的状态列表，但页面仍建议统一重新调用 `POST /ai/provider-health/page`，避免分页、筛选和排序状态与当前列表不一致。

**当前可配置供应商：** DeepSeek 使用模型 API Key；通义千问/阿里云、豆包/火山引擎、混元/腾讯云使用云账号 AK/SK 签名查询；智谱和讯飞星火暂无通用公开余额接口，保留通用配置入口。

---

### 3.16 解决告警

**接口地址：** `POST /ai/provider-health/alert-record/{id}/resolve`

**接口描述：** 解决单条告警记录

**路径参数：**

| 参数 | 类型 | 必填 | 说明        |
| ---- | ---- | ---- | ----------- |
| id   | Long | 是   | 告警记录 ID |

**请求参数（Body，可选）：**

```json
{
  "resolvedReason": "余额已充值" // 可选：解决原因
}
```

**响应数据：** 返回更新后的告警记录

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "provider": "DEEP_SEEK",
    "alertType": "BALANCE_LOW",
    "status": "RESOLVED",           // 已更新为已解决
    "resolvedTime": "2026-06-19 10:30:00",
    ...
  }
}
```

---

### 3.17 批量解决告警

**接口地址：** `POST /ai/provider-health/alert-record/batch-resolve`

**接口描述：** 批量解决指定供应商的所有未解决告警

**请求参数（Body）：**

```json
{
  "providers": ["DEEP_SEEK", "QIAN_WEN"]
}
```

**响应数据：** 返回解决的告警数量

```json
{
  "code": 200,
  "message": "操作成功",
  "data": 3
}
```

---

### 3.18 导出检测流水

**接口地址：** `POST /ai/provider-health/check-record/export`

**接口描述：** 导出检测流水为 Excel 文件

**请求参数（Body）：** 同 3.6 检测流水分页查询的筛选条件

```json
{
  "provider": "deepseek",
  "checkType": "ACTIVE_PROBE",
  "status": "FAIL",
  "createdTime": ["2026-06-01 00:00:00", "2026-06-19 23:59:59"]
}
```

**响应：** 直接返回 Excel 文件流（.xlsx 格式）

**前端调用示例：**

```javascript
// 使用 axios 下载
const response = await axios.post(
  "/ai/provider-health/check-record/export",
  params,
  {
    responseType: "blob"
  }
);
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement("a");
link.href = url;
link.download = "检测流水.xlsx";
link.click();
```

---

### 3.19 导出告警记录

**接口地址：** `POST /ai/provider-health/alert-record/export`

**接口描述：** 导出告警记录为 Excel 文件

**请求参数（Body）：** 同 3.7 告警记录分页查询的筛选条件

```json
{
  "provider": "deepseek",
  "alertType": "BALANCE_LOW",
  "status": "OPEN",
  "createdTime": ["2026-06-01 00:00:00", "2026-06-19 23:59:59"]
}
```

**响应：** 直接返回 Excel 文件流（.xlsx 格式）

---

## 4. 枚举值说明

### 4.1 健康状态（AiProviderHealthStatus）

| 值        | 说明                 | 建议颜色 |
| --------- | -------------------- | -------- |
| UP        | 正常                 | 🟢 绿色  |
| WARN      | 警告（部分异常）     | 🟡 黄色  |
| DOWN      | 不可用               | 🔴 红色  |
| SUSPENDED | 已暂停（手动或自动） | ⚪ 灰色  |

### 4.2 检测类型（AiProviderCheckType）

| 值              | 说明                            |
| --------------- | ------------------------------- |
| ACTIVE_PROBE    | 主动探测（定时任务触发）        |
| PASSIVE_FAILURE | 被动检测-失败（调用失败时记录） |
| PASSIVE_SUCCESS | 被动检测-成功（调用成功时记录） |
| BALANCE_QUERY   | 余额查询                        |

### 4.3 检测结果（AiProviderCheckStatus）

| 值      | 说明 | 建议颜色 |
| ------- | ---- | -------- |
| SUCCESS | 成功 | 🟢 绿色  |
| FAIL    | 失败 | 🔴 红色  |

### 4.4 故障原因（AiProviderFailureReason）

| 值                   | 说明             | 建议颜色 |
| -------------------- | ---------------- | -------- |
| OK                   | 正常             | 🟢 绿色  |
| INSUFFICIENT_BALANCE | 余额不足         | 🔴 红色  |
| QUOTA_EXCEEDED       | 配额超限         | 🔴 红色  |
| AUTH_FAILED          | 认证失败         | 🔴 红色  |
| RATE_LIMIT           | 频率限制         | 🟡 黄色  |
| NETWORK_ERROR        | 网络错误         | 🟡 黄色  |
| PROVIDER_ERROR       | 供应商错误       | 🟡 黄色  |
| UNKNOWN_ERROR        | 未知错误         | ⚪ 灰色  |
| BALANCE_LOW          | 余额不足（预警） | 🟠 橙色  |

### 4.5 告警类型（AiProviderAlertType）

| 值                   | 说明             |
| -------------------- | ---------------- |
| PROVIDER_UNAVAILABLE | 供应商不可用     |
| PROVIDER_RECOVERED   | 供应商已恢复     |
| ALL_PROVIDERS_DOWN   | 所有供应商不可用 |
| BALANCE_LOW          | 余额不足预警     |

### 4.6 告警级别（AiProviderAlertLevel）

| 值       | 说明 | 建议颜色 |
| -------- | ---- | -------- |
| INFO     | 信息 | 🔵 蓝色  |
| WARN     | 警告 | 🟡 黄色  |
| ERROR    | 错误 | 🟠 橙色  |
| CRITICAL | 严重 | 🔴 红色  |

### 4.7 告警状态（AiProviderAlertStatus）

| 值       | 说明   | 建议颜色 |
| -------- | ------ | -------- |
| OPEN     | 未解决 | 🔴 红色  |
| RESOLVED | 已解决 | 🟢 绿色  |

---

## 5. 页面设计建议

### 5.1 页面结构

建议设计 3 个 Tab 页：

```
┌─────────────────────────────────────────────────────────────┐
│  AI 供应商健康管理                                            │
├─────────────────────────────────────────────────────────────┤
│  [供应商状态]  [检测流水]  [告警记录]                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (Tab 内容区域)                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 供应商状态页面

**顶部统计卡片：**

- 总供应商数
- 正常运行数
- 异常/停机数
- 已禁用数

**数据表格列：**

| 列名     | 字段                   | 宽度  | 说明                  |
| -------- | ---------------------- | ----- | --------------------- |
| 供应商   | provider               | 120px | 显示名称              |
| 状态     | status                 | 100px | Tag 标签，颜色区分    |
| 故障原因 | reason                 | 120px | Tag 标签              |
| 启用状态 | enabled                | 100px | Switch 开关           |
| 连续失败 | failCount              | 100px | 数字，失败>0 红色高亮 |
| 成功率   | successCount/failCount | 120px | 进度条或百分比        |
| 余额     | balanceAmount          | 120px | 显示金额和币种        |
| 剩余配额 | quotaRemaining         | 100px | 数字                  |
| 最后检测 | lastCheckTime          | 180px | 时间                  |
| 最后成功 | lastSuccessTime        | 180px | 时间                  |
| 告警状态 | alertSent              | 100px | 是否已告警            |
| 操作     | -                      | 180px | 按钮组                |

**操作按钮：**

- **探测**：调用 `/probe` 接口，显示 Loading，完成后刷新行数据
- **查余额**：调用 `/balance` 接口，刷新余额、币种、剩余配额和余额检测流水
- **启用/禁用**：调用 `/enable` 或 `/disable` 接口
- **详情**：展开详情抽屉或跳转详情页

**余额接入建议：**

- 页面列表只依赖 `POST /ai/provider-health/page` 的 `balanceAmount`、`balanceCurrency`、`quotaRemaining` 字段展示余额。
- 后端 `aiProviderHealthCheckTask` 会自动随心跳查询已配置供应商余额，前端不需要额外轮询余额接口。
- “查余额”按钮只做手动刷新：调用 `POST /ai/provider-health/{provider}/balance`，成功后重新拉取分页列表。
- “批量查余额”适合工具栏操作：调用 `POST /ai/provider-health/batch/balance`，成功后重新拉取分页列表。
- 未配置凭证时，批量查询会跳过；单个查询返回业务错误，前端直接提示即可。

### 5.3 检测流水页面

**筛选条件：**

- 供应商（下拉选择）
- 检测类型（下拉选择）
- 检测结果（下拉选择）
- 故障原因（下拉选择）
- 时间范围（日期范围选择器）

**数据表格列：**

| 列名     | 字段          | 宽度  | 说明                     |
| -------- | ------------- | ----- | ------------------------ |
| 供应商   | provider      | 120px |                          |
| 检测类型 | checkType     | 120px | Tag 标签                 |
| 结果     | status        | 100px | 成功/失败 Tag            |
| 故障原因 | reason        | 120px |                          |
| HTTP状态 | httpStatus    | 100px | 2xx 绿色，4xx/5xx 红色   |
| 耗时     | costTimeMs    | 100px | 毫秒，>1000ms 黄色高亮   |
| 余额     | balanceAmount | 120px |                          |
| 错误信息 | errorMessage  | auto  | 超长省略，hover 显示完整 |
| 检测时间 | createdTime   | 180px |                          |

### 5.4 告警记录页面

**筛选条件：**

- 供应商（下拉选择）
- 告警类型（下拉选择）
- 告警级别（下拉选择）
- 告警状态（下拉选择）
- 时间范围（日期范围选择器）

**数据表格列：**

| 列名     | 字段          | 宽度  | 说明                     |
| -------- | ------------- | ----- | ------------------------ |
| 供应商   | provider      | 120px |                          |
| 告警类型 | alertType     | 150px | Tag 标签                 |
| 告警级别 | alertLevel    | 100px | Tag 标签，颜色区分       |
| 状态     | status        | 100px | 未解决/已解决 Tag        |
| 标题     | title         | 200px |                          |
| 内容     | content       | auto  | 超长省略，hover 显示完整 |
| 发送次数 | sentCount     | 100px |                          |
| 首次告警 | firstSentTime | 180px |                          |
| 最后告警 | lastSentTime  | 180px |                          |
| 解决时间 | resolvedTime  | 180px |                          |

---

## 6. 联调注意事项

1. **接口基础路径：** 根据项目实际情况配置，通常是 `/api` 前缀
2. **认证方式：** 需要携带登录态 Token，具体看项目鉴权机制
3. **错误处理：** 统一处理 `code !== 200` 的情况
4. **Loading 状态：** 探测接口可能耗时较长，需要显示 Loading
5. **数据刷新：** 操作完成后建议刷新当前页数据
6. **时间选择器：** 建议使用 `datetime` 类型，格式 `yyyy-MM-dd HH:mm:ss`

---

_文档生成时间：2026-06-19_
