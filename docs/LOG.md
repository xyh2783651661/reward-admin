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

| 字段        | 类型     | 说明                                          |
| ----------- | -------- | --------------------------------------------- |
| module      | string   | 模块名（模糊匹配）                            |
| method      | string   | HTTP 方法（模糊匹配）                         |
| uri         | string   | 请求 URI（模糊匹配）                          |
| ipLocation  | string   | IP 归属地（模糊匹配）                         |
| browserType | string   | 浏览器类型（精确匹配）                        |
| description | string   | 操作描述（模糊匹配）                          |
| success     | string   | 是否成功（"true"/"false"）                    |
| requestTime | string[] | 时间范围，格式 `["2026-05-01", "2026-05-15"]` |

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
    "ipLocations": ["广东省广州市", "北京市朝阳区"],
    "browserTypes": ["Chrome", "Firefox", "Safari", "Edge"]
  }
}
```

---

### GET /access-logs/{id} — 日志详情

---

### GET /access-logs-detail/{id} — 日志完整详情

返回完整请求/响应体、异常堆栈。

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
