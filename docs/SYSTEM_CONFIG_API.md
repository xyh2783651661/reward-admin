# System Config 前端联调文档

本文档基于当前后端实际实现整理，供前端开发系统配置管理页面使用。

对应后端文件：

- [SystemConfigController.java](D:/Users/xyh/IdeaProjects/we-chat/src/main/java/org/xyh/modules/system/interfaces/controller/SystemConfigController.java)

## 1. 接口概览

系统配置管理当前可用接口：

| 场景                | 方法   | 路径                          |
| ------------------- | ------ | ----------------------------- |
| 分页查询            | POST   | `/system-configs/page`        |
| 按 key 获取生效配置 | GET    | `/system-configs/{configKey}` |
| 按 id 获取详情      | GET    | `/system-configs/detail/{id}` |
| 获取表单选项        | GET    | `/system-configs/options`     |
| 新增配置            | POST   | `/system-configs/add`         |
| 修改配置            | POST   | `/system-configs/update`      |
| 删除配置            | DELETE | `/system-configs/{id}`        |

推荐前端页面使用方式：

1. 列表页：`POST /system-configs/page`
2. 新增/编辑弹窗初始化：`GET /system-configs/options`
3. 编辑弹窗详情：优先使用列表行数据；如需重新拉取详情，使用 `GET /system-configs/detail/{id}`
4. 新增提交：`POST /system-configs/add`
5. 编辑提交：`POST /system-configs/update`
6. 删除：`DELETE /system-configs/{id}`

## 2. 通用约定

### 2.1 Base URL

当前 Controller 没有统一 `/api` 前缀，实际路径为：

```text
/system-configs
```

如果前端代理或网关加了 `/api`，则以前端实际代理路径为准，例如：

```text
/api/system-configs
```

### 2.2 请求头

JSON 接口统一：

```text
Content-Type: application/json
```

### 2.3 通用响应结构

项目统一返回 `Result<T>`：

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

失败示例：

```json
{
  "code": 400,
  "msg": "configKey is required",
  "data": null
}
```

前端建议统一在响应拦截器里读取：

```ts
const result = response.data;
const data = result.data;
```

## 3. 数据结构

### 3.1 SystemConfig

```json
{
  "id": 1,
  "configKey": "geo.ip.tencent.key",
  "configValue": "YLKBZ-BEPY7-BXHXM-PZZD4-FUCTV-MAFJA",
  "configGroup": "geo",
  "valueType": "string",
  "description": "腾讯地图 IP 定位 key",
  "status": 1,
  "sensitive": 1,
  "createdTime": "2026-04-22T21:00:00",
  "updatedTime": "2026-04-22T21:10:00",
  "deleted": 0
}
```

字段说明：

| 字段        | 类型   | 说明                                                     |
| ----------- | ------ | -------------------------------------------------------- |
| id          | number | 主键 id                                                  |
| configKey   | string | 配置 key，唯一                                           |
| configValue | string | 配置值，统一按字符串保存                                 |
| configGroup | string | 配置分组                                                 |
| valueType   | string | 值类型：`string` / `int` / `double` / `boolean` / `json` |
| description | string | 配置说明                                                 |
| status      | number | `1=启用`，`0=禁用`                                       |
| sensitive   | number | `1=敏感`，`0=普通`                                       |
| createdTime | string | 创建时间                                                 |
| updatedTime | string | 更新时间                                                 |
| deleted     | number | 逻辑删除标记，正常一般为 `0`                             |

### 3.2 分页请求体 SystemConfigReq

`SystemConfigReq` 继承 `PageRequest`，支持字段：

```json
{
  "current": 1,
  "size": 10,
  "id": 1,
  "configKey": "geo.ip",
  "configValue": "",
  "configGroup": "geo",
  "valueType": "string",
  "description": "",
  "status": 1,
  "sensitive": 0
}
```

说明：

- `current` 默认值 `1`
- `size` 默认值 `10`
- 分页接口实际筛选字段为：`configKey`、`configGroup`、`valueType`、`status`、`sensitive`

### 3.3 TypeScript 类型建议

```ts
export interface SystemConfig {
  id: number;
  configKey: string;
  configValue: string;
  configGroup: string;
  valueType: "string" | "int" | "double" | "boolean" | "json";
  description: string;
  status: 0 | 1;
  sensitive: 0 | 1;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

export interface SystemConfigPageReq {
  current: number;
  size: number;
  configKey?: string;
  configGroup?: string;
  valueType?: "string" | "int" | "double" | "boolean" | "json";
  status?: 0 | 1;
  sensitive?: 0 | 1;
}

export interface OptionItem<T = string | number> {
  label: string;
  value: T;
}
```

## 4. 接口详情

### 4.1 分页查询配置

```text
POST /system-configs/page
```

请求体：

```json
{
  "current": 1,
  "size": 10,
  "configKey": "geo.ip",
  "configGroup": "geo",
  "valueType": "string",
  "status": 1,
  "sensitive": 0
}
```

筛选规则：

- `configKey`：模糊匹配
- `configGroup`：模糊匹配
- `valueType`：精确匹配
- `status`：精确匹配
- `sensitive`：精确匹配

排序规则：

- `configGroup` 升序
- `configKey` 升序

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "configKey": "geo.ip.tencent.key",
        "configValue": "YLKBZ-BEPY7-BXHXM-PZZD4-FUCTV-MAFJA",
        "configGroup": "geo",
        "valueType": "string",
        "description": "腾讯地图 IP 定位 key",
        "status": 1,
        "sensitive": 1,
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

### 4.2 按 configKey 获取当前生效配置

```text
GET /system-configs/{configKey}
```

示例：

```text
GET /system-configs/geo.ip.tencent.key
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 1,
    "configKey": "geo.ip.tencent.key",
    "configValue": "YLKBZ-BEPY7-BXHXM-PZZD4-FUCTV-MAFJA",
    "configGroup": "geo",
    "valueType": "string",
    "description": "腾讯地图 IP 定位 key",
    "status": 1,
    "sensitive": 1,
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
  "msg": "config not found",
  "data": null
}
```

重要说明：

- 这个接口底层走 `systemConfigService.getByConfigKey(configKey)`
- 只会返回 `status = 1` 的启用配置
- 如果配置已禁用，也会返回 `404`

适用场景：

- 业务运行时按 key 读取生效配置

不推荐场景：

- 后台管理页编辑详情

### 4.3 按 id 获取配置详情

```text
GET /system-configs/detail/{id}
```

示例：

```text
GET /system-configs/detail/31
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 31,
    "configKey": "geo.ip.provider.max-concurrency",
    "configValue": "8",
    "configGroup": "geo",
    "valueType": "int",
    "description": "IP 归属地供应商最大并发数",
    "status": 0,
    "sensitive": 0,
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:10:00",
    "deleted": 0
  }
}
```

失败响应：

```json
{
  "code": 404,
  "msg": "config not found",
  "data": null
}
```

前端说明：

- 后台配置管理页详情、编辑弹窗详情优先使用这个接口
- 这个接口不会因为 `status=0` 而查不到

### 4.4 获取表单选项

```text
GET /system-configs/options
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "valueTypes": [
      { "label": "字符串", "value": "string" },
      { "label": "整数", "value": "int" },
      { "label": "小数", "value": "double" },
      { "label": "布尔", "value": "boolean" },
      { "label": "JSON", "value": "json" }
    ],
    "statusOptions": [
      { "label": "启用", "value": 1 },
      { "label": "禁用", "value": 0 }
    ],
    "sensitiveOptions": [
      { "label": "普通", "value": 0 },
      { "label": "敏感", "value": 1 }
    ],
    "groups": [
      { "label": "ai", "value": "ai" },
      { "label": "geo", "value": "geo" },
      { "label": "log-task", "value": "log-task" }
    ]
  }
}
```

前端说明：

- `valueTypes`：新增/编辑表单里的值类型下拉
- `statusOptions`：状态单选/开关
- `sensitiveOptions`：敏感标识单选/开关
- `groups`：现有配置分组，可用于筛选和表单下拉

### 4.5 新增配置

```text
POST /system-configs/add
```

请求体：

```json
{
  "configKey": "geo.ip.provider.max-concurrency",
  "configValue": "6",
  "configGroup": "geo",
  "valueType": "int",
  "description": "IP 归属地供应商最大并发数",
  "status": 1,
  "sensitive": 0
}
```

字段规则：

- `configKey`：必填，且必须唯一
- `configValue`：选填
- `configGroup`：选填
- `valueType`：选填，但前端建议必传
- `description`：选填
- `status`：选填，不传默认 `1`
- `sensitive`：选填，不传默认 `0`

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 31,
    "configKey": "geo.ip.provider.max-concurrency",
    "configValue": "6",
    "configGroup": "geo",
    "valueType": "int",
    "description": "IP 归属地供应商最大并发数",
    "status": 1,
    "sensitive": 0,
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:00:00",
    "deleted": 0
  }
}
```

失败响应：

1. `configKey` 为空：

```json
{
  "code": 400,
  "msg": "configKey is required",
  "data": null
}
```

2. `configKey` 已存在：

```json
{
  "code": 400,
  "msg": "configKey already exists",
  "data": null
}
```

前端说明：

- 如果 `valueType = json`，`configValue` 仍然传字符串，前端请自行 `JSON.stringify`
- 提交新增成功后建议刷新 `page` 和 `options`

### 4.6 修改配置

```text
POST /system-configs/update
```

请求体：

```json
{
  "id": 31,
  "configKey": "geo.ip.provider.max-concurrency",
  "configValue": "8",
  "configGroup": "geo",
  "valueType": "int",
  "description": "IP 归属地供应商最大并发数",
  "status": 1,
  "sensitive": 0
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
  "msg": "config not found",
  "data": null
}
```

3. 修改后的 `configKey` 与其他记录重复：

```json
{
  "code": 400,
  "msg": "configKey already exists",
  "data": null
}
```

更新语义非常重要：

| 字段        | 更新规则                                           |
| ----------- | -------------------------------------------------- |
| id          | 必填                                               |
| configKey   | 只有“非空字符串”才会更新                           |
| configValue | 字段不为 `null` 就会更新，传空字符串 `""` 也会覆盖 |
| configGroup | 只有“非空字符串”才会更新                           |
| valueType   | 只有“非空字符串”才会更新                           |
| description | 字段不为 `null` 就会更新，传空字符串 `""` 也会覆盖 |
| status      | 传了就更新，不传保持原值                           |
| sensitive   | 传了就更新，不传保持原值                           |

也就是说：

- `configValue`、`description` 可以清空
- `configKey`、`configGroup`、`valueType` 不能通过空字符串清空
- 只改部分字段时，可以只传 `id + 需要修改的字段`

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 31,
    "configKey": "geo.ip.provider.max-concurrency",
    "configValue": "8",
    "configGroup": "geo",
    "valueType": "int",
    "description": "IP 归属地供应商最大并发数",
    "status": 1,
    "sensitive": 0,
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:10:00",
    "deleted": 0
  }
}
```

### 4.7 删除配置

```text
DELETE /system-configs/{id}
```

示例：

```text
DELETE /system-configs/31
```

成功响应：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "id": 31,
    "configKey": "geo.ip.provider.max-concurrency",
    "configValue": "8",
    "configGroup": "geo",
    "valueType": "int",
    "description": "IP 归属地供应商最大并发数",
    "status": 1,
    "sensitive": 0,
    "createdTime": "2026-05-06T12:00:00",
    "updatedTime": "2026-05-06T12:10:00",
    "deleted": 0
  }
}
```

失败响应：

```json
{
  "code": 404,
  "msg": "config not found",
  "data": null
}
```

说明：

- 当前为逻辑删除
- 删除成功后，后端会清理对应配置缓存和选项缓存

## 5. 前端表单与列表规范建议

### 5.1 列表查询条件建议

建议筛选项：

- `configKey`
- `configGroup`
- `valueType`
- `status`
- `sensitive`

### 5.2 新增/编辑表单建议

| 字段        | 组件建议         |
| ----------- | ---------------- |
| configKey   | Input            |
| configValue | Textarea         |
| configGroup | Select / Input   |
| valueType   | Select           |
| description | Input / Textarea |
| status      | Radio / Switch   |
| sensitive   | Radio / Switch   |

### 5.3 前端校验建议

新增/编辑前建议做这些校验：

- `configKey` 必填
- `configKey` 长度建议不超过 128
- `configGroup` 长度建议不超过 64
- `valueType` 必须落在文档给定枚举中
- `status` 只能是 `0/1`
- `sensitive` 只能是 `0/1`
- 当 `valueType = json` 时，前端先校验 JSON 格式再提交

## 6. 推荐前端 API 封装

```ts
export const systemConfigApi = {
  page: (data: SystemConfigPageReq) =>
    request.post("/system-configs/page", data),
  getByKey: (configKey: string) => request.get(`/system-configs/${configKey}`),
  detail: (id: number) => request.get(`/system-configs/detail/${id}`),
  options: () => request.get("/system-configs/options"),
  add: (data: Partial<SystemConfig>) =>
    request.post("/system-configs/add", data),
  update: (data: Partial<SystemConfig> & { id: number }) =>
    request.post("/system-configs/update", data),
  remove: (id: number) => request.delete(`/system-configs/${id}`)
};
```

## 7. 联调注意事项

1. 后台管理页详情查询，请优先使用 `GET /system-configs/detail/{id}`
2. `GET /system-configs/{configKey}` 适合读取“当前生效配置”，不是后台详情接口
3. 修改 `configKey` 时，后端已做重复校验；前端仍建议在表单层做提示
4. 新增、修改、删除后，建议刷新：
   - 当前列表
   - `GET /system-configs/options`
5. 如果后续前端需要“批量删除 / 批量启停 / 配置历史”这类能力，当前后端还没有，需要再补
