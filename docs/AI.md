# AI 调用记录

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含 AI 调用记录的查询接口。

---

## 接口概览

| 场景                 | 方法 | 路径                    |
| -------------------- | ---- | ----------------------- |
| 分页查询 AI 调用记录 | POST | `/ai/aiCallRecord/page` |
| 查看 AI 调用记录详情 | GET  | `/ai/aiCallRecord/{id}` |

推荐前端使用方式：

1. 列表页：`POST /ai/aiCallRecord/page`
2. 详情抽屉/弹窗：`GET /ai/aiCallRecord/{id}`

## 2. 通用约定

### 2.1 Base URL

当前 Controller 的实际路径前缀为：

```text
/ai/aiCallRecord
```

如果前端网关或代理额外统一加了 `/api` 前缀，则实际调用路径通常为：

```text
/api/ai/aiCallRecord
```

以前端实际代理配置为准。

### 2.2 请求头

JSON 接口统一建议：

```text
Content-Type: application/json
```

### 2.3 统一响应结构

项目统一返回 `Result<T>`，当前结构如下：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {}
}
```

失败示例：

```json
{
  "code": 404,
  "msg": "ai call record not found",
  "success": false,
  "data": null
}
```

### 2.4 时间字段说明

根据当前 Jackson 配置，`LocalDateTime` 会以字符串形式返回，推荐前端按 ISO-8601 字符串处理，例如：

```text
2026-05-13T10:15:30
```

### 2.5 requestTime 过滤说明

根据当前后端实现，`requestTime` 会直接参与 `createdTime between start and end` 查询。

前端建议统一传两个字符串：

```json
["2026-05-01 00:00:00", "2026-05-13 23:59:59"]
```

注意事项：

- 必须同时传开始和结束两个值，后端才会生效
- 建议使用 `yyyy-MM-dd HH:mm:ss` 格式
- 不传或只传一个值时，后端不会按时间过滤

## 3. 数据结构

### 3.1 分页请求体 `AiCallRecordPageReq`

```json
{
  "current": 1,
  "size": 10,
  "id": 1001,
  "bizType": "reward-summary",
  "bizId": "202605130001",
  "model": "DEEP_SEEK",
  "templateName": "reward/summary-v1.md",
  "status": "SUCCESS",
  "operator": "admin",
  "traceId": "trace-20260513-001",
  "requestTime": ["2026-05-01 00:00:00", "2026-05-13 23:59:59"]
}
```

字段说明：

| 字段         | 类型     | 必填 | 说明                            |
| ------------ | -------- | ---- | ------------------------------- |
| current      | number   | 否   | 当前页，默认 `1`                |
| size         | number   | 否   | 每页条数，默认 `10`，最大 `100` |
| id           | number   | 否   | 记录 id，精确匹配               |
| bizType      | string   | 否   | 业务类型，模糊匹配              |
| bizId        | string   | 否   | 业务 id，模糊匹配               |
| model        | string   | 否   | AI 模型，精确匹配               |
| templateName | string   | 否   | 模板名称，模糊匹配              |
| status       | string   | 否   | 调用状态，精确匹配              |
| operator     | string   | 否   | 操作人，模糊匹配                |
| traceId      | string   | 否   | 链路追踪 id，模糊匹配           |
| requestTime  | string[] | 否   | 创建时间范围，长度需为 2        |

排序规则：

- 按 `createdTime` 倒序

### 3.2 列表项 `AiCallRecordPageVo`

```json
{
  "id": 1001,
  "bizType": "reward-summary",
  "bizId": "202605130001",
  "model": "DEEP_SEEK",
  "templateName": "reward/summary-v1.md",
  "status": "SUCCESS",
  "operator": "admin",
  "traceId": "trace-20260513-001",
  "errorMessage": "",
  "costTimeMs": 842,
  "promptTokens": 1520,
  "responseTokens": 480,
  "promptLength": 4218,
  "responseLength": 1360,
  "promptPreview": "请根据以下奖励数据生成月度总结...",
  "responsePreview": "本月整体表现稳定，奖励发放主要集中在...",
  "createdTime": "2026-05-13T10:15:30",
  "updatedTime": "2026-05-13T10:15:31"
}
```

字段说明：

| 字段            | 类型   | 说明               |
| --------------- | ------ | ------------------ |
| id              | number | 记录 id            |
| bizType         | string | 业务类型           |
| bizId           | string | 业务 id            |
| model           | string | AI 模型            |
| templateName    | string | 模板名称           |
| status          | string | 调用状态           |
| operator        | string | 操作人             |
| traceId         | string | 链路追踪 id        |
| errorMessage    | string | 失败时的错误信息   |
| costTimeMs      | number | 调用耗时，单位毫秒 |
| promptTokens    | number | prompt token 数    |
| responseTokens  | number | response token 数  |
| promptLength    | number | prompt 字符长度    |
| responseLength  | number | response 字符长度  |
| promptPreview   | string | prompt 预览文本    |
| responsePreview | string | response 预览文本  |
| createdTime     | string | 创建时间           |
| updatedTime     | string | 更新时间           |

说明：

- `promptPreview` 和 `responsePreview` 是列表预览字段，不是完整全文
- 根据当前实现，预览文本会把换行替换为空格，并在超过 `160` 个字符时截断

### 3.3 详情对象 `AiCallRecord`

```json
{
  "id": 1001,
  "bizType": "reward-summary",
  "bizId": "202605130001",
  "model": "DEEP_SEEK",
  "templateName": "reward/summary-v1.md",
  "prompt": "请根据以下奖励数据生成月度总结......",
  "response": "本月整体表现稳定，奖励发放主要集中在......",
  "costTimeMs": 842,
  "promptTokens": 1520,
  "responseTokens": 480,
  "status": "SUCCESS",
  "errorMessage": "",
  "operator": "admin",
  "traceId": "trace-20260513-001",
  "createdTime": "2026-05-13T10:15:30",
  "updatedTime": "2026-05-13T10:15:31"
}
```

字段说明：

| 字段           | 类型   | 说明               |
| -------------- | ------ | ------------------ |
| id             | number | 记录 id            |
| bizType        | string | 业务类型           |
| bizId          | string | 业务 id            |
| model          | string | AI 模型            |
| templateName   | string | 模板名称           |
| prompt         | string | 完整 prompt 内容   |
| response       | string | 完整 response 内容 |
| costTimeMs     | number | 调用耗时，单位毫秒 |
| promptTokens   | number | prompt token 数    |
| responseTokens | number | response token 数  |
| status         | string | 调用状态           |
| errorMessage   | string | 错误信息           |
| operator       | string | 操作人             |
| traceId        | string | 链路追踪 id        |
| createdTime    | string | 创建时间           |
| updatedTime    | string | 更新时间           |

## 4. 接口详情

### 4.1 分页查询 AI 调用记录

```text
POST /ai/aiCallRecord/page
```

请求体示例：

```json
{
  "current": 1,
  "size": 10,
  "bizType": "reward",
  "status": "SUCCESS",
  "model": "DEEP_SEEK",
  "requestTime": ["2026-05-01 00:00:00", "2026-05-13 23:59:59"]
}
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "records": [
      {
        "id": 1001,
        "bizType": "reward-summary",
        "bizId": "202605130001",
        "model": "DEEP_SEEK",
        "templateName": "reward/summary-v1.md",
        "status": "SUCCESS",
        "operator": "admin",
        "traceId": "trace-20260513-001",
        "errorMessage": "",
        "costTimeMs": 842,
        "promptTokens": 1520,
        "responseTokens": 480,
        "promptLength": 4218,
        "responseLength": 1360,
        "promptPreview": "请根据以下奖励数据生成月度总结...",
        "responsePreview": "本月整体表现稳定，奖励发放主要集中在...",
        "createdTime": "2026-05-13T10:15:30",
        "updatedTime": "2026-05-13T10:15:31"
      }
    ],
    "total": 1,
    "size": 10,
    "current": 1,
    "pages": 1
  }
}
```

前端对接说明：

- 该接口适合后台列表页直接使用
- 列表页如果只展示摘要信息，无需再单独请求详情
- 需要查看完整 prompt/response 时，再调用详情接口

### 4.2 查看 AI 调用记录详情

```text
GET /ai/aiCallRecord/{id}
```

请求示例：

```text
GET /ai/aiCallRecord/1001
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "id": 1001,
    "bizType": "reward-summary",
    "bizId": "202605130001",
    "model": "DEEP_SEEK",
    "templateName": "reward/summary-v1.md",
    "prompt": "请根据以下奖励数据生成月度总结......",
    "response": "本月整体表现稳定，奖励发放主要集中在......",
    "costTimeMs": 842,
    "promptTokens": 1520,
    "responseTokens": 480,
    "status": "SUCCESS",
    "errorMessage": "",
    "operator": "admin",
    "traceId": "trace-20260513-001",
    "createdTime": "2026-05-13T10:15:30",
    "updatedTime": "2026-05-13T10:15:31"
  }
}
```

失败响应示例：

`id` 不存在：

```json
{
  "code": 404,
  "msg": "ai call record not found",
  "success": false,
  "data": null
}
```

前端对接说明：

- 详情接口返回完整 `prompt` 和 `response`
- 建议用于抽屉、弹窗或详情页
- 如果列表页已经有当前行的基础字段，详情页可以只补全文内容展示

## 5. 前端 TypeScript 类型建议

```ts
export interface Result<T> {
  code: number;
  msg: string;
  success: boolean;
  data: T;
}

export interface AiCallRecordPageReq {
  current?: number;
  size?: number;
  id?: number;
  bizType?: string;
  bizId?: string;
  model?: string;
  templateName?: string;
  status?: string;
  operator?: string;
  traceId?: string;
  requestTime?: [string, string] | string[];
}

export interface AiCallRecordPageItem {
  id: number;
  bizType: string;
  bizId: string;
  model: string;
  templateName: string;
  status: string;
  operator: string;
  traceId: string;
  errorMessage: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  promptLength: number;
  responseLength: number;
  promptPreview: string;
  responsePreview: string;
  createdTime: string;
  updatedTime: string;
}

export interface AiCallRecordDetail {
  id: number;
  bizType: string;
  bizId: string;
  model: string;
  templateName: string;
  prompt: string;
  response: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  status: string;
  errorMessage: string;
  operator: string;
  traceId: string;
  createdTime: string;
  updatedTime: string;
}

export interface PageData<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}
```

## 6. 前端调用示例

### 6.1 列表查询

```ts
export async function fetchAiCallRecordPage(payload: AiCallRecordPageReq) {
  return request.post<Result<PageData<AiCallRecordPageItem>>>(
    "/ai/aiCallRecord/page",
    payload
  );
}
```

### 6.2 查询详情

```ts
export async function fetchAiCallRecordDetail(id: number) {
  return request.get<Result<AiCallRecordDetail>>(`/ai/aiCallRecord/${id}`);
}
```

## 7. 联调建议

- 列表页优先展示：`bizType`、`bizId`、`model`、`status`、`operator`、`costTimeMs`、`promptTokens`、`responseTokens`、`createdTime`
- 列表页正文类字段建议只展示 `promptPreview`、`responsePreview`
- 详情页再展示完整 `prompt`、`response`
- `status` 当前后端未限制枚举值，前端建议先按字符串展示
- 如果需要“只看失败记录”，可以传 `status` 并配合 `errorMessage` 字段展示失败原因
