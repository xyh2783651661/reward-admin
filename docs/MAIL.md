# 邮件模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## 邮件接收人

### POST /mail-recipients/page — 接收人分页

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "name": "张三",
  "email": "test@example.com",
  "type": "TO",
  "groupCode": "report",
  "enabled": true,
  "requestTime": ["2026-05-01", "2026-05-15"]
}
```

| 字段        | 类型     | 说明                |
| ----------- | -------- | ------------------- |
| name        | string   | 姓名（模糊匹配）    |
| email       | string   | 邮箱（模糊匹配）    |
| type        | string   | 类型：TO / CC / BCC |
| groupCode   | string   | 分组编码            |
| enabled     | boolean  | 是否启用            |
| requestTime | string[] | 时间范围            |

---

### POST /mail-recipients/add — 添加接收人

**请求体：**

```json
{
  "name": "张三",
  "email": "test@example.com",
  "type": "TO",
  "groupCode": "report",
  "priority": 1,
  "enabled": true,
  "remark": "测试用户"
}
```

| 字段      | 类型    | 必填 | 说明                  |
| --------- | ------- | ---- | --------------------- |
| name      | string  | 是   | 姓名                  |
| email     | string  | 是   | 邮箱地址              |
| type      | string  | 否   | 类型：TO / CC / BCC   |
| groupCode | string  | 否   | 分组编码              |
| priority  | number  | 否   | 优先级                |
| enabled   | boolean | 否   | 是否启用（默认 true） |
| remark    | string  | 否   | 备注                  |

---

### POST /mail-recipients/update — 更新接收人

请求体同添加，需包含 `id` 字段。

---

### DELETE /mail-recipients/{id} — 删除接收人

---

## 邮件用户配置

### POST /mail-recipient-users/list — 获取配置列表

**请求体：**

```json
{
  "mailId": 1,
  "userId": 100,
  "receiveType": "TO"
}
```

| 字段        | 类型   | 说明                 |
| ----------- | ------ | -------------------- |
| mailId      | number | 邮件 ID（精确匹配）  |
| userId      | number | 用户 ID（模糊匹配）  |
| receiveType | string | 接收类型（模糊匹配） |

---

### POST /mail-recipient-users/update — 更新配置

**请求体：**

```json
{
  "mailId": 1,
  "userIds": [100, 101, 102],
  "receiveType": "TO",
  "remark": "月报接收人"
}
```

| 字段        | 类型     | 必填 | 说明         |
| ----------- | -------- | ---- | ------------ |
| mailId      | number   | 是   | 邮件 ID      |
| userIds     | number[] | 是   | 用户 ID 列表 |
| receiveType | string   | 否   | 接收类型     |
| remark      | string   | 否   | 备注         |

> 更新逻辑：先逻辑删除该邮件下所有用户，再按 userIds 恢复/新增。

---

## 发送记录

### POST /mail-send-records/page — 发送记录分页

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "status": 1,
  "subject": "月报",
  "type": "report",
  "recipient": "test@example.com",
  "requestTime": ["2026-05-01", "2026-05-15"]
}
```

| 字段        | 类型     | 说明                 |
| ----------- | -------- | -------------------- |
| status      | number   | 发送状态（精确匹配） |
| subject     | string   | 主题（模糊匹配）     |
| type        | string   | 类型（精确匹配）     |
| recipient   | string   | 收件人（模糊匹配）   |
| requestTime | string[] | 时间范围             |
