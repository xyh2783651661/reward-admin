# 认证模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## POST /auth/login — 登录

**请求体：**

```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

| 字段     | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| phone    | string | 是   | 手机号 |
| password | string | 是   | 密码   |

**响应：**

```json
{
  "code": 200,
  "data": {
    "userId": 1,
    "token": "a1b2c3d4e5f6...",
    "nickName": "小明",
    "avatar": "https://...",
    "phone": "138****0000",
    "birthday": "2010-05-20",
    "status": 1
  }
}
```

> 登录成功后，后续接口须携带 `X-Token` 请求头。Token 有效期 24 小时。

---

## POST /auth/logout — 登出

需携带 `X-Token`。

---

## GET /auth/me — 获取当前用户信息

需携带 `X-Token`。响应同登录（不含 token）。

---

## POST /auth/change-password — 修改密码

**请求体：**

```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

| 字段        | 类型   | 必填 | 说明   |
| ----------- | ------ | ---- | ------ |
| oldPassword | string | 是   | 旧密码 |
| newPassword | string | 是   | 新密码 |
