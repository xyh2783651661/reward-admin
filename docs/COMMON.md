# 通用约定

> 本文档是所有模块联调的基础，前端必须先阅读本文档。

---

## 环境配置

| 项       | 值                               |
| -------- | -------------------------------- |
| 服务端口 | `86`                             |
| 基准路径 | 无 `context-path`，直接从根开始  |
| 示例     | `http://localhost:86/auth/login` |

如果前端 dev server 配置了 `/api` 代理到后端，则调用路径加 `/api` 前缀：

```
http://localhost:86/api/auth/login
```

---

## 统一响应结构

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {}
}
```

前端响应拦截器建议：

```ts
const { code, success, data, msg } = response.data;
if (!success) {
  // 处理错误，msg 包含错误信息
}
return data;
```

---

## 分页结构

分页参数如下：

| 参数    | 类型   | 默认 | 说明     |
| ------- | ------ | ---- | -------- |
| current | number | 1    | 当前页   |
| size    | number | 10   | 每页条数 |

以上参数用于分页查询。

---

**响应结构：**

```json
{
  "code": 200,
  "data": {
    "records": [],
    "total": 0,
    "size": 10,
    "current": 1,
    "pages": 0
  }
}
```

---

## 错误码

| code    | 含义         |
| ------- | ------------ |
| 200~299 | 成功         |
| 400     | 请求参数错误 |
| 401     | 未授权       |
| 403     | 禁止访问     |
| 404     | 资源不存在   |
| 429     | 限流         |
| 500     | 系统内部错误 |

---

## 安全注解

| 注解            | 说明             | 前端配合                                      |
| --------------- | ---------------- | --------------------------------------------- |
| `@Encrypted`    | HMAC-SHA256 签名 | 携带 `X-App-Id`、`X-Timestamp`、`X-Signature` |
| `@RepeatSubmit` | 防重复提交       | 短时间内不可重复提交                          |
| `@RateLimit`    | 限流             | 超限返回 429                                  |

### 签名机制

标注 `@Encrypted` 的接口需携带：

| Header      | 说明                                                    |
| ----------- | ------------------------------------------------------- |
| X-App-Id    | 应用标识                                                |
| X-Timestamp | 毫秒时间戳（5分钟有效期）                               |
| X-Signature | `HMAC-SHA256(X-App-Id + X-Timestamp, secret)` 的 Base64 |

---

## 通用请求头汇总

| Header           | 使用场景   | 说明                                        |
| ---------------- | ---------- | ------------------------------------------- |
| Content-Type     | 所有接口   | `application/json` 或 `multipart/form-data` |
| X-Token          | 登录后接口 | 登录 Token                                  |
| X-User-Id        | 已读状态   | 用户 ID                                     |
| X-Client-Type    | 平台过滤   | web/android/ios                             |
| X-Client-Version | 版本过滤   | 客户端版本                                  |
| X-App-Id         | 签名校验   | 应用标识                                    |
| X-Timestamp      | 签名校验   | 毫秒时间戳                                  |
| X-Signature      | 签名校验   | HMAC 签名                                   |

---

## 模块文档索引

| 模块     | 文档                         | 说明                                   |
| -------- | ---------------------------- | -------------------------------------- |
| 认证     | [AUTH.md](AUTH.md)           | 登录/登出/用户信息                     |
| 奖励     | [REWARD.md](REWARD.md)       | 奖励计算、用户、科目、配置、零花钱规则 |
| 恋爱空间 | [LOVE.md](LOVE.md)           | 记录、纪念日、媒体、统计、同步         |
| Android  | [ANDROID.md](ANDROID.md)     | Android 客户端专属接口                 |
| 框架扩展 | [FRAMEWORK.md](FRAMEWORK.md) | 工作台、通知中心                       |
| 系统配置 | [SYSTEM.md](SYSTEM.md)       | 配置增删改查                           |
| AI       | [AI.md](AI.md)               | AI 调用记录                            |
| 日志     | [LOG.md](LOG.md)             | 访问日志、任务日志                     |
| 公告     | [NOTICE.md](NOTICE.md)       | 公告管理、用户已读                     |
| 邮件     | [MAIL.md](MAIL.md)           | 接收人、发送记录                       |
