# 每日图片模块

> 通用约定见 [COMMON.md](COMMON.md)

---

## 数据模型

### DailyImage

| 字段          | 类型           | 说明                                           |
| ------------- | -------------- | ---------------------------------------------- |
| id            | long           | 主键，自增                                     |
| originalName  | string         | 原始文件名                                     |
| storageName   | string         | 存储文件名（`yyyyMMdd001.jpg` 格式）           |
| storagePath   | string         | 原图存储绝对路径                               |
| thumbnailPath | string \| null | 缩略图存储路径，可能为 null                    |
| fileSize      | long           | 文件大小（字节）                               |
| extension     | string         | 文件扩展名，如 `jpg`、`png`                    |
| source        | string         | 来源：`unsplash` / `local` / `upload` / `sync` |
| remark        | string \| null | 备注                                           |
| status        | byte           | 状态：`0`=已删除，`1`=正常                     |
| createdTime   | string         | 创建时间，格式 `yyyyMMdd HHmmss`               |
| updatedTime   | string         | 更新时间，格式 `yyyyMMdd HHmmss`               |

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
    "createdTime": "20260528 100000",
    "updatedTime": "20260528 100000"
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
        "createdTime": "20260528 100000",
        "updatedTime": "20260528 100000"
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
    "createdTime": "20260528 100000",
    "updatedTime": "20260528 100000"
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

### DELETE /daily-images/batch — 批量删除图片

逻辑删除，同时异步清理磁盘上的原图和缩略图文件。

**请求：** `Content-Type: application/json`

```json
[1, 2, 3]
```

**响应：**

```json
{
  "code": 200,
  "msg": "删除成功，共删除 3 张图片",
  "success": true,
  "data": 3
}
```

**错误响应：**

```json
{
  "code": 400,
  "msg": "请选择要删除的图片",
  "success": false,
  "data": null
}
```

**前端调用方式：**

```js
const ids = [1, 2, 3]; // 选中的图片 ID 列表
const res = await fetch("/daily-images/batch", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(ids)
});
const { data: deletedCount } = await res.json();
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

### POST /daily-images/batch-download — 批量下载图片（ZIP打包）

将多张图片打包成 ZIP 文件下载。自动跳过已删除或不存在的图片。

**请求：** `Content-Type: application/json`

```json
[1, 2, 3]
```

**响应头：**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="图片打包下载.zip"
```

**前端调用方式：**

```js
const ids = [1, 2, 3];
const res = await fetch("/daily-images/batch-download", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(ids)
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "图片打包下载.zip";
a.click();
URL.revokeObjectURL(url);
```

**错误：**

- ID 列表为空返回 HTTP 400
- 所有图片均不存在返回 HTTP 404
- 打包失败返回 HTTP 500

---

### POST /daily-images/batch-download-links — 批量获取下载链接

返回可用的下载链接列表，前端可逐个或并行下载，不打包。

**请求：** `Content-Type: application/json`

```json
[1, 2, 3]
```

**响应：**

```json
{
  "code": 200,
  "msg": "获取成功，共 3 个文件",
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "photo1.jpg",
      "size": 1024000,
      "url": "/daily-images/1/download"
    },
    {
      "id": 2,
      "name": "photo2.png",
      "size": 2048000,
      "url": "/daily-images/2/download"
    }
  ]
}
```

**前端调用方式：**

```js
// 获取下载链接
const ids = [1, 2, 3];
const res = await fetch("/daily-images/batch-download-links", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(ids)
});
const { data: links } = await res.json();

// 逐个下载
for (const item of links) {
  const a = document.createElement("a");
  a.href = item.url;
  a.download = item.name;
  a.click();
}

// 或并行下载（带进度控制）
const downloadAll = async links => {
  let completed = 0;
  await Promise.all(
    links.map(async item => {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
      completed++;
      console.log(`下载进度: ${completed}/${links.length}`);
    })
  );
};
```

**批量下载接口对比：**

| 接口                    | 方式         | 适用场景                   |
| ----------------------- | ------------ | -------------------------- |
| `/batch-download`       | ZIP打包下载  | 需要一次性下载所有文件     |
| `/batch-download-links` | 返回链接列表 | 前端控制下载进度、并行下载 |

---

### GET /daily-images/{id}/thumbnail — 获取缩略图

返回缩略图文件流，可直接作为 `<img>` 的 `src`。若缩略图不存在则回退返回原图。

支持 HTTP 缓存：ETag、Last-Modified、Cache-Control（7 天）。

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应头：**

```
Content-Type: image/jpeg
Cache-Control: public, max-age=604800
ETag: "1716902400000-102400"
Last-Modified: Wed, 28 May 2026 10:00:00 GMT
```

**前端调用方式：**

```html
<img :src="`/daily-images/${id}/thumbnail`" alt="图片缩略图" />
```

**错误：** 图片不存在或文件缺失时返回 HTTP 404（无响应体）。

---

### GET /daily-images/{id}/preview — 预览原图

返回原图文件流，支持 HTTP 缓存，适合图片详情查看。

**路径参数：**

| 参数 | 类型   | 说明    |
| ---- | ------ | ------- |
| id   | number | 图片 ID |

**响应头：**

```
Content-Type: image/jpeg
Cache-Control: public, max-age=604800
```

**前端调用方式：**

```html
<img :src="`/daily-images/${id}/preview`" alt="原图预览" />
```

**错误：** 图片不存在或文件缺失时返回 HTTP 404（无响应体）。

---

---

## 定时任务

### syncPhotoDirectory — 图片目录同步

扫描图片目录，自动补全缺失记录、生成缩略图、清理无效记录。

**XXL-JOB 配置：**

- JobHandler：`syncPhotoDirectory`
- 建议 cron：`0 0 3 * * ?`（每天凌晨 3 点执行）

**执行逻辑：**

1. 扫描 `photo.path` 目录下的图片文件（排除 `thumb_` 前缀的缩略图）
2. **补全缺失记录**：磁盘上有但数据库中没有的图片，自动入库并生成缩略图，`source` 标记为 `sync`
3. **生成缩略图**：为数据库中缺失缩略图的记录自动生成（宽 300px，等比缩放）
4. **清理无效记录**：删除磁盘上已不存在的图片对应的数据库记录（逻辑删除）

**日志输出示例：**

```
图片目录同步任务开始，扫描目录: /data/photos
补全图片记录: 20260601001.jpg
生成缩略图: thumb_20260601001.jpg
删除无效记录: old_photo.jpg (文件不存在)
图片目录同步任务完成，耗时: 1250ms，补全: 1，缩略图: 1，清理: 1
```

---

## 配置项

### 异常栈截断行数

| 配置 Key                    | 默认值 | 说明                                                             |
| --------------------------- | ------ | ---------------------------------------------------------------- |
| `log.stack-trace.max-lines` | 10     | 异常栈最大打印行数（用于日志截断、任务日志入库、异常邮件等场景） |

**配置优先级（从高到低）：**

1. `sys_config` 表 — 最高优先级，可动态修改无需重启
2. JVM 系统属性 — `-Dlog.stack-trace.max-lines=15`
3. 环境变量 — `LOG_STACK_TRACE_MAX_LINES=15`
4. application.yml 配置
5. 默认值 10

---

## 前端联调要点

1. **上传**：`POST /daily-images/upload`，使用 `multipart/form-data`，字段名为 `file`，仅接受图片类型
2. **列表页**：调用 `GET /daily-images/page` 渲染分页列表，缩略图用 `/daily-images/{id}/thumbnail` 作为 `<img src>`
3. **下载**：通过 `GET /daily-images/{id}/download` 触发下载
4. **批量下载（打包）**：`POST /daily-images/batch-download`，请求体为 ID 数组，返回 ZIP 文件
5. **批量下载（链接）**：`POST /daily-images/batch-download-links`，请求体为 ID 数组，返回下载链接列表，适合需要进度控制的场景
6. **编辑备注**：`PUT /daily-images/{id}/remark?remark=xxx`，参数通过 Query 传递
7. **单个删除**：`DELETE /daily-images/{id}`，删除后列表需刷新
8. **批量删除**：`DELETE /daily-images/batch`，请求体为 ID 数组，返回成功删除数量
9. **缩略图回退**：后端会自动回退到原图，前端无需判断 `thumbnailPath` 是否存在
10. **source 筛选**：分页接口支持 `source` 参数精确筛选，可选值 `unsplash` / `local` / `upload` / `sync`
