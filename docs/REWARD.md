# 奖励模块

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含奖励计算、用户管理、科目管理、配置管理、零花钱规则等接口。

---

## 奖励计算 (Web 端)

### POST /reward/calculate — 计算奖励

**安全：** @Encrypted @RepeatSubmit

**请求体：**

```json
{
  "scores": { "语文": 90, "数学": 85, "英语": 92 },
  "currentRank": 5,
  "previousRank": 8,
  "previousScores": { "语文": 85, "数学": 80, "英语": 88 }
}
```

| 字段           | 类型   | 必填 | 说明                     |
| -------------- | ------ | ---- | ------------------------ |
| scores         | object | 是   | 各科目分数，key 为科目名 |
| currentRank    | number | 是   | 当前排名                 |
| previousRank   | number | 否   | 上次排名                 |
| previousScores | object | 否   | 上次各科目分数           |

**响应：**

```json
{
  "code": 200,
  "data": {
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
    "timestamp": 1715702400000
  }
}
```

### GET /reward/result — 获取计算结果

**安全：** @Encrypted

### GET /reward/compare — 最近两次结果对比

**安全：** @Encrypted

**响应：**

```json
{
  "code": 200,
  "data": {
    "current": { ... },
    "previous": { ... },
    "rankChange": 3,
    "totalChange": 17,
    "totalRewardChange": 30
  }
}
```

| 字段              | 说明                            |
| ----------------- | ------------------------------- |
| current           | 本次计算结果                    |
| previous          | 上次计算结果（仅一条时为 null） |
| rankChange        | 排名变化（正数=上升）           |
| totalChange       | 总分变化                        |
| totalRewardChange | 总奖励变化                      |

### GET /reward/subjects — 获取科目列表

**安全：** @Encrypted

### DELETE /reward/{id} — 删除单条结果

**安全：** @Encrypted

### DELETE /reward — 批量删除

**安全：** @Encrypted

**请求体：** `[1, 2, 3]`

### GET /reward/download/{id} — 下载 PDF

**安全：** @Encrypted

### POST /reward/avatar — 更新头像

**安全：** @Encrypted

**Content-Type:** `multipart/form-data`

| 参数 | 类型   | 必填 | 说明     |
| ---- | ------ | ---- | -------- |
| file | File   | 是   | 头像文件 |
| id   | number | 是   | 用户 ID  |

---

## 奖励计算 (APK 端)

APK 端接口与 Web 端功能相同，路径前缀为 `/reward-apk`。

| 方法   | 路径                                  | 安全          | 说明                                      |
| ------ | ------------------------------------- | ------------- | ----------------------------------------- |
| POST   | `/reward-apk/calculate`               | @Encrypted    | 计算奖励                                  |
| GET    | `/reward-apk/result`                  | @Encrypted    | 获取结果                                  |
| GET    | `/reward-apk/subjects`                | @Encrypted    | 科目列表                                  |
| GET    | `/reward-apk/profile`                 | @Encrypted    | 用户信息                                  |
| POST   | `/reward-apk/profile`                 | @Encrypted    | 更新用户信息                              |
| POST   | `/reward-apk/avatar`                  | @Encrypted    | 上传头像                                  |
| DELETE | `/reward-apk/{id}`                    | @Encrypted    | 删除结果                                  |
| GET    | `/reward-apk/download/{id}`           | @Encrypted    | 下载 PDF                                  |
| GET    | `/reward-apk/download/rule`           | —             | 下载规则 PDF                              |
| GET    | `/reward-apk/last-version`            | @Encrypted    | 最新 APK 版本                             |
| GET    | `/reward-apk/web/download-latest`     | @RateLimit    | Web 端下载最新 APK（二维码扫描/点击下载） |
| GET    | `/reward-apk/android/download-latest` | @RateLimit    | Android 端下载最新 APK                    |
| POST   | `/reward-apk/versions-page`           | —             | 版本分页                                  |
| POST   | `/reward-apk/version-apk`             | @GithubCiAuth | 持久化版本信息                            |

### POST /reward-apk/profile — 更新用户信息

```json
{
  "id": 1,
  "nickName": "小明",
  "phone": "13800138000",
  "mail": "test@example.com"
}
```

---

## 用户管理

| 方法   | 路径                      | 说明     |
| ------ | ------------------------- | -------- |
| POST   | `/reward-users/page`      | 用户分页 |
| POST   | `/reward-users/list`      | 用户列表 |
| POST   | `/reward-users/add`       | 添加用户 |
| POST   | `/reward-users/update`    | 更新用户 |
| POST   | `/reward-users/reset-pwd` | 重置密码 |
| DELETE | `/reward-users/{id}`      | 删除用户 |

**请求参数：**

| 字段     | 类型   | 说明                    |
| -------- | ------ | ----------------------- |
| id       | number | 用户 ID（更新时必填）   |
| nickName | string | 昵称                    |
| phone    | string | 手机号                  |
| password | string | 密码（新增/重置时使用） |
| birthday | string | 生日（yyyy-MM-dd）      |
| avatar   | string | 头像 URL                |
| status   | number | 状态（1=启用）          |

---

## 科目管理

| 方法   | 路径                      | 说明     |
| ------ | ------------------------- | -------- |
| POST   | `/reward-subjects/page`   | 科目分页 |
| POST   | `/reward-subjects/list`   | 科目列表 |
| POST   | `/reward-subjects/add`    | 添加科目 |
| POST   | `/reward-subjects/update` | 更新科目 |
| DELETE | `/reward-subjects/{id}`   | 删除科目 |

**请求参数：**

| 字段       | 类型   | 说明                 |
| ---------- | ------ | -------------------- |
| id         | number | ID（更新必填）       |
| name       | string | 科目名称             |
| type       | string | 类型：CORE / GENERAL |
| full       | number | 满分分值             |
| base       | number | 基础奖励             |
| excellence | number | 优秀线               |
| status     | number | 状态（1=启用）       |
| stage      | string | 学段                 |

---

## 奖励配置管理

| 方法   | 路径                            | 说明         |
| ------ | ------------------------------- | ------------ |
| POST   | `/reward-configs/page`          | 配置分页     |
| POST   | `/reward-configs/add`           | 添加配置     |
| POST   | `/reward-configs/update`        | 更新配置     |
| DELETE | `/reward-configs/{id}`          | 删除配置     |
| POST   | `/reward-configs/export-excel`  | 导出 Excel   |
| GET    | `/reward-configs/download/rule` | 下载规则 PDF |

**请求参数：**

| 字段        | 类型   | 说明                         |
| ----------- | ------ | ---------------------------- |
| id          | number | ID（更新必填）               |
| rewardKey   | string | 奖励键                       |
| rewardType  | string | 类型：BASE / EXTRA / SPECIAL |
| rewardValue | number | 奖励值                       |
| description | string | 描述                         |
| condition   | string | 条件表达式                   |
| status      | number | 状态（1=启用）               |

---

## 零花钱规则管理

### 枚举定义

| 枚举     | 值         | 说明     |
| -------- | ---------- | -------- |
| RuleType | `BASE`     | 基础规则 |
| RuleType | `BIRTHDAY` | 生日规则 |

> `ruleKey` 为自由字符串，非固定枚举，由 `GET /options` 接口返回已有 key 列表。

### 接口列表

| 方法   | 路径                                      | 说明         |
| ------ | ----------------------------------------- | ------------ |
| GET    | `/reward-pocket-money-rules/options`      | 获取表单选项 |
| POST   | `/reward-pocket-money-rules/page`         | 规则分页     |
| POST   | `/reward-pocket-money-rules/add`          | 添加规则     |
| POST   | `/reward-pocket-money-rules/update`       | 更新规则     |
| DELETE | `/reward-pocket-money-rules/{id}`         | 删除规则     |
| POST   | `/reward-pocket-money-rules/export-excel` | 导出 Excel   |

### 数据结构

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

| 字段        | 类型   | 说明                          |
| ----------- | ------ | ----------------------------- |
| id          | number | 主键 ID                       |
| ruleKey     | string | 规则标识，唯一，自由字符串    |
| ruleType    | string | 规则类型：`BASE` / `BIRTHDAY` |
| ruleValue   | number | 金额数值                      |
| description | string | 规则描述                      |
| createdTime | string | 创建时间                      |
| updatedTime | string | 更新时间                      |

### GET /reward-pocket-money-rules/options — 获取表单选项

**响应：**

```json
{
  "code": 200,
  "data": {
    "ruleTypeOptions": [
      { "label": "BASE", "value": "BASE" },
      { "label": "BIRTHDAY", "value": "BIRTHDAY" }
    ],
    "ruleKeys": ["BASE_ALLOWANCE", "BIRTHDAY_ALLOWANCE"]
  }
}
```

### POST /reward-pocket-money-rules/page — 分页查询

**请求体：**

```json
{
  "current": 1,
  "size": 10,
  "ruleKey": "BASE_ALLOWANCE",
  "ruleType": "BASE"
}
```

筛选规则：`ruleKey` 精确匹配，`ruleType` 精确匹配，`description` 模糊匹配。

排序：`ruleType` 升序 → `ruleKey` 升序。

### POST /reward-pocket-money-rules/add — 新增规则

**请求体：**

```json
{
  "ruleKey": "BIRTHDAY_ALLOWANCE",
  "ruleType": "BIRTHDAY",
  "ruleValue": 200,
  "description": "生日零花钱200元"
}
```

| 字段        | 必填 | 说明                       |
| ----------- | ---- | -------------------------- |
| ruleKey     | 是   | 自由字符串，后端校验唯一性 |
| ruleType    | 是   | `BASE` 或 `BIRTHDAY`       |
| ruleValue   | 否   | 金额数值                   |
| description | 否   | 规则描述                   |

### POST /reward-pocket-money-rules/update — 修改规则

**请求体：**

```json
{
  "id": 2,
  "ruleValue": 300,
  "description": "生日零花钱调整为300元"
}
```

| 字段        | 更新规则   |
| ----------- | ---------- |
| id          | 必填       |
| ruleKey     | 非空才更新 |
| ruleType    | 非空才更新 |
| ruleValue   | 传了就更新 |
| description | 非空才更新 |

### DELETE /reward-pocket-money-rules/{id} — 删除规则

逻辑删除（`deleted` 置为 1）。

### POST /reward-pocket-money-rules/export-excel — 导出 Excel

请求体同分页查询，返回 `.xlsx` 文件流（需设置 `responseType: 'blob'`）。

---

## TypeScript 类型参考

```ts
// 奖励计算结果
export interface RewardResult {
  id: number;
  total: number;
  base: number;
  baseDesc: string;
  extra: number;
  extraDesc: string;
  special: number;
  specialDesc: string;
  totalReward: number;
  currentRank: number;
  previousRank: number;
  coreTotal: number;
  generalTotal: number;
  timestamp: number;
}

// 奖励对比
export interface RewardCompare {
  current: RewardResult | null;
  previous: RewardResult | null;
  rankChange: number;
  totalChange: number;
  totalRewardChange: number;
}

// 用户
export interface RewardUser {
  id: number;
  nickName: string;
  phone: string;
  birthday: string;
  avatar: string;
  status: number;
}

// 科目
export interface RewardSubject {
  id: number;
  name: string;
  type: "CORE" | "GENERAL";
  full: number;
  base: number;
  excellence: number;
  status: number;
  stage: string;
}

// 配置
export interface RewardConfig {
  id: number;
  rewardKey: string;
  rewardType: "BASE" | "EXTRA" | "SPECIAL";
  rewardValue: number;
  description: string;
  condition: string;
  status: number;
}

// 零花钱规则
export type RuleType = "BASE" | "BIRTHDAY";

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

export interface RuleOptions {
  ruleTypeOptions: { label: string; value: string }[];
  ruleKeys: string[];
}
```
