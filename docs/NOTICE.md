# 公告模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## 公告管理

### POST /notice/sysNotice/page — 公告分页

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "filterNoticeType": 1,
  "keyword": "更新"
}
```

| 字段             | 类型   | 说明         |
| ---------------- | ------ | ------------ |
| filterNoticeType | number | 公告类型过滤 |
| keyword          | string | 关键词搜索   |

---

### GET /notice/sysNotice/{id} — 公告详情

---

### POST /notice/sysNotice — 新增公告

**请求体：**

```json
{
  "title": "系统升级通知",
  "content": "系统将于今晚进行升级维护",
  "noticeType": 1,
  "priority": 5,
  "platformMask": 1,
  "minVersion": "1.0.0",
  "publishTime": "2026-05-27 10:00:00",
  "offlineTime": "2026-06-01 00:00:00",
  "operator": "admin"
}
```

| 字段         | 类型   | 说明                                |
| ------------ | ------ | ----------------------------------- |
| title        | string | 公告标题                            |
| content      | string | 公告内容                            |
| noticeType   | number | 类型：1=功能更新, 2=系统公告        |
| priority     | number | 优先级：4=信息/5=普通/7=警告/9=紧急 |
| platformMask | number | 平台位掩码：1=Web, 2=Android, 4=iOS |
| minVersion   | string | 最低可见版本                        |
| publishTime  | string | 发布时间                            |
| offlineTime  | string | 下线时间                            |
| operator     | string | 操作人                              |

---

### PUT /notice/sysNotice — 修改公告

请求体同新增。

---

### DELETE /notice/sysNotice/{id} — 删除公告

---

### POST /notice/sysNotice/{id}/publish — 发布公告

| 参数     | 位置  | 说明           |
| -------- | ----- | -------------- |
| operator | Query | 操作人（可选） |

---

### POST /notice/sysNotice/{id}/withdraw — 撤回公告

| 参数     | 位置  | 说明           |
| -------- | ----- | -------------- |
| operator | Query | 操作人（可选） |

---

## 用户已读

> 以下接口需携带 `X-User-Id` 请求头

### POST /notice/userNoticeRead/{noticeId}/mark — 标记单个已读

---

### POST /notice/userNoticeRead/batch-mark — 批量标记已读

**请求体：** `[1, 2, 3]`（公告 ID 列表，可选）

---

### POST /notice/userNoticeRead/mark-all — 一键全部已读

无请求体，返回标记数量。

**响应：**

```json
{
  "code": 200,
  "data": 5
}
```

---

### GET /notice/userNoticeRead/unread-count — 获取未读数

支持 `X-Client-Type` 和 `X-Client-Version` 按平台/版本过滤。
