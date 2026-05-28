# 每日图片模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## 数据模型

### DailyImage

| 字段          | 类型           | 说明                                  |
| ------------- | -------------- | ------------------------------------- |
| id            | long           | 主键，自增                            |
| originalName  | string         | 原始文件名                            |
| storageName   | string         | 存储文件名（`yyyyMMdd001.jpg` 格式）  |
| storagePath   | string         | 原图存储绝对路径                      |
| thumbnailPath | string \| null | 缩略图存储路径，可能为 null           |
| fileSize      | long           | 文件大小（字节）                      |
| extension     | string         | 文件扩展名，如 `jpg`、`png`           |
| source        | string         | 来源：`unsplash` / `local` / `upload` |
| remark        | string \| null | 备注                                  |
| status        | byte           | 状态：`0`=已删除，`1`=正常            |
| createdTime   | string         | 创建时间，ISO 8601 格式               |
| updatedTime   | string         | 更新时间，ISO 8601 格式               |

---

## 接口列表

### POST /daily-images/upload — 上传图片

**请求：** `Content-Type: multipart/form-data`

| 参数 | 类型 | 必填 | 说明                                       |
| ---- | ---- | ---- | ------------------------------------------ |
| file | File | 是   | 图片文件，仅允许 `image/*` 类型，最大 10MB |

**响应：**

```json
{
  "code": 200,
  "msg": "上传成功",
  "success": true,
  "data": {
    "id": 1,
    "originalName": "photo.jpg",
    "storageName": "1716902400000abc123.jpg",
    "storagePath": "/project/docker_project/photo-stream/photos/original/1716902400000abc123.jpg",
    "thumbnailPath": "/project/docker_project/photo-stream/photos/original/thumb_1716902400000abc123.jpg",
    "fileSize": 1024000,
    "extension": ".jpg",
    "source": "upload",
    "remark": null,
    "status": 1,
    "createdTime": "2026-05-28T10:00:00",
    "updatedTime": "2026-05-28T10:00:00"
  }
}
```

**前端调用方式：**

```js
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const res = await fetch("/daily-images/upload", {
  method: "POST",
  body: formData
});
const { data } = await res.json();
// data.thumbnailPath 可用于列表展示，data.id 用于后续操作
```

**错误：**

- 文件为空或类型不匹配返回 400
- 文件写入失败返回 500

---

### GET /daily-images/page — 分页查询图片列表

**Query 参数：**

| 参数    | 类型   | 必填 | 默认值 | 说明               |
| ------- | ------ | ---- | ------ | ------------------ |
| current | number | 否   | 1      | 当前页码           |
| size    | number | 否   | 10     | 每页条数           |
| source  | string | 否   | -      | 来源筛选，精确匹配 |

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "success": true,
  "data": {
    "records": [
      {
        "id": 1,
        "originalName": "sunset.jpg",
        "storageName": "20260528001.jpg",
        "storagePath": "/data/images/20260528001.jpg",
        "thumbnailPath": "/data/images/thumb_20260528001.jpg",
        "fileSize": 1024000,
        "extension": "jpg",
        "source": "unsplash",
        "remark": null,
        "status": 1,
        "createdTime": "2026-05-28T10:00:00",
        "updatedTime": "2026-05-28T10:00:00"
      }
    ],
    "total": 100,
    "size": 10,
    "current": 1,
    "pages": 10
  }
}
```

> 仅返回 `status=1` 的正常图片，按 `createdTime` 降序排列。

---

### GET /daily-images/{id} — 获取图片详情

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "success": true,
  "data": {
    "id": 1,
    "originalName": "sunset.jpg",
    "storageName": "20260528001.jpg",
    "storagePath": "/data/images/20260528001.jpg",
    "thumbnailPath": "/data/images/thumb_20260528001.jpg",
    "fileSize": 1024000,
    "extension": "jpg",
    "source": "unsplash",
    "remark": null,
    "status": 1,
    "createdTime": "2026-05-28T10:00:00",
    "updatedTime": "2026-05-28T10:00:00"
  }
}
```

**错误响应：**

```json
{
  "code": 404,
  "msg": "图片不存在",
  "success": false,
  "data": null
}
```

---

### DELETE /daily-images/{id} — 删除图片

逻辑删除，同时异步清理磁盘上的原图和缩略图文件。

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应：**

```json
{
  "code": 200,
  "msg": "删除成功",
  "success": true,
  "data": null
}
```

**错误响应：**

```json
{
  "code": 404,
  "msg": "图片不存在",
  "success": false,
  "data": null
}
```

---

### PUT /daily-images/{id}/remark — 更新图片备注

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**Query 参数：**

| 参数   | 类型   | 必填 | 说明     |
| ------ | ------ | ---- | -------- |
| remark | string | 是   | 备注内容 |

**请求示例：**

```
PUT /daily-images/1/remark?remark=风景照
```

**响应：**

```json
{
  "code": 200,
  "msg": "更新成功",
  "success": true,
  "data": null
}
```

**错误响应：**

```json
{
  "code": 404,
  "msg": "图片不存在",
  "success": false,
  "data": null
}
```

---

### GET /daily-images/{id}/download — 下载原图

返回文件流，触发浏览器下载。

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应头：**

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="sunset.jpg"
```

**前端调用方式：**

```js
// 方式一：a 标签
<a href="/daily-images/{id}/download" download>
  下载
</a>;

// 方式二：window.open
window.open(`/daily-images/${id}/download`);

// 方式三：fetch + blob（需要处理文件名时）
const res = await fetch(`/daily-images/${id}/download`);
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "sunset.jpg";
a.click();
URL.revokeObjectURL(url);
```

**错误：** 图片不存在或文件缺失时返回 HTTP 404（无响应体）。

---

### GET /daily-images/{id}/thumbnail — 获取缩略图

返回缩略图文件流，可直接作为 `<img>` 的 `src`。若缩略图不存在则回退返回原图。

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应头：**

```
Content-Type: image/jpeg
```

**前端调用方式：**

```html
<img :src="`/daily-images/${id}/thumbnail`" alt="图片缩略图" />
```

**错误：** 图片不存在或文件缺失时返回 HTTP 404（无响应体）。

---

## 前端联调要点

1. **上传**：`POST /daily-images/upload`，使用 `multipart/form-data`，字段名为 `file`，仅接受图片类型
2. **列表页**：调用 `GET /daily-images/page` 渲染分页列表，缩略图用 `/daily-images/{id}/thumbnail` 作为 `<img src>`
3. **下载**：通过 `GET /daily-images/{id}/download` 触发下载
4. **编辑备注**：`PUT /daily-images/{id}/remark?remark=xxx`，参数通过 Query 传递
5. **删除**：`DELETE /daily-images/{id}`，删除后列表需刷新
6. **缩略图回退**：后端会自动回退到原图，前端无需判断 `thumbnailPath` 是否存在
7. **source 筛选**：分页接口支持 `source` 参数精确筛选，可选值 `unsplash` / `local` / `upload`
