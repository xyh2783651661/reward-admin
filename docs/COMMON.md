# 通用约定

> 本文档是所有模块联调的基础，前端必须先阅读本文档。

---

## 环境配置

| 项 | 值 |
|---|---|
| 服务端口 | `86` |
| 基准路径 | 无 `context-path`，直接从根开始 |
| 示例 | `http://localhost:86/auth/login` |

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
const { code, success, data, msg } = response.data
if (!success) {
  // 处理错误，msg 包含错误信息
}
return data
```

---

## 分页结构

分页参数如下：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| current | number | 1 | 当前页 |
| size | number | 10 | 每页条数 |

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

## 时间格式

所有接口返回的 `LocalDateTime` 字段统一格式：

```
yyyyMMdd HHmmss
```

示例：`20260528 100000` 表示 2026年5月28日 10:00:00

---

## 错误码

| code | 含义 |
|------|------|
| 200~299 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 限流 |
| 500 | 系统内部错误 |

---

## 安全注解

| 注解 | 说明 | 前端配合 |
|------|------|----------|
| `@Encrypted` | HMAC-SHA256 签名 | 携带 `X-App-Id`、`X-Timestamp`、`X-Signature` |
| `@RepeatSubmit` | 防重复提交 | 短时间内不可重复提交 |
| `@RateLimit` | 限流 | 超限返回 429 |

### 签名机制

标注 `@Encrypted` 的接口需携带：

| Header | 说明 |
|--------|------|
| X-App-Id | 应用标识 |
| X-Timestamp | 毫秒时间戳（5分钟有效期） |
| X-Signature | `HMAC-SHA256(X-App-Id + X-Timestamp, secret)` 的 Base64 |

---

## 通用请求头汇总

| Header | 使用场景 | 说明 |
|--------|----------|------|
| Content-Type | 所有接口 | `application/json` 或 `multipart/form-data` |
| X-Token | 登录后接口 | 登录 Token |
| X-User-Id | 已读状态 | 用户 ID |
| X-Client-Type | 平台过滤 | web/android/ios |
| X-Client-Version | 版本过滤 | 客户端版本 |
| X-App-Id | 签名校验 | 应用标识 |
| X-Timestamp | 签名校验 | 毫秒时间戳 |
| X-Signature | 签名校验 | HMAC 签名 |

---

## 图片预览接口通用说明

项目中所有图片预览接口（缩略图、原图预览等）统一使用 `ImagePreviewService`，支持 HTTP 缓存。

### 支持的接口

| 模块 | 接口 | 说明 |
|------|------|------|
| 每日图片 | `GET /daily-images/{id}/thumbnail` | 缩略图（不存在时回退原图） |
| 每日图片 | `GET /daily-images/{id}/preview` | 原图预览 |
| 恋爱空间 | `GET /media/{id}/view` | 原始文件预览 |
| 恋爱空间 | `GET /media/{id}/thumbnail` | 缩略图（不存在时回退原图） |

### HTTP 缓存机制

所有图片预览接口均支持以下缓存策略：

| 响应头 | 值 | 说明 |
|--------|-----|------|
| `Cache-Control` | `public, max-age=604800` | 浏览器缓存 7 天 |
| `ETag` | `"{lastModified}-{size}"` | 资源唯一标识 |
| `Last-Modified` | 文件修改时间 | 时间戳验证 |
| `Content-Disposition` | `inline` | 内联显示，非下载 |

### 浏览器行为

1. **首次请求**：返回 200 + 图片数据 + 缓存头
2. **后续请求（7 天内）**：浏览器直接使用本地缓存，无网络请求
3. **缓存过期后**：浏览器发送 `If-None-Match` / `If-Modified-Since`
   - 文件未变化：返回 `304 Not Modified`（无响应体）
   - 文件已变化：返回 200 + 新图片数据

### 前端使用方式

```html
<!-- 直接使用，浏览器自动处理缓存 -->
<img src="/daily-images/1/thumbnail" alt="缩略图" />
<img src="/media/1/thumbnail" alt="缩略图" />

<!-- Vue 中动态绑定 -->
<img :src="`/daily-images/${id}/thumbnail`" />
<img :src="`/media/${id}/thumbnail`" />
```

**注意**：前端无需手动处理缓存逻辑，浏览器会自动完成。

---

## 模块文档索引

| 模块 | 文档 | 说明 |
|------|------|------|
| 认证 | [AUTH.md](AUTH.md) | 登录/登出/用户信息 |
| 奖励 | [REWARD.md](REWARD.md) | 奖励计算、用户、科目、配置、零花钱规则 |
| 恋爱空间 | [LOVE.md](LOVE.md) | 记录、纪念日、媒体、统计、同步 |
| Android | [ANDROID.md](ANDROID.md) | Android 客户端专属接口 |
| 框架扩展 | [FRAMEWORK.md](FRAMEWORK.md) | 工作台、通知中心 |
| 系统配置 | [SYSTEM.md](SYSTEM.md) | 配置增删改查 |
| AI | [AI.md](AI.md) | AI 调用记录 |
| 日志 | [LOG.md](LOG.md) | 访问日志、任务日志 |
| 公告 | [NOTICE.md](NOTICE.md) | 公告管理、用户已读 |
| 邮件 | [MAIL.md](MAIL.md) | 接收人、发送记录 |
| 每日图片 | [DAILY_IMAGE.md](DAILY_IMAGE.md) | 图片管理 — 列表、详情、下载、缩略图、备注 |
