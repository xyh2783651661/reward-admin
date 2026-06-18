# 日志模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## 访问日志

### POST /access-logs/page — 日志分页

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "module": "系统管理",
  "method": "GET",
  "uri": "/auth/login",
  "ipLocation": "广东省广州市",
  "browserType": "Chrome",
  "description": "用户登录",
  "success": "true",
  "requestTime": ["2026-05-01", "2026-05-15"]
}
```

| 字段         | 类型     | 说明                                          |
| ------------ | -------- | --------------------------------------------- |
| traceId      | string   | 链路追踪 ID（模糊匹配）                       |
| module       | string   | 模块名（模糊匹配）                            |
| method       | string   | HTTP 方法（模糊匹配）                         |
| uri          | string   | 请求 URI（模糊匹配）                          |
| ipLocation   | string   | IP 归属地（模糊匹配）                         |
| browserType  | string   | 浏览器类型（精确匹配）                        |
| description  | string   | 操作描述（模糊匹配）                          |
| success      | string   | 是否成功（"true"/"false"）                    |
| action       | string   | 操作类型（精确匹配）                          |
| resourceType | string   | 资源类型（精确匹配）                          |
| resourceId   | string   | 资源 ID（精确匹配）                           |
| bizType      | string   | 业务类型（精确匹配）                          |
| bizId        | string   | 业务 ID（精确匹配）                           |
| operatorId   | string   | 操作人 ID（精确匹配）                         |
| operatorName | string   | 操作人姓名（模糊匹配）                        |
| requestTime  | string[] | 时间范围，格式 `["2026-05-01", "2026-05-15"]` |

---

### GET /access-logs/list — 日志列表

返回最近 1000 条记录。

---

### GET /access-logs/filter-options — 获取筛选选项

**响应：**

```json
{
  "code": 200,
  "data": {
    "modules": ["系统管理", "用户模块"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "actions": ["创建", "修改", "删除", "查询"],
    "resourceTypes": ["用户", "角色", "配置"],
    "bizTypes": ["登录", "注册", "订单"],
    "operatorNames": ["张三", "李四"],
    "ipLocations": ["广东省广州市", "北京市朝阳区"],
    "browserTypes": ["Chrome", "Firefox", "Safari", "Edge"]
  }
}
```

---

### GET /access-logs/{id} — 日志详情

**响应：**

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "traceId": "abc123",
    "module": "系统管理",
    "action": "登录",
    "resourceType": "用户",
    "resourceId": "1001",
    "bizType": "认证",
    "bizId": "login_001",
    "operatorId": "1",
    "operatorName": "张三",
    "method": "POST",
    "uri": "/auth/login",
    "ip": "192.168.1.100",
    "ipLocation": "广东省广州市",
    "osType": "Windows 10",
    "browserType": "Chrome",
    "success": true,
    "timeCost": 150,
    "createdTime": "2026-05-28 10:00:00"
  }
}
```

---

### GET /access-logs-detail/{id} — 日志完整详情

返回完整请求/响应体、异常堆栈。

**响应：**

```json
{
  "code": 200,
  "data": {
    "ip": "192.168.1.100",
    "ipLocation": "广东省广州市",
    "success": true,
    "osType": "Windows 10",
    "browserType": "Chrome",
    "module": "系统管理",
    "action": "登录",
    "resourceType": "用户",
    "resourceId": "1001",
    "bizType": "认证",
    "bizId": "login_001",
    "operatorId": "1",
    "operatorName": "张三",
    "createdTime": "2026-05-28 10:00:00",
    "method": "POST",
    "timeCost": 150,
    "uri": "/auth/login",
    "traceId": "abc123",
    "requestHeaders": {},
    "requestBody": {},
    "responseHeaders": {},
    "responseBody": {},
    "exceptionType": null,
    "exceptionMessage": null,
    "exceptionStackTrace": null
  }
}
```

| 字段                | 类型    | 说明         |
| ------------------- | ------- | ------------ |
| ip                  | string  | 客户端 IP    |
| ipLocation          | string  | IP 归属地    |
| success             | boolean | 是否成功     |
| osType              | string  | 操作系统类型 |
| browserType         | string  | 浏览器类型   |
| module              | string  | 模块名       |
| action              | string  | 操作类型     |
| resourceType        | string  | 资源类型     |
| resourceId          | string  | 资源 ID      |
| bizType             | string  | 业务类型     |
| bizId               | string  | 业务 ID      |
| operatorId          | string  | 操作人 ID    |
| operatorName        | string  | 操作人姓名   |
| createdTime         | string  | 创建时间     |
| method              | string  | HTTP 方法    |
| timeCost            | long    | 耗时（毫秒） |
| uri                 | string  | 请求 URI     |
| traceId             | string  | 链路追踪 ID  |
| requestHeaders      | object  | 请求头       |
| requestBody         | object  | 请求体       |
| responseHeaders     | object  | 响应头       |
| responseBody        | object  | 响应体       |
| exceptionType       | string  | 异常类型     |
| exceptionMessage    | string  | 异常消息     |
| exceptionStackTrace | string  | 异常堆栈     |

---

### DELETE /access-logs/{id} — 删除单条

---

### DELETE /access-logs — 批量删除

**请求体：**

```json
{
  "ids": ["1", "2", "3"]
}
```

---

### POST /access-logs/export-excel — 导出 Excel

请求体同分页查询，导出全部匹配数据。

---

## 链路追踪

### GET /traces/{traceId} — 获取链路详情

根据 traceId 查询完整的调用链路，包括访问日志和 AI 调用记录。

**路径参数：**

| 参数    | 类型   | 说明        |
| ------- | ------ | ----------- |
| traceId | string | 链路追踪 ID |

**响应：**

```json
{
  "code": 200,
  "data": {
    "traceId": "abc123",
    "accessLogs": [
      {
        "id": 1,
        "traceId": "abc123",
        "module": "系统管理",
        "method": "POST",
        "uri": "/auth/login",
        "ip": "192.168.1.100",
        "ipLocation": "广东省广州市",
        "success": true,
        "timeCost": 150,
        "createdTime": "2026-05-28 10:00:00"
      }
    ],
    "aiCallRecords": [
      {
        "id": 1,
        "traceId": "abc123",
        "model": "gpt-4",
        "prompt": "你好",
        "response": "你好！有什么可以帮助你的吗？",
        "tokens": 150,
        "timeCost": 2000,
        "createdTime": "2026-05-28 10:00:01"
      }
    ]
  }
}
```

| 字段          | 类型   | 说明            |
| ------------- | ------ | --------------- |
| traceId       | string | 链路追踪 ID     |
| accessLogs    | array  | 访问日志列表    |
| aiCallRecords | array  | AI 调用记录列表 |

## 任务日志

### POST /task-logs/page — 日志分页

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "taskName": "数据同步任务",
  "classMethod": "com.xxx.service.SyncService.execute",
  "success": "true",
  "requestTime": ["2026-05-01", "2026-05-15"]
}
```

| 字段        | 类型     | 说明                       |
| ----------- | -------- | -------------------------- |
| taskName    | string   | 任务名称（模糊匹配）       |
| classMethod | string   | 类方法（精确匹配）         |
| success     | string   | 是否成功（"true"/"false"） |
| requestTime | string[] | 时间范围                   |

**响应字段：**

| 字段        | 类型    | 说明                                  |
| ----------- | ------- | ------------------------------------- |
| id          | string  | 日志 ID                               |
| taskName    | string  | 任务名称                              |
| description | string  | 任务描述                              |
| success     | boolean | 执行是否成功                          |
| exception   | string  | 异常信息                              |
| detail      | string  | 执行详情（JSON 格式，记录各步骤状态） |
| timeCost    | long    | 耗时（毫秒）                          |
| startTime   | string  | 开始时间                              |
| endTime     | string  | 结束时间                              |
| classMethod | string  | 调用的类方法                          |

**detail 字段结构：**

`detail` 字段存储 JSON 数组，记录任务各步骤的执行状态：

```json
[
  {
    "stepName": "上传图片",
    "success": true,
    "errorMessage": null,
    "costMs": 1200
  },
  {
    "stepName": "发送通知",
    "success": false,
    "errorMessage": "网络超时",
    "costMs": 5000
  }
]
```

| 字段         | 类型    | 说明                      |
| ------------ | ------- | ------------------------- |
| stepName     | string  | 步骤名称                  |
| success      | boolean | 步骤是否成功              |
| errorMessage | string  | 错误信息（成功时为 null） |
| costMs       | long    | 步骤耗时（毫秒）          |

**使用方式：**

在定时任务方法中使用 `TaskContext.executeStep` 包裹关键步骤，自动记录执行详情：

```java
@TaskGuard(name = "数据同步任务")
public void syncData() {
    TaskContext.executeStep("拉取数据", () -> {
        // 业务逻辑
        return result;
    });

    TaskContext.executeStep("保存数据", () -> {
        // 业务逻辑
        return result;
    });
}
```

---

### GET /task-logs/filter-options — 获取筛选选项

**响应：**

```json
{
  "code": 200,
  "data": {
    "taskNames": ["数据同步任务", "报表生成", "定时清理"],
    "classMethods": ["com.xxx.service.SyncService.execute"]
  }
}
```
