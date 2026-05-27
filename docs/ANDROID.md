# Android 客户端

> 通用约定见 [COMMON.md](COMMON.md)

本文档描述 Android 客户端与 Web 端共用后端时的接口约定。

**目标：**

1. Android 和 Web 共用同一套业务数据
2. 后端可以明确区分请求来源，并按需补齐 Android 专属接口

## 客户端区分规则

### Web

```text
X-App-Id: LOVE_RECORD_WEB
X-Device-Type: PC | TABLET | MOBILE
```

### 1.2 Android

```text
X-App-Id: LOVE_RECORD_ANDROID
X-Device-Type: MOBILE | TABLET
X-Client-Type: ANDROID
X-Client-Version: 1.0
```

说明：

- 后端优先可通过 `X-App-Id` 区分 Web / Android。
- `X-Client-Type`、`X-Client-Version` 是 Android 额外补充头，建议后端记录但不强依赖。
- 如果将来接 iOS，可继续复用该模式：`LOVE_RECORD_IOS` + `X-Client-Type: IOS`。

## 2. 公共请求头

Android 与 Web 一样，所有 JSON / Query / Multipart 请求都带以下 Header：

```text
X-App-Id: LOVE_RECORD_ANDROID
X-Timestamp: 1713513600000
X-Signature: Base64(HmacSHA256(appId + timestamp, SECRET_KEY))
X-Device-Type: MOBILE | TABLET
X-User-Id: old-system-user-id
X-Client-Type: ANDROID
X-Client-Version: 1.0
```

注意：

- 业务身份不要再从 `deviceId` 取。
- `deviceId/androidId` 可以继续做设备诊断，但不要作为业务用户主键。
- 公共鉴权字段统一只放 Header，不放 Query / Body / FormData。

## 3. 通用响应

继续沿用网页端同一套 `Result<T>`：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {}
}
```

## 4. 公共数据结构

### 4.1 Location

```json
{
  "name": "杭州 西湖",
  "address": "浙江省杭州市西湖区",
  "latitude": 30.243087,
  "longitude": 120.150892,
  "source": "map"
}
```

### 4.2 Media

```json
{
  "id": "1",
  "type": "photo",
  "url": "/media/1/view",
  "thumbnailUrl": "/media/1/thumbnail",
  "mobileUrl": "/media/1/thumbnail",
  "previewUrl": "/media/1/thumbnail",
  "fileName": "rain-walk.jpg",
  "mimeType": "image/jpeg",
  "size": 245760,
  "width": 1200,
  "height": 800,
  "duration": null,
  "createdAt": "2026-04-19T10:30:00+08:00"
}
```

Android 渲染优先级：

```text
mobileUrl > previewUrl > thumbnailUrl > url
```

后端注意：

- 最好返回可直接访问的 HTTP 路径或相对路径，例如 `/media/{id}/view`
- 不要只返回磁盘绝对路径，例如 `D:/upload/xxx.jpg`

### 4.3 Record

```json
{
  "id": "1",
  "recordDate": "2026-04-19",
  "text": "今天一起去看了电影。",
  "mood": "heart",
  "location": {
    "name": "杭州 西湖",
    "address": "浙江省杭州市西湖区",
    "latitude": 30.243087,
    "longitude": 120.150892,
    "source": "map"
  },
  "media": [],
  "createdAt": "2026-04-19T10:30:00+08:00",
  "updatedAt": "2026-04-19T10:30:00+08:00",
  "version": 1,
  "clientId": "local-record-uuid",
  "clientUpdatedTime": "2026-04-19T10:30:00+08:00"
}
```

### 4.4 Anniversary

```json
{
  "id": "1",
  "title": "第一次约会",
  "anniversaryDate": "2026-05-20",
  "type": "first_date",
  "repeatType": "yearly",
  "remark": "西湖边散步",
  "countdownDays": 23,
  "createdAt": "2026-04-19T10:30:00+08:00",
  "updatedAt": "2026-04-19T10:30:00+08:00"
}
```

## 5. Web / Android 共用接口

以下接口 Android 与 Web 共用：

```text
GET    /options/records
GET    /records
GET    /records/{id}
GET    /records/by-date
POST   /records
PUT    /records/{id}
DELETE /records/{id}

GET    /anniversaries
POST   /anniversaries
PUT    /anniversaries/{id}
DELETE /anniversaries/{id}

POST   /media/uploads
GET    /locations/reverse-geocode
POST   /love-users/init
```

### 5.1 Android 保存记录请求体

Android 保存记录与 Web 字段保持一致，但会稳定携带以下同步字段：

```json
{
  "recordDate": "2026-04-19",
  "text": "App 写入的记录",
  "mood": "heart",
  "location": null,
  "mediaIds": ["1", "2"],
  "clientId": "local-record-uuid",
  "clientUpdatedTime": "2026-04-19T10:30:00+08:00",
  "version": 1
}
```

说明：

- `clientId`：本地离线临时主键
- `clientUpdatedTime`：客户端最后修改时间
- `version`：给后续冲突处理预留

## 6. Android 专属接口

这些接口 Web 端不是强依赖，但 Android 客户端建议后端预留。

### 6.1 首次全量同步

```text
GET /sync/bootstrap
```

响应：

```json
{
  "records": [],
  "anniversaries": [],
  "media": [],
  "spaces": [],
  "serverTime": "2026-04-19T10:30:00+08:00",
  "latestChangeVersion": 1024
}
```

### 6.2 增量同步

```text
GET /sync/changes?afterVersion=1024&size=100
```

响应：

```json
{
  "changes": [
    {
      "changeVersion": 1025,
      "tableName": "lr_record",
      "bizId": "1",
      "bizNo": "REC202604190001",
      "changeType": "update",
      "changedFields": ["text", "updated_time"],
      "snapshot": {}
    }
  ],
  "latestChangeVersion": 1100,
  "hasMore": true
}
```

### 6.3 离线变更回传

```text
POST /sync/push
```

请求体：

```json
{
  "records": [
    {
      "recordDate": "2026-04-19",
      "text": "App 离线新增的记录",
      "mood": "heart",
      "mediaIds": [],
      "clientId": "local-record-uuid",
      "clientUpdatedTime": "2026-04-19T10:20:00+08:00",
      "version": 1
    }
  ],
  "anniversaries": [],
  "deletedItems": [
    {
      "tableName": "lr_record",
      "bizNo": "REC202604190001",
      "clientUpdatedTime": "2026-04-19T10:22:00+08:00"
    }
  ]
}
```

响应：

```json
{
  "success": true,
  "conflicts": [],
  "latestChangeVersion": 1101
}
```

## 7. 后端实现建议

### 7.1 路径层面

- 业务 Controller 可以继续保持原路径，例如 `/records`
- 如果网关统一代理为 `/api/*`，Android 端只需要把 base URL 指到 `/api/`

### 7.2 媒体层面

- 上传接口返回 `media.id`
- 预览接口请保证 `/media/{id}/view` 可直接访问
- 建议补 `thumbnailUrl/previewUrl/mobileUrl`

### 7.3 同步层面

- `clientId + external_user_id` 可以作为离线创建的幂等识别线索
- `clientUpdatedTime` 可参与冲突判断
- `X-App-Id`、`X-Client-Type` 可以写入同步日志和审计日志

## 当前后端实现说明（2026-04-27）

### 9.1 已补齐的 Android 关键接口

```text
POST /love-users/init
GET  /sync/bootstrap
GET  /sync/changes
POST /sync/push
```

### 9.2 当前来源区分方案

后端当前按以下优先级识别请求来源：

1. `X-Client-Type`
2. `X-App-Id`

识别结果会统一归一化为：

```text
android / web / ios / unknown
```

### 9.3 Header 约定

后端已补充识别以下 Header：

```text
X-App-Id
X-Device-Type
X-User-Id
X-Client-Type
X-Client-Version
```

### 9.4 当前落库策略

- 访问日志继续记录 `X-App-Id`
- `records`、`anniversaries` 在保存/更新时，会把请求来源信息写入 `extraJson`
- `lr_sync_change_log.source_client_type` 会记录本次同步来源
- `lr_sync_cursor` 会记录每个客户端最近一次同步版本和时间

### 9.5 Record 返回补充字段

后端当前 `Record` 返回已补充：

```json
{
  "clientId": "local-record-uuid",
  "clientUpdatedTime": "2026-04-19T10:30:00"
}
```

### 9.6 sync/push 当前能力

当前支持：

- 记录新增/更新
- 纪念日新增/更新
- 按 `deletedItems` 删除记录/纪念日
- 写入同步变更日志
- 更新客户端同步游标

当前仍是轻量版同步实现，冲突列表 `conflicts` 先保留空数组，后续如需细化冲突策略，可继续在此基础上扩展。
