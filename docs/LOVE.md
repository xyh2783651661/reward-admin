# 恋爱空间模块

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含恋爱空间模块的记录、纪念日、媒体、统计等接口。

---

## 数据结构

### Location

```json
{
  "name": "杭州 西湖",
  "address": "浙江省杭州市西湖区",
  "latitude": 30.243087,
  "longitude": 120.150892,
  "source": "map",
  "extra": {}
}
```

### 2.2 Media

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
  "width": null,
  "height": null,
  "duration": null,
  "createdAt": "2026-04-19T10:30:00",
  "extra": {}
}
```

### 2.3 Record

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
    "source": "map",
    "extra": {}
  },
  "media": [],
  "createdAt": "2026-04-19T10:30:00",
  "updatedAt": "2026-04-19T10:30:00",
  "version": 1,
  "extra": {}
}
```

## 3. 用户接口

### 3.1 初始化或获取 Love 用户

```text
POST /love-users/init
```

请求体：

```json
{
  "nickname": "小王",
  "avatarUrl": "https://cdn.example.com/avatar.png"
}
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "loveUserId": 1,
    "loveUserNo": "LU1770000000000",
    "externalUserId": "old-system-user-id",
    "nickname": "小王",
    "avatarUrl": "https://cdn.example.com/avatar.png"
  }
}
```

## 4. 枚举配置接口

### 4.1 获取记录枚举

```text
GET /options/records
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "moods": [
      {
        "value": "heart",
        "label": "甜蜜",
        "icon": "♥",
        "enabled": true,
        "sort": 1,
        "extra": {}
      }
    ],
    "recordTypes": [
      {
        "value": "photo",
        "label": "照片",
        "icon": "",
        "enabled": true,
        "sort": 2,
        "extra": {}
      }
    ],
    "anniversaryTypes": [
      {
        "value": "first_date",
        "label": "第一次约会",
        "icon": "♥",
        "enabled": true,
        "sort": 1,
        "extra": {}
      }
    ]
  }
}
```

## 5. 恋爱记录接口

### 5.1 分页查询记录

```text
GET /records
```

Query：

```text
current=1
size=12
keyword=电影
date=2026-04-19
mood=heart
type=photo
```

参数说明：

| 参数    | 类型   | 必填 | 说明                                       |
| ------- | ------ | ---- | ------------------------------------------ |
| current | number | 否   | 当前页，默认 1                             |
| size    | number | 否   | 每页数量，默认 12，最大 100                |
| keyword | string | 否   | 搜索 `text/location.name/location.address` |
| date    | string | 否   | 记录日期，格式 `yyyy-MM-dd`                |
| mood    | string | 否   | 心情字典值                                 |
| type    | string | 否   | 媒体类型，`photo/video/file/pdf`           |

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "records": [
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
          "source": "map",
          "extra": {}
        },
        "media": [],
        "createdAt": "2026-04-19T10:30:00",
        "updatedAt": "2026-04-19T10:30:00",
        "version": 1,
        "extra": {}
      }
    ],
    "current": 1,
    "size": 12,
    "total": 100,
    "hasMore": true
  }
}
```

### 5.2 查询记录详情

```text
GET /records/{id}
```

响应：`data` 为 `Record`。

### 5.3 新增记录

```text
POST /records
```

请求体：

```json
{
  "date": "2026-04-19",
  "recordDate": "2026-04-19",
  "text": "今天一起去看了电影。",
  "mood": "heart",
  "location": {
    "name": "杭州 西湖",
    "address": "浙江省杭州市西湖区",
    "latitude": 30.243087,
    "longitude": 120.150892,
    "source": "map",
    "extra": {}
  },
  "mediaIds": ["1"],
  "media": [
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
      "extra": {}
    }
  ],
  "clientId": "local-uuid-for-app-offline",
  "clientUpdatedTime": "2026-04-19T10:30:00+08:00",
  "version": 1,
  "extra": {}
}
```

响应：`data` 为保存后的 `Record`。

说明：

- 前端可以直接传 `mediaIds: ["1"]` 绑定已上传文件；`media` 数组保持兼容，二者同时传时后端会按媒体 ID 去重。
- `date` 与 `recordDate` 都支持；优先使用 `recordDate`，没有传时使用 `date`。
- 如果图片/视频来自 `POST /media/uploads`，保存记录时请把上传响应里的 `media.id` 一并传回。
- 后端会复用已有媒体并建立记录关系；`POST /records`、`PUT /records/{id}` 不再创建新的 `lr_media`。
- 不允许提交 `blob:` 或 `data:` 开头的浏览器本地预览地址；这类地址只能前端本地展示，刷新后即失效。
- 后端以 `lr_record_media` 关系表作为记录图片回显依据，编辑记录时移除某张图片，只会删除记录和图片的关系，不会重复创建媒体数据。

### 5.4 编辑记录

```text
PUT /records/{id}
```

请求体：同新增记录。

响应：`data` 为更新后的 `Record`。

### 5.5 删除记录

```text
DELETE /records/{id}
```

响应：

```json
{
  "code": 200,
  "msg": "删除成功！",
  "data": {
    "success": true
  }
}
```

### 5.6 按日期分页查询记录

```text
GET /records/by-date
```

Query：

```text
date=2026-04-19
current=1
size=6
```

响应：同记录分页。

## 6. 媒体接口

### 6.1 上传图片或视频

```text
POST /media/uploads
```

请求类型：`multipart/form-data`

字段：

| 字段  | 类型   | 必填 | 说明           |
| ----- | ------ | ---- | -------------- |
| files | File[] | 是   | 支持多文件上传 |

响应：

```json
{
  "code": 200,
  "msg": "上传成功！",
  "data": {
    "media": [
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
        "width": null,
        "height": null,
        "duration": null,
        "createdAt": "2026-04-19T10:30:00",
        "extra": {}
      }
    ]
  }
}
```

说明：

- `type` 根据 `Content-Type` 自动推断：`image/* -> photo`，`video/* -> video`，`application/pdf -> pdf`，其他为 `file`。
- 当前上传后返回 `/media/{id}/view`，前端可直接用于图片预览、视频播放或文件打开；如果前端配置 `/api` 代理，则访问 `/api/media/{id}/view`。
- 图片上传成功后会同步生成缩略图，`thumbnailUrl/previewUrl/mobileUrl` 指向 `/media/{id}/thumbnail`；列表、卡片、瀑布流优先使用缩略图字段，点击查看原图时再使用 `url`。

### 6.2 查看/预览文件

```text
GET /media/{id}/view
```

响应：文件二进制流，`Content-Disposition: inline`。

支持 HTTP 缓存：

- `Cache-Control: public, max-age=604800`（7 天）
- `ETag` 基于文件修改时间和大小
- `Last-Modified` 文件最后修改时间
- 浏览器会自动处理 304 Not Modified

### 6.3 查看缩略图

```text
GET /media/{id}/thumbnail
```

响应：缩略图二进制流，`Content-Disposition: inline`。如果缩略图不存在，后端会回退返回原图。

支持 HTTP 缓存（同 6.2）。

## 7. 位置接口

### 7.1 逆地址解析

```text
GET /locations/reverse-geocode
```

Query：

```text
latitude=30.243087
longitude=120.150892
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "name": "佘月路",
    "address": "上海市松江区佘月路",
    "latitude": 31.1055,
    "longitude": 121.2306,
    "source": "geolocation",
    "extra": {
      "provider": "tencent",
      "province": "上海市",
      "city": "上海市",
      "district": "松江区"
    }
  }
}
```

说明：后端已接入公共 `MapLocationService`，按系统配置优先使用腾讯地图，失败后可回退高德、百度。经纬度会先归一化到 4 位小数后再缓存，减少前端定位微小抖动导致的重复请求。

### 7.2 地点搜索

```text
GET /locations/search?keyword=西湖&latitude=31.1&longitude=121.2
```

请求参数：

| 参数      | 必填 | 说明                              |
| --------- | ---- | --------------------------------- |
| keyword   | 是   | 搜索关键字，例如 `西湖`、`咖啡店` |
| latitude  | 是   | 当前纬度，用于附近搜索            |
| longitude | 是   | 当前经度，用于附近搜索            |

说明：当前后端优先接入腾讯地图地点搜索，搜索半径 5km，默认返回前 10 条。结果缓存 12 小时。

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "records": [
      {
        "id": "tencent-poi-123",
        "name": "西湖风景名胜区",
        "address": "浙江省杭州市西湖区龙井路1号",
        "latitude": 30.2401,
        "longitude": 120.1509,
        "source": "search",
        "extra": {
          "provider": "tencent",
          "category": "旅游景点",
          "province": "浙江省",
          "city": "杭州市",
          "district": "西湖区",
          "adcode": "330106",
          "tel": "0571-xxxxxxx",
          "distance": 1200
        }
      }
    ]
  }
}
```

## 8. 纪念日接口

### 8.1 查询纪念日列表

```text
GET /anniversaries
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "anniversaries": [
      {
        "id": "1",
        "title": "第一次约会",
        "anniversaryDate": "2021-05-20",
        "type": "first_date",
        "repeatType": "yearly",
        "remark": "第一次正式约会的日子",
        "countdownDays": 31,
        "createdAt": "2026-04-19T10:30:00",
        "updatedAt": null,
        "extra": {}
      }
    ]
  }
}
```

### 8.2 新增纪念日

```text
POST /anniversaries
```

请求体：

```json
{
  "title": "第一次约会",
  "anniversaryDate": "2021-05-20",
  "anniversaryType": "first_date",
  "repeatType": "yearly",
  "remark": "第一次正式约会的日子",
  "remindDays": 7,
  "status": 1,
  "extraJson": "{}"
}
```

响应：`data` 为新增后的纪念日结构。

### 8.3 编辑纪念日

```text
PUT /anniversaries/{id}
```

请求体：同新增纪念日。

响应：`data` 为更新后的纪念日结构。

### 8.4 删除纪念日

```text
DELETE /anniversaries/{id}
```

响应：

```json
{
  "code": 200,
  "msg": "删除成功！",
  "data": {
    "success": true
  }
}
```

### 8.5 纪念日数据结构说明

| 字段            | 类型   | 必填 | 说明                         |
| --------------- | ------ | ---- | ---------------------------- |
| id              | string | 响应 | 纪念日 ID                    |
| title           | string | 是   | 标题                         |
| anniversaryDate | string | 是   | 日期，格式 `yyyy-MM-dd`      |
| anniversaryType | string | 否   | 类型字典值，前端提交字段     |
| type            | string | 否   | 类型字典值，前端兼容显示字段 |
| repeatType      | string | 否   | `yearly` / `none`            |
| remark          | string | 否   | 备注                         |
| remindDays      | number | 否   | 提前提醒天数                 |
| status          | number | 否   | 1 启用，0 停用               |
| countdownDays   | number | 响应 | 距离下一次纪念日天数         |

前端兼容说明：`type` 和 `anniversaryType`、`date` 和 `anniversaryDate` 均可使用，后端标准返回使用 `anniversaryDate` 和 `type`。

## 9. 统计接口

### 9.1 获取回忆统计

```text
GET /statistics/memories
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "totalLoveDays": 365,
    "longestStreak": 12,
    "recordCount": 88,
    "mediaCount": 56,
    "moodDistribution": [
      {
        "mood": "spark",
        "label": "开心",
        "icon": "✨",
        "count": 18
      }
    ],
    "latestRecords": [],
    "latestMedia": []
  }
}
```

### 9.2 获取日历统计

```text
GET /statistics/calendar?year=2026&month=4
```

用途：

- 日历格子记录密度
- 哪些日期有记录
- 哪些日期属于连续记录 streak
- 哪些日期有纪念日

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "recordCountByDate": {
      "2026-04-15": 2,
      "2026-04-20": 5
    },
    "highlightedDates": ["2026-04-15", "2026-04-20"],
    "streakDates": ["2026-04-18", "2026-04-19", "2026-04-20"],
    "anniversaryDates": ["2026-04-20"],
    "yearRecordCount": 87,
    "currentStreak": 3
  }
}
```

说明：前端不应只用分页列表数据算日历高亮和 streak，数据量大时会失真，必须以后端此接口为准。

### 9.3 获取回忆相册分页

```text
GET /statistics/memory-gallery?current=1&size=30
```

用途：统计页"回忆相册"瀑布流展示。

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "records": [
      {
        "id": 101,
        "recordId": 1,
        "recordDate": "2026-04-22",
        "mediaType": "photo",
        "type": "photo",
        "fileUrl": "/media/101/view",
        "thumbnailUrl": "/media/101/thumbnail",
        "previewUrl": "/media/101/thumbnail",
        "mobileUrl": "/media/101/thumbnail"
      }
    ],
    "current": 1,
    "size": 30,
    "total": 298,
    "hasMore": true
  }
}
```

## 10. 导出接口

### 10.1 导出 PDF

```text
GET /exports/memories/pdf
```

响应：`application/pdf`

说明：当前为占位 PDF 内容，后续接入真实排版导出。

### 10.2 导出图片

```text
GET /exports/memories/image
```

响应：`image/png`

说明：当前为 1x1 PNG 占位图，后续接入真实图片生成。

## 11. 事件日志接口

### 11.1 上报用户行为

```text
POST /events
```

请求体：

```json
{
  "type": "view_record_detail",
  "detail": {
    "id": "1"
  },
  "deviceType": "PC",
  "occurredAt": "2026-04-19T10:30:00+08:00",
  "pagePath": "/detail/1"
}
```

响应：

```json
{
  "code": 200,
  "msg": "上报成功！",
  "data": {
    "success": true
  }
}
```

## 12. Android 同步接口

### 12.1 首次全量同步

```text
GET /sync/bootstrap
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "records": [],
    "anniversaries": [],
    "media": [],
    "spaces": [],
    "serverTime": "2026-04-19T10:30:00",
    "latestChangeVersion": 1024
  }
}
```

### 12.2 增量同步

```text
GET /sync/changes
```

Query：

```text
afterVersion=1024
size=100
```

响应：

```json
{
  "code": 200,
  "msg": "请求成功！",
  "data": {
    "changes": [
      {
        "changeVersion": 1025,
        "tableName": "lr_record",
        "bizId": 1,
        "bizNo": "REC202604190001",
        "changeType": "update",
        "changedFields": ["text", "updated_time"],
        "snapshot": {}
      }
    ],
    "latestChangeVersion": 1100,
    "hasMore": true
  }
}
```

### 12.3 App 离线上传变更

```text
POST /sync/push
```

请求体：

```json
{
  "records": [
    {
      "clientId": "local-record-uuid",
      "recordDate": "2026-04-19",
      "text": "App 离线新增的记录",
      "mood": "heart",
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
  "code": 200,
  "msg": "同步成功！",
  "data": {
    "success": true,
    "conflicts": [],
    "latestChangeVersion": 1101
  }
}
```

说明：当前为占位成功响应，冲突检测和真实写入后续扩展。

## 13. 页面接口对应关系

### 首页

```text
GET /options/records
GET /records
POST /events
```

### 详情页

```text
GET /records/{id}
DELETE /records/{id}
POST /events
```

### 新增/编辑页

```text
GET /options/records
POST /media/uploads
GET /locations/reverse-geocode
POST /records
PUT /records/{id}
POST /events
```

### 日历页

```text
GET /anniversaries
GET /records/by-date
GET /statistics/calendar
POST /events
```

### 统计页

```text
GET /statistics/memories
GET /statistics/memory-gallery
GET /exports/memories/pdf
GET /exports/memories/image
POST /events
```

### Android 同步

```text
POST /love-users/init
GET /sync/bootstrap
GET /sync/changes
POST /sync/push
```

## 14. 后续扩展建议

以下接口当前由前端 localStorage 处理，如需多端同步建议逐步后端化：

### 草稿

```text
GET /record-drafts/current
POST /record-drafts
DELETE /record-drafts/{id}
```

### 自定义心情

```text
GET /options/custom-moods
POST /options/custom-moods
DELETE /options/custom-moods/{id}
```

### 主题偏好

深色模式等偏好可继续本地缓存，非必须后端化。

## 联调注意事项

- 前端如果使用 `/api` 前缀，需要确认 dev server 或网关把 `/api/*` 转发到后端
- 文件上传返回的是相对路径（如 `/media/1/view`），前端需拼接完整 URL
- 导出、同步冲突合并当前是联调占位实现
