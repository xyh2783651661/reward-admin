# 项目 API 接口文档

> **服务端口**：`86`  
> **基准路径**：无 `context-path` 前缀，所有路径直接从根开始  
> **示例**：`http://localhost:86/reward/calculate`

---

## 通用说明

### 统一返回结构 `Result<T>`

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {}
}
```

| 字段    | 类型    | 说明                         |
| ------- | ------- | ---------------------------- |
| code    | int     | 业务状态码，200~299 表示成功 |
| msg     | string  | 提示信息                     |
| success | boolean | 是否成功（由 code 自动推导） |
| data    | T       | 返回数据（可为 null）        |

### 分页返回结构 `Page<T>` (MyBatis-Plus)

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

### 分页请求参数（继承自 `PageRequest`）

| 字段    | 类型 | 必填 | 说明              |
| ------- | ---- | ---- | ----------------- |
| current | long | 否   | 当前页，默认 1    |
| size    | long | 否   | 每页条数，默认 10 |

### RESTful 约定

| 操作     | 方法       | 路径示例                     | 说明                      |
| -------- | ---------- | ---------------------------- | ------------------------- |
| 分页查询 | POST       | `/xxx/page`                  | Body 传查询条件           |
| 列表查询 | POST       | `/xxx/list`                  | Body 传查询条件（不分页） |
| 查询详情 | GET        | `/xxx/{id}`                  | —                         |
| 新增     | POST       | `/xxx` 或 `/xxx/add`         | Body 传数据               |
| 修改     | PUT / POST | `/xxx/{id}` 或 `/xxx/update` | Body 传数据               |
| 删除     | DELETE     | `/xxx/{id}`                  | —                         |

### 安全注解说明

| 注解               | 说明                 | 前端需配合                                             |
| ------------------ | -------------------- | ------------------------------------------------------ |
| `@Encrypted`       | HMAC-SHA256 签名校验 | 请求须携带 `X-App-Id`、`X-Timestamp`、`X-Signature` 头 |
| `@RepeatSubmit`    | 防重复提交           | 同一请求短时间内不可重复提交                           |
| `@RateLimit`       | 限流                 | 超限返回 429                                           |
| `@GithubCiAuth`    | GitHub CI 认证       | 仅 CI 流水线调用                                       |
| `@CustomCacheable` | 服务端缓存           | 前端无需关心                                           |

### `@Encrypted` 签名机制

标注 `@Encrypted` 的接口要求请求携带以下 Header：

| Header      | 必填 | 说明                                                    |
| ----------- | ---- | ------------------------------------------------------- |
| X-App-Id    | 是   | 应用标识                                                |
| X-Timestamp | 是   | 毫秒时间戳（5 分钟有效期）                              |
| X-Signature | 是   | `HMAC-SHA256(X-App-Id + X-Timestamp, secret)` 的 Base64 |

---

## 1. 认证模块 (Auth)

### 1.0 `/auth` — 用户认证

| 方法 | 路径                    | 说明             |
| ---- | ----------------------- | ---------------- |
| POST | `/auth/login`           | 用户登录         |
| POST | `/auth/logout`          | 用户登出         |
| GET  | `/auth/me`              | 获取当前用户信息 |
| POST | `/auth/change-password` | 修改密码         |

#### POST /auth/login — 用户登录

**Request Body:**

```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

| 字段     | 类型   | 必填 | 说明   |
| -------- | ------ | ---- | ------ |
| phone    | String | 是   | 手机号 |
| password | String | 是   | 密码   |

**Response `LoginVo`:**

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

> 登录成功后，后续需登录的接口须在请求头携带 `X-Token`。Token 有效期 24 小时。

#### POST /auth/logout — 登出

**请求头：**

| Header  | 必填 | 说明               |
| ------- | ---- | ------------------ |
| X-Token | 是   | 登录时获取的 Token |

#### GET /auth/me — 获取当前用户信息

**请求头：**

| Header  | 必填 | 说明               |
| ------- | ---- | ------------------ |
| X-Token | 是   | 登录时获取的 Token |

**Response `LoginVo`**（同登录响应，不含 token 字段）

#### POST /auth/change-password — 修改密码

**请求头：**

| Header  | 必填 | 说明               |
| ------- | ---- | ------------------ |
| X-Token | 是   | 登录时获取的 Token |

**Request Body:**

```json
{
  "userId": 1,
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

| 字段        | 类型   | 必填 | 说明                                  |
| ----------- | ------ | ---- | ------------------------------------- |
| userId      | Long   | 否   | 用户 ID（可选，默认修改当前登录用户） |
| oldPassword | String | 是   | 旧密码                                |
| newPassword | String | 是   | 新密码                                |

---

## 2. 奖励模块 (Reward)

### 2.1 `/reward` — Web 端奖励计算

| 方法   | 路径                        | 安全                     | 说明                                |
| ------ | --------------------------- | ------------------------ | ----------------------------------- |
| POST   | `/reward/calculate`         | @Encrypted @RepeatSubmit | 计算奖励                            |
| GET    | `/reward/subjects`          | @Encrypted               | 获取科目列表                        |
| GET    | `/reward/result`            | @Encrypted               | 获取计算结果                        |
| GET    | `/reward/compare`           | @Encrypted               | 获取最近两次计算结果对比            |
| DELETE | `/reward/{id}`              | @Encrypted               | 删除单条计算结果                    |
| DELETE | `/reward`                   | @Encrypted               | 批量删除计算结果（body: `[1,2,3]`） |
| GET    | `/reward/download/{id}`     | @Encrypted               | 下载计算结果 PDF                    |
| POST   | `/reward/avatar`            | @Encrypted               | 更新用户头像（multipart）           |
| GET    | `/reward/generate-apk-link` | @Encrypted               | 生成 APK 下载链接                   |
| GET    | `/reward/download-apk`      | @RateLimit               | Web 下载 APK                        |

#### POST /reward/calculate — 计算奖励

**Request Body:**

```json
{
  "scores": { "语文": 90, "数学": 85, "英语": 92 },
  "currentRank": 5,
  "previousRank": 8,
  "previousScores": { "语文": 85, "数学": 80, "英语": 88 }
}
```

| 字段           | 类型               | 必填 | 说明           |
| -------------- | ------------------ | ---- | -------------- |
| scores         | Map\<string, int\> | 是   | 各科目分数     |
| currentRank    | int                | 是   | 当前排名       |
| previousRank   | int                | 否   | 上次排名       |
| previousScores | Map\<string, int\> | 否   | 上次各科目分数 |

**Response `RewardResultDto`:**

```json
{
  "id": 1,
  "total": 267,
  "base": 100,
  "baseDesc": "基础奖励描述",
  "extra": 50,
  "extraDesc": "额外奖励描述",
  "special": 30,
  "specialDesc": "特殊奖励描述",
  "totalReward": 180,
  "currentRank": 5,
  "previousRank": 8,
  "coreTotal": 180,
  "generalTotal": 87,
  "baseValue": "100",
  "extraValue": "50",
  "specialValue": "30",
  "studentDto": {},
  "timestamp": 1715702400000
}
```

#### GET /reward/generate-apk-link — 生成 APK 下载链接

**Response:**

```json
{
  "code": 200,
  "data": {
    "url": "/reward/download-apk?expire=1715702700&sign=xxx",
    "expire": "1715702700",
    "sign": "xxx"
  }
}
```

#### GET /reward/download-apk — 下载 APK

**Query 参数：**

| 参数   | 类型   | 必填 | 说明                 |
| ------ | ------ | ---- | -------------------- |
| expire | long   | 是   | 链接过期时间戳（秒） |
| sign   | string | 是   | HMAC 签名            |

> 限流：60 秒内最多 5 次。链接有效期 5 分钟。

#### POST /reward/avatar — 更新头像

**Content-Type:** `multipart/form-data`

| 参数 | 类型          | 必填 | 说明     |
| ---- | ------------- | ---- | -------- |
| file | MultipartFile | 是   | 头像文件 |
| id   | Long          | 是   | 用户 ID  |

#### GET /reward/compare — 最近两次计算结果对比

**Response `RewardCompareVo`:**

```json
{
  "code": 200,
  "data": {
    "current": {
      "id": 2,
      "total": 267,
      "base": 100,
      "baseDesc": "基础奖励描述",
      "extra": 50,
      "extraDesc": "额外奖励描述",
      "special": 30,
      "specialDesc": "特殊奖励描述",
      "totalReward": 180,
      "currentRank": 5,
      "previousRank": 8,
      "coreTotal": 180,
      "generalTotal": 87,
      "timestamp": 1715702400000
    },
    "previous": {
      "id": 1,
      "total": 250,
      "base": 80,
      "baseDesc": "基础奖励描述",
      "extra": 40,
      "extraDesc": "额外奖励描述",
      "special": 30,
      "specialDesc": "特殊奖励描述",
      "totalReward": 150,
      "currentRank": 8,
      "previousRank": 10,
      "coreTotal": 170,
      "generalTotal": 80,
      "timestamp": 1715616000000
    },
    "rankChange": 3,
    "totalChange": 17,
    "totalRewardChange": 30
  }
}
```

| 字段              | 类型    | 说明                            |
| ----------------- | ------- | ------------------------------- |
| current           | Object  | 本次计算结果                    |
| previous          | Object  | 上次计算结果（仅一条时为 null） |
| rankChange        | Integer | 排名变化：正数=上升，负数=下降  |
| totalChange       | Integer | 总分变化                        |
| totalRewardChange | Integer | 总奖励变化                      |

---

### 2.2 `/reward-apk` — APK 端奖励计算（功能同 Reward + APK 版本管理）

| 方法   | 路径                                  | 安全                     | 说明                  |
| ------ | ------------------------------------- | ------------------------ | --------------------- |
| POST   | `/reward-apk/calculate`               | @Encrypted @RepeatSubmit | 计算奖励              |
| GET    | `/reward-apk/result`                  | @Encrypted               | 获取计算结果          |
| GET    | `/reward-apk/subjects`                | @Encrypted               | 获取科目列表          |
| GET    | `/reward-apk/profile`                 | @Encrypted               | 获取用户信息          |
| POST   | `/reward-apk/profile`                 | @Encrypted               | 更新用户信息          |
| POST   | `/reward-apk/avatar`                  | @Encrypted               | 上传头像（multipart） |
| DELETE | `/reward-apk/{id}`                    | @Encrypted               | 删除计算结果          |
| GET    | `/reward-apk/download/{id}`           | @Encrypted               | 下载结果 PDF          |
| GET    | `/reward-apk/download/rule`           | —                        | 下载规则 PDF          |
| GET    | `/reward-apk/last-version`            | @Encrypted               | 获取最新 APK 版本     |
| GET    | `/reward-apk/android/download-latest` | @RateLimit               | Android 下载最新 APK  |
| POST   | `/reward-apk/versions-page`           | —                        | APK 版本分页          |
| POST   | `/reward-apk/version-apk`             | @GithubCiAuth            | 持久化 APK 版本信息   |

#### POST /reward-apk/profile — 更新用户信息

**Request Body `RewardUserReq`:**

| 字段     | 类型   | 必填 | 说明    |
| -------- | ------ | ---- | ------- |
| id       | Long   | 是   | 用户 ID |
| nickName | String | 否   | 昵称    |
| phone    | String | 否   | 手机号  |
| mail     | String | 否   | 邮箱    |

---

### 2.3 `/reward-users` — 用户管理

| 方法   | 路径                      | 说明     |
| ------ | ------------------------- | -------- |
| POST   | `/reward-users/page`      | 用户分页 |
| POST   | `/reward-users/list`      | 用户列表 |
| POST   | `/reward-users/add`       | 添加用户 |
| POST   | `/reward-users/update`    | 更新用户 |
| POST   | `/reward-users/reset-pwd` | 重置密码 |
| DELETE | `/reward-users/{id}`      | 删除用户 |

**RewardUserReq 请求参数:**

| 字段     | 类型    | 说明                    |
| -------- | ------- | ----------------------- |
| id       | Long    | 用户 ID（更新时必填）   |
| nickName | String  | 昵称                    |
| phone    | String  | 手机号                  |
| password | String  | 密码（新增/重置时使用） |
| birthday | String  | 生日（yyyy-MM-dd）      |
| avatar   | String  | 头像 URL                |
| status   | Integer | 状态 (1=启用)           |

---

### 2.4 `/reward-subjects` — 科目管理

| 方法   | 路径                      | 说明     |
| ------ | ------------------------- | -------- |
| POST   | `/reward-subjects/page`   | 科目分页 |
| POST   | `/reward-subjects/list`   | 科目列表 |
| POST   | `/reward-subjects/add`    | 添加科目 |
| POST   | `/reward-subjects/update` | 更新科目 |
| DELETE | `/reward-subjects/{id}`   | 删除科目 |

**RewardSubjectReq:**

| 字段       | 类型    | 说明                 |
| ---------- | ------- | -------------------- |
| id         | Long    | ID（更新必填）       |
| name       | String  | 科目名称             |
| type       | String  | 类型：CORE / GENERAL |
| full       | Integer | 满分分值             |
| base       | Integer | 基础奖励             |
| excellence | Integer | 优秀线               |
| status     | Integer | 状态 (1=启用)        |
| stage      | String  | 学段                 |

---

### 2.5 `/reward-configs` — 奖励配置管理

| 方法   | 路径                            | 说明         |
| ------ | ------------------------------- | ------------ |
| POST   | `/reward-configs/page`          | 配置分页     |
| POST   | `/reward-configs/add`           | 添加配置     |
| POST   | `/reward-configs/update`        | 更新配置     |
| DELETE | `/reward-configs/{id}`          | 删除配置     |
| POST   | `/reward-configs/export-excel`  | 导出 Excel   |
| GET    | `/reward-configs/download/rule` | 下载规则 PDF |

**RewardConfigReq:**

| 字段        | 类型    | 说明                         |
| ----------- | ------- | ---------------------------- |
| id          | Long    | ID（更新必填）               |
| rewardKey   | String  | 奖励键                       |
| rewardType  | String  | 类型：BASE / EXTRA / SPECIAL |
| rewardValue | Integer | 奖励值                       |
| description | String  | 描述                         |
| condition   | String  | 条件表达式                   |
| status      | Integer | 状态 (1=启用)                |

---

### 2.6 `/reward-pocket-money-rules` — 零花钱规则管理

| 方法   | 路径                                      | 说明         |
| ------ | ----------------------------------------- | ------------ |
| GET    | `/reward-pocket-money-rules/options`      | 获取表单选项 |
| POST   | `/reward-pocket-money-rules/page`         | 规则分页     |
| POST   | `/reward-pocket-money-rules/add`          | 添加规则     |
| POST   | `/reward-pocket-money-rules/update`       | 更新规则     |
| DELETE | `/reward-pocket-money-rules/{id}`         | 删除规则     |
| POST   | `/reward-pocket-money-rules/export-excel` | 导出 Excel   |

**GET /reward-pocket-money-rules/options — 响应：**

```json
{
  "code": 200,
  "data": {
    "ruleTypeOptions": [
      { "label": "FIXED", "value": "FIXED" },
      { "label": "RATIO", "value": "RATIO" }
    ],
    "ruleKeys": ["daily_base", "top3_bonus"]
  }
}
```

**RewardPocketMoneyRuleReq:**

| 字段        | 类型       | 必填     | 说明                |
| ----------- | ---------- | -------- | ------------------- |
| id          | Long       | 更新必填 | ID                  |
| ruleKey     | String     | 新增必填 | 规则键（唯一）      |
| ruleType    | String     | 新增必填 | 类型：FIXED / RATIO |
| ruleValue   | BigDecimal | 否       | 规则值              |
| description | String     | 否       | 描述                |

---

## 3. 恋爱空间模块 (Love Space)

### 3.1 `/records` — 恋爱记录

| 方法   | 路径               | 说明           |
| ------ | ------------------ | -------------- |
| GET    | `/records`         | 记录分页查询   |
| GET    | `/records/by-date` | 按日期分页查询 |
| GET    | `/records/{id}`    | 记录详情       |
| POST   | `/records`         | 新增记录       |
| PUT    | `/records/{id}`    | 更新记录       |
| DELETE | `/records/{id}`    | 删除记录       |

**GET /records 请求参数 (Query String):**

| 字段    | 类型      | 默认值 | 说明                     |
| ------- | --------- | ------ | ------------------------ |
| date    | LocalDate | —      | 按日期筛选（yyyy-MM-dd） |
| current | long      | 1      | 当前页                   |
| size    | long      | 6      | 每页条数                 |

**GET /records/by-date 请求参数 (Query String):**

| 字段    | 类型      | 必填 | 说明               |
| ------- | --------- | ---- | ------------------ |
| date    | LocalDate | 是   | 日期（yyyy-MM-dd） |
| current | long      | 否   | 当前页，默认 1     |
| size    | long      | 否   | 每页条数，默认 6   |

**POST /records 请求体 `LoveRecordSaveReq`:**

```json
{
  "date": "2026-05-15",
  "text": "今天一起...",
  "mood": "开心",
  "location": { "name": "xxx", "latitude": 31.23, "longitude": 121.47 },
  "mediaIds": ["media-id-1", "media-id-2"],
  "clientId": "uuid",
  "clientUpdatedTime": "2026-05-15T10:30:00",
  "version": 1,
  "extra": {}
}
```

---

### 3.2 `/anniversaries` — 纪念日

| 方法   | 路径                  | 说明       |
| ------ | --------------------- | ---------- |
| GET    | `/anniversaries`      | 纪念日列表 |
| POST   | `/anniversaries`      | 新增纪念日 |
| PUT    | `/anniversaries/{id}` | 修改纪念日 |
| DELETE | `/anniversaries/{id}` | 删除纪念日 |

**POST/PUT 请求体 `LrAnniversary`:**

```json
{
  "title": "恋爱纪念日",
  "anniversaryDate": "2020-05-20",
  "anniversaryType": "DATE",
  "repeatType": "YEARLY",
  "remark": "备注",
  "remindDays": 3,
  "status": 1,
  "clientId": "uuid",
  "clientUpdatedTime": "2026-05-15T10:30:00",
  "extraJson": "{}"
}
```

| 字段            | 类型      | 说明           |
| --------------- | --------- | -------------- |
| title           | String    | 纪念日标题     |
| anniversaryDate | LocalDate | 纪念日日期     |
| anniversaryType | String    | 类型           |
| repeatType      | String    | 重复类型       |
| remark          | String    | 备注           |
| remindDays      | Integer   | 提前几天提醒   |
| status          | Byte      | 状态（1=启用） |

---

### 3.3 `/media` — 媒体文件管理

| 方法   | 路径                    | 说明                            |
| ------ | ----------------------- | ------------------------------- |
| POST   | `/media/uploads`        | 上传文件（multipart `files[]`） |
| GET    | `/media/{id}/view`      | 查看原文件                      |
| GET    | `/media/{id}/thumbnail` | 查看缩略图                      |
| DELETE | `/media/{id}`           | 删除单个媒体                    |

**POST /media/uploads:**

- Content-Type: `multipart/form-data`
- 参数名: `files`（支持多文件）
- 返回: `Result<LoveMediaUploadVo>`（含媒体 ID、文件名、URL 等）

**GET /media/{id}/view 和 /media/{id}/thumbnail:**

- 返回二进制流（Content-Type 由服务端自动判断）
- 文件不存在时返回 HTTP 404

---

### 3.4 `/love-users` — 用户初始化

| 方法 | 路径               | 说明            |
| ---- | ------------------ | --------------- |
| POST | `/love-users/init` | 初始化/更新用户 |

**LoveUserInitReq:**

```json
{
  "nickname": "昵称",
  "avatarUrl": "https://..."
}
```

> 若用户不存在则自动创建，已存在则更新昵称和头像。

---

### 3.5 `/locations` — 地点服务

| 方法 | 路径                         | 说明         |
| ---- | ---------------------------- | ------------ |
| GET  | `/locations/reverse-geocode` | 逆地址解析   |
| GET  | `/locations/search`          | 周边地点搜索 |

**GET /locations/reverse-geocode:**

| 参数      | 类型       | 必填 | 说明 |
| --------- | ---------- | ---- | ---- |
| latitude  | BigDecimal | 是   | 纬度 |
| longitude | BigDecimal | 是   | 经度 |

**GET /locations/search:**

| 参数      | 类型       | 必填 | 说明       |
| --------- | ---------- | ---- | ---------- |
| keyword   | String     | 是   | 搜索关键词 |
| latitude  | BigDecimal | 是   | 纬度       |
| longitude | BigDecimal | 是   | 经度       |

---

### 3.6 `/events` — 事件日志上报

| 方法 | 路径      | 说明             |
| ---- | --------- | ---------------- |
| POST | `/events` | 上报用户行为事件 |

**LoveEventReq:**

```json
{
  "type": "PAGE_VIEW",
  "detail": { "page": "/records" },
  "deviceType": "android",
  "pagePath": "/records",
  "occurredAt": "2026-05-15T10:30:00+08:00"
}
```

| 字段       | 类型   | 必填 | 说明                 |
| ---------- | ------ | ---- | -------------------- |
| type       | String | 是   | 事件类型             |
| detail     | Object | 否   | 事件详情             |
| deviceType | String | 否   | 设备类型             |
| pagePath   | String | 否   | 页面路径             |
| occurredAt | String | 否   | 事件时间（ISO 8601） |

---

### 3.7 `/options` — 字典选项

| 方法 | 路径               | 说明                             |
| ---- | ------------------ | -------------------------------- |
| GET  | `/options/records` | 获取记录表单选项（心情、类型等） |

**响应 `LoveOptionsVo`:**

```json
{
  "code": 200,
  "data": {
    "moods": [{ "label": "开心", "value": "happy" }],
    "recordTypes": [{ "label": "日常", "value": "daily" }],
    "anniversaryTypes": [{ "label": "日期", "value": "DATE" }]
  }
}
```

> 服务端缓存 30 分钟。

---

### 3.8 `/exports/memories` — 恋爱回忆导出

| 方法 | 路径                      | 说明               |
| ---- | ------------------------- | ------------------ |
| GET  | `/exports/memories/pdf`   | 导出 PDF（开发中） |
| GET  | `/exports/memories/image` | 导出图片（开发中） |

> ⚠️ 这两个接口目前返回占位数据，尚未实现完整导出逻辑。

---

### 3.9 Love 模块预留路径（暂无实现）

以下 Controller 已注册但无端点，仅供 MyBatis-Plus 代码生成参考：

| 路径                      | 说明               |
| ------------------------- | ------------------ |
| `/love/lrAppConfig`       | 应用签名配置（空） |
| `/love/lrDictType`        | 字典类型（空）     |
| `/love/lrLoveSpace`       | 恋爱空间（空）     |
| `/love/lrLoveSpaceMember` | 恋爱空间成员（空） |
| `/love/lrRecordDraft`     | 记录草稿（空）     |
| `/love/lrRecordMedia`     | 记录媒体关系（空） |
| `/love/lrSyncCursor`      | 增量同步游标（空） |

---

### 3.10 `/statistics` — 统计数据

| 方法 | 路径                         | 说明                                 |
| ---- | ---------------------------- | ------------------------------------ |
| GET  | `/statistics/memories`       | 统计概览（总天数/记录数/心情分布等） |
| GET  | `/statistics/calendar`       | 日历视图统计（按月聚合）             |
| GET  | `/statistics/memory-gallery` | 回忆画廊分页                         |

#### GET /statistics/memories — 统计概览

**Response `LoveStatisticsVo`:**

```json
{
  "code": 200,
  "data": {
    "totalLoveDays": 365,
    "longestStreak": 30,
    "recordCount": 128,
    "mediaCount": 256,
    "moodDistribution": [
      { "mood": "happy", "label": "开心", "icon": "😊", "count": 50 }
    ],
    "latestRecords": [],
    "latestMedia": []
  }
}
```

#### GET /statistics/calendar — 日历视图统计

**Query 参数：**

| 参数  | 类型    | 必填 | 说明        |
| ----- | ------- | ---- | ----------- |
| year  | Integer | 是   | 年份        |
| month | Integer | 是   | 月份 (1-12) |

**Response `LoveCalendarStatisticsVo`:**

```json
{
  "code": 200,
  "data": {
    "recordCountByDate": { "2026-05-15": 2, "2026-05-16": 1 },
    "highlightedDates": ["2026-05-15", "2026-05-16"],
    "streakDates": ["2026-05-15", "2026-05-16"],
    "anniversaryDates": ["2026-05-20"],
    "yearRecordCount": 48,
    "currentStreak": 5
  }
}
```

#### GET /statistics/memory-gallery — 回忆画廊分页

**Query 参数：**

| 参数    | 类型 | 默认值 | 说明                 |
| ------- | ---- | ------ | -------------------- |
| current | Long | 1      | 当前页               |
| size    | Long | 30     | 每页条数（最大 100） |

**Response `LoveMemoryGalleryPageVo`:**

```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": "1",
        "mediaType": "photo",
        "fileUrl": "/media/1/view",
        "thumbnailUrl": "/media/1/thumbnail",
        "recordId": "10",
        "recordDate": "2026-05-15"
      }
    ],
    "current": 1,
    "size": 30,
    "total": 100,
    "hasMore": true
  }
}
```

---

### 3.11 `/sync` — 增量同步

| 方法 | 路径              | 说明                             |
| ---- | ----------------- | -------------------------------- |
| GET  | `/sync/bootstrap` | 全量引导（首次同步拉取所有数据） |
| GET  | `/sync/changes`   | 增量拉取（基于版本号）           |
| POST | `/sync/push`      | 客户端推变更（离线编辑后同步）   |

#### GET /sync/bootstrap — 全量引导

**Response `LoveSyncBootstrapVo`:**

```json
{
  "code": 200,
  "data": {
    "records": [],
    "anniversaries": [],
    "media": [],
    "spaces": [],
    "serverTime": "2026-05-25T10:30:00",
    "latestChangeVersion": 42
  }
}
```

> 客户端首次启动或本地数据丢失时调用，拉取全量数据。

#### GET /sync/changes — 增量拉取

**Query 参数：**

| 参数         | 类型 | 默认值 | 说明                       |
| ------------ | ---- | ------ | -------------------------- |
| afterVersion | Long | 0      | 起始版本号（不包含此版本） |
| size         | Long | 100    | 每批条数（最大 500）       |

**Response `LoveSyncChangesVo`:**

```json
{
  "code": 200,
  "data": {
    "changes": [
      {
        "changeVersion": 43,
        "tableName": "lr_record",
        "bizId": 10,
        "bizNo": "REC1715702400000",
        "changeType": "update",
        "changedFields": ["recordDate", "text", "mood"],
        "snapshot": {},
        "sourceClientType": "android"
      }
    ],
    "latestChangeVersion": 50,
    "hasMore": true
  }
}
```

#### POST /sync/push — 客户端推变更

**Request Body `LoveSyncPushReq`:**

```json
{
  "records": [
    {
      "id": "10",
      "clientId": "local-uuid-1",
      "date": "2026-05-15",
      "text": "今天一起...",
      "mood": "happy",
      "location": { "name": "西湖", "latitude": 30.25, "longitude": 120.15 },
      "mediaIds": ["1", "2"],
      "version": 2
    }
  ],
  "anniversaries": [
    {
      "title": "纪念日",
      "anniversaryDate": "2020-05-20",
      "anniversaryType": "DATE",
      "repeatType": "YEARLY",
      "clientId": "local-uuid-2"
    }
  ],
  "deletedItems": [{ "tableName": "lr_record", "bizNo": "REC1715702400000" }]
}
```

**Response `LoveSyncPushVo`:**

```json
{
  "code": 200,
  "data": {
    "success": true,
    "conflicts": [],
    "latestChangeVersion": 55
  }
}
```

> 推送逻辑：通过 `id` 或 `clientId` 匹配已有记录，存在则更新，不存在则新增。

---

## 4. 系统公告模块 (Notice)

### 4.1 `/notice/sysNotice` — 公告 CRUD

| 方法   | 路径                              | 说明     |
| ------ | --------------------------------- | -------- |
| POST   | `/notice/sysNotice/page`          | 公告分页 |
| GET    | `/notice/sysNotice/{id}`          | 公告详情 |
| POST   | `/notice/sysNotice`               | 新增公告 |
| PUT    | `/notice/sysNotice`               | 修改公告 |
| DELETE | `/notice/sysNotice/{id}`          | 删除公告 |
| POST   | `/notice/sysNotice/{id}/publish`  | 发布公告 |
| POST   | `/notice/sysNotice/{id}/withdraw` | 撤回公告 |

**SysNoticeReq:**

| 字段             | 类型          | 说明                                 |
| ---------------- | ------------- | ------------------------------------ |
| title            | String        | 公告标题                             |
| content          | String        | 公告内容                             |
| noticeType       | Byte          | 类型：1=功能更新, 2=系统公告         |
| priority         | Integer       | 优先级：4=信息/5=普通/7=警告/9=紧急  |
| platformMask     | Integer       | 平台位掩码 (1=Web, 2=Android, 4=iOS) |
| minVersion       | String        | 最低可见版本                         |
| publishTime      | LocalDateTime | 发布时间                             |
| offlineTime      | LocalDateTime | 下线时间                             |
| operator         | String        | 操作人                               |
| status           | Byte          | 状态：0=草稿/1=已发布/2=已撤回       |
| filterNoticeType | Integer       | 查询过滤-公告类型                    |
| keyword          | String        | 查询过滤-关键词                      |

**POST /notice/sysNotice/{id}/publish — 发布公告:**

| 参数     | 类型   | 必填 | 说明                 |
| -------- | ------ | ---- | -------------------- |
| operator | String | 否   | 操作人（Query 参数） |

**POST /notice/sysNotice/{id}/withdraw — 撤回公告:**

| 参数     | 类型   | 必填 | 说明                 |
| -------- | ------ | ---- | -------------------- |
| operator | String | 否   | 操作人（Query 参数） |

---

### 4.2 `/notice/userNoticeRead` — 用户已读

| 方法 | 路径                                     | 说明             |
| ---- | ---------------------------------------- | ---------------- |
| POST | `/notice/userNoticeRead/{noticeId}/mark` | 标记单个公告已读 |
| POST | `/notice/userNoticeRead/batch-mark`      | 批量标记已读     |
| POST | `/notice/userNoticeRead/mark-all`        | 一键全部已读     |
| GET  | `/notice/userNoticeRead/unread-count`    | 获取未读数       |

**必填请求头：**

| Header           | 必填 | 说明                          |
| ---------------- | ---- | ----------------------------- |
| X-User-Id        | 是   | 用户 ID                       |
| X-Client-Type    | 否   | 客户端类型（web/android/ios） |
| X-Client-Version | 否   | 客户端版本                    |

**POST /notice/userNoticeRead/batch-mark:**

- Body: `[1, 2, 3]`（公告 ID 列表，可选）

**POST /notice/userNoticeRead/mark-all — 一键全部已读:**

- 无请求体
- 需携带 `X-User-Id`、`X-Client-Type`（可选）、`X-Client-Version`（可选）
- 返回: `Result<Integer>`（标记已读的公告数量）

```json
{
  "code": 200,
  "data": 5,
  "msg": "操作成功",
  "success": true
}
```

> 仅标记当前用户在该平台/版本下可见且未读的公告。

**GET /notice/userNoticeRead/unread-count:**

- 支持 `X-Client-Type` 和 `X-Client-Version` 按平台/版本过滤

---

### 4.3 `/notice/sysNoticeLog` — 公告操作日志

| 方法 | 路径                   | 说明               |
| ---- | ---------------------- | ------------------ |
| —    | `/notice/sysNoticeLog` | 预留路径，暂无实现 |

---

## 5. 系统模块 (System)

### 5.1 `/system-configs` — 系统配置管理

| 方法   | 路径                          | 说明         |
| ------ | ----------------------------- | ------------ |
| POST   | `/system-configs/page`        | 配置分页     |
| GET    | `/system-configs/{configKey}` | 按 key 查询  |
| GET    | `/system-configs/detail/{id}` | 按 ID 查详情 |
| GET    | `/system-configs/options`     | 配置下拉选项 |
| POST   | `/system-configs/add`         | 新增配置     |
| POST   | `/system-configs/update`      | 更新配置     |
| DELETE | `/system-configs/{id}`        | 删除配置     |

**SystemConfigReq:**

| 字段        | 类型    | 说明           |
| ----------- | ------- | -------------- |
| id          | Long    | ID（更新必填） |
| configKey   | String  | 配置键         |
| configValue | String  | 配置值         |
| description | String  | 说明           |
| status      | Integer | 状态 (1=启用)  |

---

### 5.2 框架扩展接口 (Framework Extension)

| 方法 | 路径                    | 缓存    | 说明                      |
| ---- | ----------------------- | ------- | ------------------------- |
| GET  | `/workbench/summary`    | 5 分钟  | 工作台概览                |
| GET  | `/workbench/trends`     | 10 分钟 | 工作台趋势（`?range=7d`） |
| GET  | `/workbench/todos`      | 3 分钟  | 工作台待办                |
| GET  | `/workbench/activities` | 3 分钟  | 工作台最近动态            |
| GET  | `/notifications/panel`  | —       | 顶部通知面板              |

**GET /workbench/trends 参数:**

| 参数  | 类型   | 默认值 | 说明     |
| ----- | ------ | ------ | -------- |
| range | String | `7d`   | 时间范围 |

**GET /notifications/panel 请求头：**

| Header           | 必填 | 说明                         |
| ---------------- | ---- | ---------------------------- |
| X-User-Id        | 否   | 用户 ID（回填已读状态）      |
| X-Client-Type    | 否   | 客户端类型（按平台过滤公告） |
| X-Client-Version | 否   | 客户端版本                   |

---

## 6. 邮件模块 (Mail)

### 6.1 `/mail-recipients` — 邮件接收人管理

| 方法   | 路径                      | 说明       |
| ------ | ------------------------- | ---------- |
| POST   | `/mail-recipients/page`   | 接收人分页 |
| POST   | `/mail-recipients/add`    | 添加接收人 |
| POST   | `/mail-recipients/update` | 更新接收人 |
| DELETE | `/mail-recipients/{id}`   | 删除接收人 |

**MailRecipientReq:**

| 字段        | 类型           | 说明                                        |
| ----------- | -------------- | ------------------------------------------- |
| id          | Long           | ID（更新必填）                              |
| name        | String         | 姓名                                        |
| email       | String         | 邮箱地址                                    |
| type        | String         | 类型：TO / CC / BCC                         |
| groupCode   | String         | 分组编码                                    |
| priority    | Integer        | 优先级                                      |
| enabled     | Boolean        | 是否启用（新增默认 true）                   |
| remark      | String         | 备注                                        |
| requestTime | List\<String\> | 查询时间范围 `["2026-05-01", "2026-05-15"]` |

---

### 6.2 `/mail-recipient-users` — 邮件用户配置

| 方法 | 路径                           | 说明                 |
| ---- | ------------------------------ | -------------------- |
| POST | `/mail-recipient-users/list`   | 获取邮件用户配置列表 |
| POST | `/mail-recipient-users/update` | 更新邮件用户配置     |

**POST /mail-recipient-users/list:**

| 字段        | 类型    | 说明                 |
| ----------- | ------- | -------------------- |
| mailId      | Integer | 邮件 ID（精确匹配）  |
| userId      | Integer | 用户 ID（模糊匹配）  |
| receiveType | String  | 接收类型（模糊匹配） |

**POST /mail-recipient-users/update:**

| 字段        | 类型            | 必填 | 说明         |
| ----------- | --------------- | ---- | ------------ |
| mailId      | Integer         | 是   | 邮件 ID      |
| userIds     | List\<Integer\> | 是   | 用户 ID 列表 |
| receiveType | String          | 否   | 接收类型     |
| remark      | String          | 否   | 备注         |

> 更新逻辑：先逻辑删除该邮件下所有用户，再按 userIds 恢复/新增。

---

### 6.3 `/mail-send-records` — 发送记录

| 方法 | 路径                      | 说明         |
| ---- | ------------------------- | ------------ |
| POST | `/mail-send-records/page` | 发送记录分页 |

**MailSendRecordReq:**

| 字段        | 类型           | 说明                                    |
| ----------- | -------------- | --------------------------------------- |
| status      | Integer        | 发送状态（精确匹配）                    |
| subject     | String         | 主题（模糊匹配）                        |
| type        | String         | 类型（精确匹配）                        |
| recipient   | String         | 收件人（模糊匹配）                      |
| requestTime | List\<String\> | 时间范围 `["2026-05-01", "2026-05-15"]` |

---

## 7. 日志模块 (Log)

### 7.1 `/access-logs` — 访问日志

| 方法   | 路径                          | 说明                     |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/access-logs/page`           | 日志分页                 |
| GET    | `/access-logs/list`           | 日志列表（最近 1000 条） |
| GET    | `/access-logs/filter-options` | 获取筛选下拉选项         |
| GET    | `/access-logs/{id}`           | 日志详情                 |
| DELETE | `/access-logs/{id}`           | 删除单条                 |
| DELETE | `/access-logs`                | 批量删除                 |
| POST   | `/access-logs/export-excel`   | 导出 Excel               |

**AccessLogPageReq:**

| 字段        | 类型           | 说明                                    |
| ----------- | -------------- | --------------------------------------- |
| module      | String         | 模块名（模糊匹配）                      |
| method      | String         | HTTP 方法（模糊匹配）                   |
| uri         | String         | 请求 URI（模糊匹配）                    |
| ipLocation  | String         | IP 归属地（模糊匹配）                   |
| browserType | String         | 浏览器类型（精确匹配）                  |
| description | String         | 操作描述（模糊匹配）                    |
| success     | String         | 是否成功（"true"/"false"，精确匹配）    |
| requestTime | List\<String\> | 时间范围 `["2026-05-01", "2026-05-15"]` |

**DELETE /access-logs 批量删除:**

```json
{ "ids": ["1", "2", "3"] }
```

**GET /access-logs/filter-options — 响应：**

```json
{
  "code": 200,
  "data": {
    "modules": ["系统管理", "用户模块", "日志模块"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "ipLocations": ["广东省广州市", "北京市朝阳区"],
    "browserTypes": ["Chrome", "Firefox", "Safari", "Edge"]
  }
}
```

---

### 7.2 `/access-logs-detail` — 访问日志详情

| 方法 | 路径                       | 说明                                        |
| ---- | -------------------------- | ------------------------------------------- |
| GET  | `/access-logs-detail/{id}` | 获取日志完整详情（含请求/响应体、异常堆栈） |

---

### 7.3 `/task-logs` — 任务日志

| 方法 | 路径                        | 说明             |
| ---- | --------------------------- | ---------------- |
| POST | `/task-logs/page`           | 日志分页         |
| GET  | `/task-logs/filter-options` | 获取筛选下拉选项 |

**TaskLogPageReq:**

| 字段        | 类型           | 说明                                    |
| ----------- | -------------- | --------------------------------------- |
| taskName    | String         | 任务名称（模糊匹配）                    |
| classMethod | String         | 类方法（精确匹配）                      |
| success     | String         | 是否成功（"true"/"false"，精确匹配）    |
| requestTime | List\<String\> | 时间范围 `["2026-05-01", "2026-05-15"]` |

**GET /task-logs/filter-options — 响应：**

```json
{
  "code": 200,
  "data": {
    "taskNames": ["数据同步任务", "报表生成", "定时清理"],
    "classMethods": ["com.xxx.service.SyncService.execute"]
  }
}
```

---

## 8. AI 模块

### 8.1 `/ai/aiCallRecord` — AI 调用记录

| 方法 | 路径                    | 说明            |
| ---- | ----------------------- | --------------- |
| POST | `/ai/aiCallRecord/page` | AI 调用记录分页 |
| GET  | `/ai/aiCallRecord/{id}` | AI 调用记录详情 |

**AiCallRecordPageReq（POST Body，可选）:**

继承 `PageRequest`，暂无额外过滤参数。

---

## 9. 微信公众号模块

### 9.1 `/we-chat` — 微信公众号回调

| 方法 | 路径       | 说明                  |
| ---- | ---------- | --------------------- |
| GET  | `/we-chat` | 微信服务器 Token 验证 |
| POST | `/we-chat` | 接收/回复微信消息     |

> ⚠️ 此为微信服务端回调接口，由微信服务器主动调用，**非前端直接调用**。

**关键词路由规则（POST 接收消息）：**

| 关键词             | 回复内容                  |
| ------------------ | ------------------------- |
| 包含"唐诗"         | 随机唐诗                  |
| 包含"宋诗"         | 随机宋诗                  |
| 包含"宋词"         | 随机宋词                  |
| RANDOM_POETRY 事件 | 随机唐诗或宋词            |
| 其他               | AI 异步回复（星火大模型） |

---

### 9.2 内容数据导入接口

> ⚠️ 以下接口为**数据导入工具**，非前端查询 API，仅供运维/开发使用。

| 模块   | 路径              | 方法 | 说明           |
| ------ | ----------------- | ---- | -------------- |
| 作者   | `/author`         | GET  | 导入作者数据   |
| 唐诗   | `/poet`           | GET  | 导入唐诗数据   |
| 宋词   | `/ci`             | GET  | 导入宋词数据   |
| 古诗词 | `/gushici/import` | ALL  | 导入古诗词数据 |
| 名言   | `/mingyan/import` | ALL  | 导入名言数据   |
| 元曲   | `/qu/import`      | GET  | 导入元曲数据   |

---

## 10. 测试/调试接口

> ⚠️ **仅限开发环境使用，生产环境应禁用。** 建议添加 `@Profile("dev")` 限制。

### 10.1 `/test` — 测试接口

| 方法 | 路径                            | 说明                   |
| ---- | ------------------------------- | ---------------------- |
| GET  | `/test/analysis`                | AI 分析成绩数据        |
| GET  | `/test/summary`                 | AI 总结成绩数据        |
| GET  | `/test/rewardSummary`           | 触发奖励总结任务       |
| GET  | `/test/birthdayTask`            | 触发生日邮件任务       |
| GET  | `/test/testGaodeIpService`      | 测试高德 IP 定位       |
| GET  | `/test/testIpLocationProviders` | 测试所有 IP 定位服务商 |

**GET /test/analysis 参数:**

| 参数     | 类型       | 必填 | 说明         |
| -------- | ---------- | ---- | ------------ |
| id       | Long       | 否   | 成绩记录 ID  |
| provider | AiProvider | 否   | 指定 AI 模型 |

**GET /test/testIpLocationProviders 参数:**

| 参数     | 类型   | 必填 | 说明                           |
| -------- | ------ | ---- | ------------------------------ |
| ip       | String | 否   | 测试 IP（默认 220.196.160.75） |
| provider | String | 否   | 指定服务商名称                 |

---

## 附录 A：通用请求头

| Header           | 必填            | 说明                          | 使用场景             |
| ---------------- | --------------- | ----------------------------- | -------------------- |
| X-Token          | 登录接口必填    | 登录 Token                    | 认证接口（/auth/\*） |
| X-User-Id        | 视接口          | 用户 ID                       | 已读状态、用户标识   |
| X-Client-Type    | 否              | 客户端类型（web/android/ios） | 平台过滤             |
| X-Client-Version | 否              | 客户端版本                    | 版本过滤             |
| X-App-Id         | @Encrypted 必填 | 应用标识                      | 签名校验             |
| X-Timestamp      | @Encrypted 必填 | 毫秒时间戳                    | 防重放               |
| X-Signature      | @Encrypted 必填 | HMAC 签名                     | 防篡改               |

---

## 附录 B：错误码约定

| code 范围 | 含义                          |
| --------- | ----------------------------- |
| 200~299   | 成功                          |
| 400       | 请求参数错误                  |
| 401       | 未授权（签名校验失败）        |
| 403       | 禁止访问（请求过期/签名非法） |
| 404       | 资源不存在                    |
| 405       | 请求方法不支持                |
| 429       | 限流                          |
| 500       | 系统内部错误                  |

> 全局异常处理器会自动将异常转换为 `Result<Void>` 结构，前端只需判断 `success` 字段即可。

---

## 附录 C：与旧版文档的差异说明

| 项            | 旧版                     | 现版                              | 说明                                                           |
| ------------- | ------------------------ | --------------------------------- | -------------------------------------------------------------- |
| 基准路径      | `/api`                   | 无前缀                            | 项目未配置 `server.servlet.context-path`，所有路径直接从根开始 |
| 内容查询      | `/api/authors/page/list` | `/author`（导入接口）             | 内容 Controller 实际是数据导入工具，非分页查询 API             |
| 认证模块      | 未收录                   | `/auth`                           | 新增：登录/登出/获取用户/修改密码                              |
| 零花钱规则    | 未收录                   | `/reward-pocket-money-rules`      | 新增模块                                                       |
| 邮件用户配置  | 未收录                   | `/mail-recipient-users`           | 新增模块                                                       |
| 纪念日        | 未收录                   | `/anniversaries`                  | 新增模块                                                       |
| 地点服务      | 未收录                   | `/locations`                      | 新增模块                                                       |
| 事件上报      | 未收录                   | `/events`                         | 新增模块                                                       |
| 字典选项      | 未收录                   | `/options`                        | 新增模块                                                       |
| 回忆导出      | 未收录                   | `/exports/memories`               | 新增模块（开发中）                                             |
| 统计概览      | 未收录                   | `/statistics/memories`            | 新增：总天数/记录数/心情分布                                   |
| 日历统计      | 未收录                   | `/statistics/calendar`            | 新增：按月聚合记录数/纪念日标记                                |
| 回忆画廊      | 未收录                   | `/statistics/memory-gallery`      | 新增：时间线+媒体瀑布流                                        |
| 增量同步      | 未收录                   | `/sync`                           | 新增：全量引导/增量拉取/推变更                                 |
| 媒体删除      | 未收录                   | `DELETE /media/{id}`              | 新增：删除单个媒体                                             |
| 公告全部已读  | 未收录                   | `/notice/userNoticeRead/mark-all` | 新增：一键标记所有公告已读                                     |
| 奖励结果对比  | 未收录                   | `/reward/compare`                 | 新增：最近两次计算结果对比                                     |
| Love 预留路径 | 未收录                   | `/love/lr*`                       | 空壳 Controller                                                |
| 公告日志      | 未收录                   | `/notice/sysNoticeLog`            | 空壳 Controller                                                |
