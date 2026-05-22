# Reward Pocket Money Rule 前端联调文档

本文档基于当前后端实际实现整理，供前端开发零花钱规则管理页面使用。

对应后端文件：

- [RewardPocketMoneyRuleController.java](D:/Users/xyh/IdeaProjects/we-chat/src/main/java/org/xyh/modules/reward/interfaces/controller/RewardPocketMoneyRuleController.java)
- [RewardPocketMoneyRule.java](D:/Users/xyh/IdeaProjects/we-chat/src/main/java/org/xyh/modules/reward/infrastructure/persistence/entity/RewardPocketMoneyRule.java)

## 1. 接口概览

| 场景         | 方法   | 路径                                      |
| ------------ | ------ | ----------------------------------------- |
| 获取表单选项 | GET    | `/reward-pocket-money-rules/options`      |
| 分页查询     | POST   | `/reward-pocket-money-rules/page`         |
| 导出 Excel   | POST   | `/reward-pocket-money-rules/export-excel` |
| 新增规则     | POST   | `/reward-pocket-money-rules/add`          |
| 修改规则     | POST   | `/reward-pocket-money-rules/update`       |
| 删除规则     | DELETE | `/reward-pocket-money-rules/{id}`         |

推荐前端页面使用方式：

1. 页面初始化：`GET /reward-pocket-money-rules/options`（获取下拉选项和已有 key 列表）
2. 列表页：`POST /reward-pocket-money-rules/page`
3. 新增弹窗提交：`POST /reward-pocket-money-rules/add`
4. 编辑弹窗数据：优先使用列表行数据（包含完整字段），无需额外拉详情
5. 编辑弹窗提交：`POST /reward-pocket-money-rules/update`
6. 删除：`DELETE /reward-pocket-money-rules/{id}`
7. 导出：`POST /reward-pocket-money-rules/export-excel`

## 2. 通用约定

### 2.1 Base URL

```text
/reward-pocket-money-rules
```

如果前端代理或网关加了 `/api`，则以前端实际代理路径为准：

```text
/api/reward-pocket-money-rules
```

### 2.2 请求头

```text
Content-Type: application/json
```

### 2.3 通用响应结构

成功：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": {}
}
```

失败：

```json
{
  "code": 400,
  "msg": "ruleKey [XXX] 已存在！",
  "data": null
}
```

## 3. 枚举定义

### 3.1 RuleType（规则类型）

`ruleType` 为固定枚举，由后端 `GET /options` 接口返回下拉选项。

| 值         | 说明     |
| ---------- | -------- |
| `BASE`     | 基础规则 |
| `BIRTHDAY` | 生日规则 |

### 3.2 RuleKey（规则标识）

`ruleKey` 为**自由字符串**，非固定枚举。由后端 `GET /options` 接口返回当前已有的所有 key 列表，前端可用于下拉提示。新增时后端口校验 key 唯一性。

## 4. 数据结构

### 4.1 RewardPocketMoneyRule（实体）

```json
{
  "id": 1,
  "ruleKey": "BASE_ALLOWANCE",
  "ruleType": "BASE",
  "ruleValue": 100,
  "description": "基础零花钱每月100元",
  "createdTime": "2026-05-22T10:00:00",
  "updatedTime": "2026-05-22T10:00:00",
  "deleted": 0
}
```

字段说明：

| 字段        | 类型   | 说明                                                |
| ----------- | ------ | --------------------------------------------------- |
| id          | number | 主键 ID                                             |
| ruleKey     | string | 规则标识，唯一。自由字符串，新增时后端口校验重复    |
| ruleType    | string | 规则类型。枚举值见 3.1，由 options 接口提供下拉选项 |
| ruleValue   | number | 金额数值                                            |
| description | string | 规则描述说明                                        |
| createdTime | string | 创建时间                                            |
| updatedTime | string | 更新时间                                            |
| deleted     | number | 逻辑删除标记，正常为 `0`                            |

### 4.2 请求体 RewardPocketMoneyRuleReq

继承 `PageRequest`（含 `current` / `size` 分页参数）：

```json
{
  "current": 1,
  "size": 10,
  "id": 1,
  "ruleKey": "BASE_ALLOWANCE",
  "ruleType": "BASE",
  "ruleValue": 100,
  "description": "基础零花钱"
}
```

字段说明：

| 字段        | 类型   | 必填          | 说明                                  |
| ----------- | ------ | ------------- | ------------------------------------- |
| current     | number | 否            | 页码，默认 1                          |
| size        | number | 否            | 每页条数，默认 10                     |
| id          | number | update 时必填 | 主键 ID                               |
| ruleKey     | string | add 时必填    | 规则标识，自由字符串，不可重复        |
| ruleType    | string | add 时必填    | 规则类型，必须为 `BASE` 或 `BIRTHDAY` |
| ruleValue   | number | 否            | 金额数值                              |
| description | string | 否            | 规则描述                              |

### 4.3 TypeScript 类型建议

```ts
/** 规则类型（固定枚举） */
export type RuleType = "BASE" | "BIRTHDAY";

/** 实体 */
export interface RewardPocketMoneyRule {
  id: number;
  ruleKey: string;
  ruleType: RuleType;
  ruleValue: number;
  description: string;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

/** 分页/筛选请求 */
export interface RewardPocketMoneyRuleReq {
  current?: number;
  size?: number;
  id?: number;
  ruleKey?: string;
  ruleType?: RuleType;
  ruleValue?: number;
  description?: string;
}

/** options 接口响应 */
export interface RuleOptions {
  ruleTypeOptions: { label: string; value: string }[];
  ruleKeys: string[];
}
```

## 5. 接口详情

### 5.1 获取表单选项

```text
GET /reward-pocket-money-rules/options
```

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": {
    "ruleTypeOptions": [
      { "label": "BASE", "value": "BASE" },
      { "label": "BIRTHDAY", "value": "BIRTHDAY" }
    ],
    "ruleKeys": ["BASE_ALLOWANCE", "BIRTHDAY_ALLOWANCE"]
  }
}
```

前端说明：

- `ruleTypeOptions`：新增/编辑表单中 `ruleType` 的下拉选项
- `ruleKeys`：当前数据库中已存在的所有 `ruleKey`，可用于：
  - 列表页筛选下拉
  - 新增表单中输入提示/建议
  - 注意：这仅仅是已有 key 列表，新增时允许输入新的 key

### 5.2 分页查询

```text
POST /reward-pocket-money-rules/page
```

请求体：

```json
{
  "current": 1,
  "size": 10,
  "ruleKey": "BASE_ALLOWANCE",
  "ruleType": "BASE"
}
```

筛选规则：

- `ruleKey`：精确匹配
- `ruleType`：精确匹配
- `ruleValue`：精确匹配
- `description`：模糊匹配

排序规则：

- `ruleType` 升序
- `ruleKey` 升序

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": {
    "records": [
      {
        "id": 1,
        "ruleKey": "BASE_ALLOWANCE",
        "ruleType": "BASE",
        "ruleValue": 100,
        "description": "基础零花钱",
        "createdTime": "2026-05-22T10:00:00",
        "updatedTime": "2026-05-22T10:00:00",
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

### 5.3 导出 Excel

```text
POST /reward-pocket-money-rules/export-excel
```

请求体：与分页查询一致，支持相同筛选条件。

```json
{
  "ruleKey": "BASE_ALLOWANCE"
}
```

说明：

- 导出字段：ID、标识、类型、数值、描述、创建时间、更新时间
- 文件格式：`.xlsx`
- 文件下载，非 JSON 响应
- 筛选逻辑与分页查询完全一致（不含分页，导出全部匹配数据）

### 5.4 新增规则

```text
POST /reward-pocket-money-rules/add
```

请求体：

```json
{
  "ruleKey": "BIRTHDAY_ALLOWANCE",
  "ruleType": "BIRTHDAY",
  "ruleValue": 200,
  "description": "生日零花钱200元"
}
```

字段规则：

- `ruleKey`：必填，自由字符串，后端口校验唯一性
- `ruleType`：必填，必须是 `BASE` 或 `BIRTHDAY`
- `ruleValue`：选填
- `description`：选填

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": {
    "id": 2,
    "ruleKey": "BIRTHDAY_ALLOWANCE",
    "ruleType": "BIRTHDAY",
    "ruleValue": 200,
    "description": "生日零花钱200元",
    "createdTime": "2026-05-22T15:00:00",
    "updatedTime": "2026-05-22T15:00:00",
    "deleted": 0
  }
}
```

失败响应：

```json
{
  "code": 400,
  "msg": "ruleKey不能为空！",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "ruleKey [BIRTHDAY_ALLOWANCE] 已存在！",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "ruleType不能为空！",
  "data": null
}
```

### 5.5 修改规则

```text
POST /reward-pocket-money-rules/update
```

请求体：

```json
{
  "id": 2,
  "ruleValue": 300,
  "description": "生日零花钱调整为300元"
}
```

必填字段：

- `id`

更新语义：

| 字段        | 更新规则                 |
| ----------- | ------------------------ |
| id          | 必填                     |
| ruleKey     | 只有非空字符串才更新     |
| ruleType    | 只有非空字符串才更新     |
| ruleValue   | 传了就更新，不传保持原值 |
| description | 非空字符串才更新         |

失败响应：

```json
{
  "code": 400,
  "msg": "id不能为空！",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "数据不存在！",
  "data": null
}
```

### 5.6 删除规则

```text
DELETE /reward-pocket-money-rules/{id}
```

示例：

```text
DELETE /reward-pocket-money-rules/2
```

成功响应：

```json
{
  "code": 200,
  "msg": "操作成功！",
  "data": {
    "id": 2,
    "ruleKey": "BIRTHDAY_ALLOWANCE",
    "ruleType": "BIRTHDAY",
    "ruleValue": 300,
    "description": "生日零花钱调整为300元",
    "createdTime": "2026-05-22T15:00:00",
    "updatedTime": "2026-05-22T15:30:00",
    "deleted": 0
  }
}
```

说明：

- 当前为逻辑删除（`deleted` 置为 1）
- 删除失败返回 400

## 6. 前端表单与列表规范建议

### 6.1 页面初始化流程

```
页面加载 → GET /options → 拿到 ruleTypeOptions + ruleKeys → 渲染下拉框
列表查询 → POST /page → 渲染表格
```

### 6.2 列表筛选项

- `ruleKey`（Select 下拉，选项来自 `options.ruleKeys`，支持清空）
- `ruleType`（Select 下拉，选项来自 `options.ruleTypeOptions`）
- `description`（Input 模糊搜索）

### 6.3 新增/编辑表单建议

| 字段        | 组件建议                      | 说明                                                        |
| ----------- | ----------------------------- | ----------------------------------------------------------- |
| ruleKey     | AutoComplete / Select + Input | 选项来自 `options.ruleKeys`，允许输入新 key；编辑态建议禁用 |
| ruleType    | Select                        | 选项来自 `options.ruleTypeOptions`                          |
| ruleValue   | InputNumber                   | 金额数值，建议加单位"元"                                    |
| description | Input / Textarea              | 规则描述                                                    |

### 6.4 前端校验建议

- `ruleKey` 必填
- `ruleType` 必填，必须在 `['BASE', 'BIRTHDAY']` 中
- `ruleValue` 建议为非负整数
- 新增时对重复 key 做后端错误提示展示
- 列表操作列建议增加删除二次确认弹窗

## 7. 推荐前端 API 封装

```ts
import request from "@/utils/request";

export const rewardPocketMoneyRuleApi = {
  /** 获取表单选项 */
  options: () => request.get("/reward-pocket-money-rules/options"),

  /** 分页查询 */
  page: (data: RewardPocketMoneyRuleReq) =>
    request.post("/reward-pocket-money-rules/page", data),

  /** 导出 Excel（注意设置 responseType: 'blob'） */
  exportExcel: (data: RewardPocketMoneyRuleReq) =>
    request.post("/reward-pocket-money-rules/export-excel", data, {
      responseType: "blob"
    }),

  /** 新增 */
  add: (data: RewardPocketMoneyRuleReq) =>
    request.post("/reward-pocket-money-rules/add", data),

  /** 修改 */
  update: (data: RewardPocketMoneyRuleReq & { id: number }) =>
    request.post("/reward-pocket-money-rules/update", data),

  /** 删除 */
  remove: (id: number) => request.delete(`/reward-pocket-money-rules/${id}`)
};
```

## 8. 联调注意事项

1. 页面初始化先调 `GET /options` 获取 `ruleTypeOptions` 和已有 `ruleKeys`
2. `ruleKey` 不是固定枚举，新增时可输入新 key，后端口校验唯一性并返回明确的错误信息
3. `ruleKey` 有数据库唯一约束，新增时前端应对后端口返回的重复错误做提示
4. 编辑弹窗优先复用列表行数据，无需单独拉详情接口
5. 新增/修改/删除后建议同时刷新列表和 `GET /options`（因为 `ruleKeys` 可能变化）
6. 导出接口响应为文件流，前端需设置 `responseType: 'blob'`
7. `ruleType` 大小写敏感，前端务必使用全大写（`BASE` 而非 `base`）
