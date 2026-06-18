# 通用约定

本文档记录所有模块共用的联调规则。单个模块的字段、路径和示例以对应模块文档为准。

## 环境

| 项           | 说明                             |
| ------------ | -------------------------------- |
| 默认开发端口 | `86`                             |
| Docker 端口  | `86`                             |
| 生产配置端口 | `8888`                           |
| Context Path | 无，接口直接从根路径开始         |
| 开发示例     | `http://localhost:86/auth/login` |

如果前端 dev server 将 `/api` 代理到后端，前端代码里可以使用 `/api` 前缀；后端 Controller 本身不包含 `/api` 前缀。

## 统一响应

接口默认返回 `Result<T>`：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {}
}
```

| 字段      | 类型    | 说明                           |
| --------- | ------- | ------------------------------ |
| `code`    | number  | 业务状态码，`200~299` 表示成功 |
| `msg`     | string  | 提示信息                       |
| `success` | boolean | 由 `code` 自动推导             |
| `data`    | any     | 返回数据                       |

前端响应拦截器建议统一判断 `success` 或 `code`：

```ts
const { code, success, data, msg } = response.data;
if (!success) {
  throw new Error(msg || `Request failed: ${code}`);
}
return data;
```

## 分页

通用分页请求继承 `PageRequest`：

| 参数      | 类型   | 默认 | 说明     |
| --------- | ------ | ---- | -------- |
| `current` | number | `1`  | 当前页   |
| `size`    | number | `10` | 每页条数 |

常见分页响应来自 MyBatis Plus `IPage`：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "records": [],
    "total": 0,
    "size": 10,
    "current": 1,
    "pages": 0
  }
}
```

## 时间

项目默认时区为 `Asia/Shanghai`。

`LocalDateTime` 的 JSON 序列化格式由 `JacksonConfig` 和 `DateUtil.DATETIME_PATTERN` 控制：

```text
yyyy-MM-dd HH:mm:ss
```

示例：

```text
2026-05-28 10:00:00
```

部分查询条件支持兼容解析，常见支持格式包括 `yyyy-MM-dd HH:mm:ss`、`yyyy/MM/dd HH:mm:ss`、`yyyy-MM-dd HH:mm`、ISO 本地时间等。具体字段仍以接口 DTO 为准。

## 错误码

| code      | 含义         |
| --------- | ------------ |
| `200~299` | 成功         |
| `400`     | 请求参数错误 |
| `401`     | 未授权       |
| `403`     | 禁止访问     |
| `404`     | 资源不存在   |
| `429`     | 限流         |
| `500`     | 系统内部错误 |

全局异常由 `GlobalExceptionHandler` 统一包装为 `Result<Void>`。

## 请求头

| Header             | 使用场景             | 说明                                        |
| ------------------ | -------------------- | ------------------------------------------- |
| `Content-Type`     | 所有接口             | `application/json` 或 `multipart/form-data` |
| `X-Token`          | 登录后接口           | 登录 Token                                  |
| `X-User-Id`        | 公告已读等用户态接口 | 用户 ID                                     |
| `X-Client-Type`    | 客户端区分           | `web`、`android`、`ios`                     |
| `X-Client-Version` | 客户端区分           | 客户端版本                                  |
| `X-App-Id`         | 签名接口             | 应用标识                                    |
| `X-Timestamp`      | 签名接口             | 毫秒时间戳                                  |
| `X-Signature`      | 签名接口             | HMAC 签名                                   |

## 安全注解

| 注解            | 说明                      | 前端配合                     |
| --------------- | ------------------------- | ---------------------------- |
| `@Encrypted`    | 请求/响应加解密或签名校验 | 携带签名相关请求头           |
| `@RepeatSubmit` | 防重复提交                | 短时间内不要重复提交相同操作 |
| `@RateLimit`    | 限流                      | 超限返回 `429`               |
| `@AccessLog`    | 访问日志采集              | 无需额外处理                 |
| `@TaskGuard`    | 定时任务执行保护          | 无需前端处理                 |

### 签名头

标注签名校验的接口需携带：

| Header        | 说明                                                    |
| ------------- | ------------------------------------------------------- |
| `X-App-Id`    | 应用标识                                                |
| `X-Timestamp` | 毫秒时间戳，默认 5 分钟有效期                           |
| `X-Signature` | `HMAC-SHA256(X-App-Id + X-Timestamp, secret)` 的 Base64 |

## 图片预览

项目中图片预览接口统一走 `ImagePreviewService`，支持 HTTP 缓存。

| 模块     | 接口                               | 说明                     |
| -------- | ---------------------------------- | ------------------------ |
| 每日图片 | `GET /daily-images/{id}/thumbnail` | 缩略图，不存在时回退原图 |
| 每日图片 | `GET /daily-images/{id}/preview`   | 原图预览                 |
| 恋爱空间 | `GET /media/{id}/view`             | 原始文件预览             |
| 恋爱空间 | `GET /media/{id}/thumbnail`        | 缩略图，不存在时回退原图 |

图片预览响应通常包含：

| 响应头                | 说明                     |
| --------------------- | ------------------------ |
| `Cache-Control`       | 浏览器缓存策略           |
| `ETag`                | 资源唯一标识             |
| `Last-Modified`       | 文件最后修改时间         |
| `Content-Disposition` | `inline`，浏览器内联显示 |

前端直接使用图片 URL 即可：

```html
<img src="/daily-images/1/thumbnail" alt="缩略图" />
<img src="/media/1/thumbnail" alt="缩略图" />
```

## 文档索引

完整文档入口见 [README.md](README.md)。
