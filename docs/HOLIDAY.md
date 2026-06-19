# 节假日配置

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含节假日配置的增删改查接口，以及节假日收件人关联管理接口。

---

## 接口概览

### 节假日配置管理

| 场景           | 方法   | 路径                        |
| -------------- | ------ | --------------------------- |
| 分页查询       | POST   | `/sys-holidays/page`        |
| 按 id 获取详情 | GET    | `/sys-holidays/detail/{id}` |
| 获取表单选项   | GET    | `/sys-holidays/options`     |
| 新增配置       | POST   | `/sys-holidays/add`         |
| 修改配置       | POST   | `/sys-holidays/update`      |
| 删除配置       | DELETE | `/sys-holidays/{id}`        |

### 节假日收件人关联管理

| 场景         | 方法 | 路径                             |
| ------------ | ---- | -------------------------------- |
| 查询关联列表 | POST | `/sys-holiday-recipients/list`   |
| 批量更新关联 | POST | `/sys-holiday-recipients/update` |

推荐前端页面使用方式：

1. 列表页：`POST /sys-holidays/page`
2. 新增/编辑弹窗初始化：`GET /sys-holidays/options`
3. 编辑弹窗详情：优先使用列表行数据；如需重新拉取详情，使用 `GET /sys-holidays/detail/{id}`
4. 新增提交：`POST /sys-holidays/add`
5. 编辑提交：`POST /sys-holidays/update`
6. 删除：`DELETE /sys-holidays/{id}`

## 3. 数据结构

### 3.1 SysHolidayConfig

```json
{
  "id": 1,
  "holidayName": "春节",
  "holidayDate": "2024-02-10",
  "lunarMonth": 1,
  "lunarDay": 1,
  "holidayType": "法定节假日",
  "status": 1,
  "sortOrder": 1,
  "description": "农历新年",
  "createdTime": "2026-04-22T21:00:00",
  "updatedTime": "2026-04-22T21:10:00",
  "deleted": 0
}
```

字段说明：

| 字段        | 类型   | 说明                         |
| ----------- | ------ | ---------------------------- |
| id          | number | 主键 id                      |
| holidayName | string | 节假日名称                   |
| holidayDate | string | 节假日日期（公历）           |
| lunarMonth  | number | 农历月份                     |
| lunarDay    | number | 农历日期                     |
| holidayType | string | 节假日类型                   |
| status      | number | `1=启用`，`0=禁用`           |
| sortOrder   | number | 排序                         |
| description | string | 描述                         |
| createdTime | string | 创建时间                     |
| updatedTime | string | 更新时间                     |
| deleted     | number | 逻辑删除标记，正常一般为 `0` |

### 3.2 分页请求体 SysHolidayConfigReq

`SysHolidayConfigReq` 继承 `PageRequest`，支持字段：

```json
{
  "current": 1,
  "size": 10,
  "id": 1,
  "holidayName": "春节",
  "holidayDate": "2024-02-10",
  "lunarMonth": 1,
  "lunarDay": 1,
  "holidayType": "法定节假日",
  "status": 1,
  "sortOrder": 1,
  "description": ""
}
```

说明：

- `current` 默认值 `1`
- `size` 默认值 `10`
- 分页接口实际筛选字段为：`holidayName`、`holidayDate`、`lunarMonth`、`lunarDay`、`holidayType`、`status`

### 3.3 TypeScript 类型建议

```ts
export interface SysHolidayConfig {
  id: number;
  holidayName: string;
  holidayDate: string;
  lunarMonth: number;
  lunarDay: number;
  holidayType: string;
  status: 0 | 1;
  sortOrder: number;
  description: string;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

export interface SysHolidayConfigPageReq {
  current: number;
  size: number;
  holidayName?: string;
  holidayDate?: string;
  lunarMonth?: number;
  lunarDay?: number;
  holidayType?: string;
  status?: 0 | 1;
  sortOrder?: number;
  description?: string;
}

export interface OptionItem<T = string | number> {
  label: string;
  value: T;
}
```

## 4. 接口详情

### 4.1 分页查询节假日配置

```text
POST /sys-holidays/page
```

请求体：

```json
{
  "current": 1,
  "size": 10,
  "holidayName": "春节",
  "holidayType": "法定节假日",
  "status": 1
}
```

筛选规则：

- `holidayName`：模糊匹配
- `holidayDate`：精确匹配
- `lunarMonth`：精确匹配
- `lunarDay`：精确匹配
- `holidayType`：精确匹配
- `status`：精确匹配

排序规则：

- `sortOrder` 升序
- `createdTime` 降序

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "holidayName": "春节",
        "holidayDate": "2024-02-10",
        "lunarMonth": 1,
        "lunarDay": 1,
        "holidayType": "法定节假日",
        "status": 1,
        "sortOrder": 1,
        "description": "农历新年",
        "createdTime": "2026-04-22T21:00:00",
        "updatedTime": "2026-04-22T21:10:00",
        "deleted": 0
      }
    ],
    "total": 1,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

前端说明：

- 列表页直接用这个接口
- 编辑弹窗如果列表行里已经有完整数据，可以不再额外拉详情

### 4.2 按 id 获取节假日配置详情

```text
GET /sys-holidays/detail/{id}
```

示例：

```text
GET /sys-holidays/detail/1
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "holidayName": "春节",
    "holidayDate": "2024-02-10",
    "lunarMonth": 1,
    "lunarDay": 1,
    "holidayType": "法定节假日",
    "status": 1,
    "sortOrder": 1,
    "description": "农历新年",
    "createdTime": "2026-04-22T21:00:00",
    "updatedTime": "2026-04-22T21:10:00",
    "deleted": 0
  }
}
```

失败响应：

```json
{
  "code": 404,
  "msg": "holiday config not found",
  "data": null
}
```

前端说明：

- 后台配置管理页详情、编辑弹窗详情优先使用这个接口
- 这个接口不会因为 `status=0` 而查不到

### 4.3 获取表单选项

```text
GET /sys-holidays/options
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "holidayTypes": [
      { "label": "法定节假日", "value": "法定节假日" },
      { "label": "传统节日", "value": "传统节日" },
      { "label": "纪念日", "value": "纪念日" },
      { "label": "其他", "value": "其他" }
    ],
    "statusOptions": [
      { "label": "启用", "value": 1 },
      { "label": "禁用", "value": 0 }
    ]
  }
}
```

前端说明：

- `holidayTypes`：新增/编辑表单里的节假日类型下拉
- `statusOptions`：状态单选/开关

### 4.4 新增节假日配置

```text
POST /sys-holidays/add
```

请求体：

```json
{
  "holidayName": "春节",
  "holidayDate": "2024-02-10",
  "lunarMonth": 1,
  "lunarDay": 1,
  "holidayType": "法定节假日",
  "status": 1,
  "sortOrder": 1,
  "description": "农历新年"
}
```

字段规则：

- `holidayName`：必填
- `holidayDate`：选填（公历日期）
- `lunarMonth`：选填（农历月份）
- `lunarDay`：选填（农历日期）
- `holidayType`：必填
- `status`：选填，不传默认 `1`
- `sortOrder`：选填，不传默认 `0`
- `description`：选填

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "holidayName": "春节",
    "holidayDate": "2024-02-10",
    "lunarMonth": 1,
    "lunarDay": 1,
    "holidayType": "法定节假日",
    "status": 1,
    "sortOrder": 1,
    "description": "农历新年",
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:00:00",
    "deleted": 0
  }
}
```

失败响应：

1. `holidayName` 为空：

```json
{
  "code": 400,
  "msg": "holidayName is required",
  "data": null
}
```

2. `holidayType` 为空：

```json
{
  "code": 400,
  "msg": "holidayType is required",
  "data": null
}
```

前端说明：

- `holidayDate` 和 `lunarMonth`/`lunarDay` 至少填一个
- 提交新增成功后建议刷新 `page` 和 `options`

### 4.5 修改节假日配置

```text
POST /sys-holidays/update
```

请求体：

```json
{
  "id": 1,
  "holidayName": "春节",
  "holidayDate": "2024-02-10",
  "lunarMonth": 1,
  "lunarDay": 1,
  "holidayType": "法定节假日",
  "status": 1,
  "sortOrder": 1,
  "description": "农历新年（已更新）"
}
```

必填字段：

- `id`

失败响应：

1. `id` 缺失：

```json
{
  "code": 400,
  "msg": "id is required",
  "data": null
}
```

2. 配置不存在：

```json
{
  "code": 404,
  "msg": "holiday config not found",
  "data": null
}
```

更新语义：

| 字段        | 更新规则                                           |
| ----------- | -------------------------------------------------- |
| id          | 必填                                               |
| holidayName | 只有“非空字符串”才会更新                           |
| holidayDate | 字段不为 `null` 就会更新                           |
| lunarMonth  | 传了就更新，不传保持原值                           |
| lunarDay    | 传了就更新，不传保持原值                           |
| holidayType | 只有“非空字符串”才会更新                           |
| status      | 传了就更新，不传保持原值                           |
| sortOrder   | 传了就更新，不传保持原值                           |
| description | 字段不为 `null` 就会更新，传空字符串 `""` 也会覆盖 |

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "holidayName": "春节",
    "holidayDate": "2024-02-10",
    "lunarMonth": 1,
    "lunarDay": 1,
    "holidayType": "法定节假日",
    "status": 1,
    "sortOrder": 1,
    "description": "农历新年（已更新）",
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:10:00",
    "deleted": 0
  }
}
```

### 4.6 删除节假日配置

```text
DELETE /sys-holidays/{id}
```

示例：

```text
DELETE /sys-holidays/1
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "holidayName": "春节",
    "holidayDate": "2024-02-10",
    "lunarMonth": 1,
    "lunarDay": 1,
    "holidayType": "法定节假日",
    "status": 1,
    "sortOrder": 1,
    "description": "农历新年",
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:10:00",
    "deleted": 1
  }
}
```

失败响应：

```json
{
  "code": 404,
  "msg": "holiday config not found",
  "data": null
}
```

说明：

- 当前为逻辑删除

## 5. 前端表单与列表规范建议

### 5.1 列表查询条件建议

建议筛选项：

- `holidayName`
- `holidayType`
- `status`

### 5.2 新增/编辑表单建议

| 字段        | 组件建议           |
| ----------- | ------------------ |
| holidayName | Input              |
| holidayDate | DatePicker         |
| lunarMonth  | InputNumber (1-12) |
| lunarDay    | InputNumber (1-30) |
| holidayType | Select             |
| status      | Radio / Switch     |
| sortOrder   | InputNumber        |
| description | Input / Textarea   |

### 5.3 前端校验建议

新增/编辑前建议做这些校验：

- `holidayName` 必填
- `holidayName` 长度建议不超过 64
- `holidayType` 必填
- `lunarMonth` 范围 1-12
- `lunarDay` 范围 1-30
- `status` 只能是 `0/1`
- `sortOrder` 非负整数

## 6. 推荐前端 API 封装

```ts
export const holidayConfigApi = {
  page: (data: SysHolidayConfigPageReq) =>
    request.post("/sys-holidays/page", data),
  detail: (id: number) => request.get(`/sys-holidays/detail/${id}`),
  options: () => request.get("/sys-holidays/options"),
  add: (data: Partial<SysHolidayConfig>) =>
    request.post("/sys-holidays/add", data),
  update: (data: Partial<SysHolidayConfig> & { id: number }) =>
    request.post("/sys-holidays/update", data),
  remove: (id: number) => request.delete(`/sys-holidays/${id}`)
};
```

## 7. 联调注意事项

1. 后台管理页详情查询，请优先使用 `GET /sys-holidays/detail/{id}`
2. `holidayDate` 和 `lunarMonth`/`lunarDay` 是两套日期体系，前端至少填一个
3. 新增、修改、删除后，建议刷新：
   - 当前列表
   - `GET /sys-holidays/options`
4. 删除为逻辑删除，删除后数据仍存在于数据库

---

## 8. 节假日收件人关联管理

### 8.1 功能说明

某些特殊节日（如母亲节、父亲节）只希望发送给特定用户，而不是所有人。通过节假日收件人关联功能，可以为每个节假日配置指定的收件人。

- **未配置关联**的节假日：发送给所有收件人（保持原有逻辑）
- **已配置关联**的节假日：只发送给指定的收件人

### 8.2 数据结构

#### SysHolidayRecipient

```json
{
  "id": 1,
  "holidayId": 1,
  "recipientId": 5,
  "remark": "仅发送给核心成员",
  "createdTime": "2026-06-19T10:00:00",
  "updatedTime": "2026-06-19T10:00:00",
  "deleted": 0
}
```

| 字段        | 类型   | 说明                                     |
| ----------- | ------ | ---------------------------------------- |
| id          | number | 主键 id                                  |
| holidayId   | number | 关联的节假日配置ID                       |
| recipientId | number | 关联的收件人ID（来自 mail_recipient 表） |
| remark      | string | 备注                                     |
| createdTime | string | 创建时间                                 |
| updatedTime | string | 更新时间                                 |
| deleted     | number | 逻辑删除标记                             |

#### 请求体 SysHolidayRecipientReq

```json
{
  "holidayId": 1,
  "recipientIds": [1, 3, 5],
  "remark": "仅发送给核心成员"
}
```

### 8.3 TypeScript 类型建议

```ts
export interface SysHolidayRecipient {
  id: number;
  holidayId: number;
  recipientId: number;
  remark: string;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

export interface SysHolidayRecipientReq {
  holidayId: number;
  recipientIds?: number[];
  remark?: string;
}
```

### 8.4 接口详情

#### 查询节假日收件人关联列表

```text
POST /sys-holiday-recipients/list
```

请求体：

```json
{
  "holidayId": 1
}
```

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": [
    {
      "id": 1,
      "holidayId": 1,
      "recipientId": 5,
      "remark": "仅发送给核心成员",
      "createdTime": "2026-06-19T10:00:00",
      "updatedTime": "2026-06-19T10:00:00",
      "deleted": 0
    }
  ]
}
```

#### 批量更新节假日收件人关联

```text
POST /sys-holiday-recipients/update
```

请求体：

```json
{
  "holidayId": 1,
  "recipientIds": [1, 3, 5],
  "remark": "仅发送给核心成员"
}
```

更新逻辑：

1. 先逻辑删除该节假日下的所有关联
2. 恢复已存在的关联 / 新增不存在的关联
3. `recipientIds` 传空数组 `[]` 表示清除所有关联（恢复为发送给所有人）

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": null
}
```

失败响应：

```json
{
  "code": 50,
  "msg": "节假日ID不能为空！",
  "data": null
}
```

### 8.5 推荐前端 API 封装

```ts
export const holidayRecipientApi = {
  list: (holidayId: number) =>
    request.post("/sys-holiday-recipients/list", { holidayId }),
  update: (data: SysHolidayRecipientReq) =>
    request.post("/sys-holiday-recipients/update", data)
};
```

### 8.6 前端使用建议

在节假日配置的**编辑弹窗**中，增加「指定收件人」选择组件：

1. 打开编辑弹窗时，调用 `holidayRecipientApi.list(holidayId)` 加载已配置的收件人
2. 使用 `el-transfer` 或 `el-select` 多选组件展示收件人列表（数据源来自 `mail-recipients/page` 接口）
3. 提交编辑时，同时调用 `holidayRecipientApi.update()` 更新关联关系
4. 清空选择（`recipientIds` 传 `[]`）表示该节假日发送给所有人

**UI 提示建议：**

- 未选择收件人时显示提示：「未指定收件人，将发送给所有用户」
- 已选择收件人时显示：「仅发送给 N 位指定收件人」
