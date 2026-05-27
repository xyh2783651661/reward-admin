# 框架扩展

> 通用约定见 [COMMON.md](COMMON.md)

本文档包含工作台首页与顶部通知中心的接口。

**可选请求头：**

| Header        | 说明                                             |
| ------------- | ------------------------------------------------ |
| X-User-Id     | 用于计算公告已读状态                             |
| X-Client-Type | 按平台过滤公告（web/android/ios/mini），默认 web |

---

## 工作台首页

### GET /workbench/summary

用于首页头图、汇总卡片和快捷入口。

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "headline": {
      "title": "系统正在稳定运行",
      "description": "当前在线公告 3 条，最近 7 天核心链路运行平稳。",
      "updatedAt": "2026-05-10 09:30:00"
    },
    "focusItems": [
      {
        "label": "系统版本",
        "value": "0.0.1-SNAPSHOT",
        "type": "primary"
      },
      {
        "label": "运行环境",
        "value": "prod",
        "type": "success"
      },
      {
        "label": "服务标识",
        "value": "reward-service",
        "type": "info"
      }
    ],
    "summaryCards": [
      {
        "key": "rewardRecords",
        "label": "奖励记录",
        "value": 128,
        "unit": "条",
        "delta": 18,
        "trend": "up",
        "description": "最近7天新增奖励分析记录，较上个周期增加 18",
        "icon": "ri:gift-2-line",
        "color": "#2563eb",
        "path": "/config/reward"
      }
    ],
    "quickEntries": [
      {
        "key": "systemConfig",
        "title": "系统配置",
        "description": "集中维护运行时开关、分组和值类型。",
        "path": "/config/system-config",
        "icon": "ri:settings-5-line",
        "accent": "#2563eb"
      }
    ]
  }
}
```

字段说明：

#### headline

| 字段        | 类型   | 说明                                     |
| ----------- | ------ | ---------------------------------------- |
| title       | string | 顶部标题                                 |
| description | string | 顶部说明文案                             |
| updatedAt   | string | 最近更新时间，格式 `yyyy-MM-dd HH:mm:ss` |

#### focusItems

| 字段  | 类型   | 说明                                                                |
| ----- | ------ | ------------------------------------------------------------------- |
| label | string | 标签名                                                              |
| value | string | 标签值                                                              |
| type  | string | Element Plus `tag` 类型，支持 `primary/success/warning/info/danger` |

#### summaryCards

| 字段        | 类型   | 说明                   |
| ----------- | ------ | ---------------------- |
| key         | string | 唯一标识               |
| label       | string | 卡片名称               |
| value       | number | 指标值                 |
| unit        | string | 单位，可空             |
| delta       | number | 相比上一个周期的变化值 |
| trend       | string | `up/down/flat`         |
| description | string | 卡片说明               |
| icon        | string | Iconify 图标名         |
| color       | string | 卡片主色               |
| path        | string | 点击跳转路由，可空     |

#### quickEntries

| 字段        | 类型   | 说明           |
| ----------- | ------ | -------------- |
| key         | string | 唯一标识       |
| title       | string | 快捷入口标题   |
| description | string | 描述           |
| path        | string | 跳转路由       |
| icon        | string | Iconify 图标名 |
| accent      | string | 强调色         |

### 2.2 GET /api/workbench/trends

用于首页趋势图表。

请求参数：

| 参数  | 类型   | 必填 | 说明                           |
| ----- | ------ | ---- | ------------------------------ |
| range | string | 否   | 只支持 `7d` / `30d`，默认 `7d` |

请求示例：

```text
GET /api/workbench/trends?range=7d
```

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "range": "7d",
    "categories": [
      "05-04",
      "05-05",
      "05-06",
      "05-07",
      "05-08",
      "05-09",
      "05-10"
    ],
    "rewardIssued": [18, 26, 24, 31, 34, 29, 38],
    "mailSuccessRate": [96.8, 97.9, 98.4, 98.1, 99.2, 98.7, 98.6],
    "taskExecutions": [8, 12, 10, 15, 14, 11, 16]
  }
}
```

字段说明：

| 字段            | 类型     | 说明                     |
| --------------- | -------- | ------------------------ |
| range           | string   | 当前周期                 |
| categories      | string[] | 横轴标签                 |
| rewardIssued    | number[] | 奖励分析记录数量趋势     |
| mailSuccessRate | number[] | 邮件发送成功率，单位 `%` |
| taskExecutions  | number[] | 定时任务执行数量趋势     |

注意事项：

- 三个数组长度始终与 `categories` 一致
- `mailSuccessRate` 保留 1 位小数
- 如果 `range` 传了其他值，后端会返回 `400`

### 2.3 GET /api/workbench/todos

用于首页待办列表。

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": [
    {
      "id": "mail-15",
      "title": "处理邮件发送失败记录",
      "description": "主题：奖励月报，收件人：demo@qq.com，SMTP 认证失败",
      "dueTime": "2026-05-10 11:30",
      "tag": "高优先级",
      "status": "danger",
      "actionText": "去处理",
      "path": "/monitor/mail-logs"
    }
  ]
}
```

字段说明：

| 字段        | 类型   | 说明                                                 |
| ----------- | ------ | ---------------------------------------------------- |
| id          | string | 唯一标识                                             |
| title       | string | 待办标题                                             |
| description | string | 待办说明                                             |
| dueTime     | string | 时间文案，格式 `yyyy-MM-dd HH:mm`                    |
| tag         | string | 右侧标签文字                                         |
| status      | string | 标签颜色，支持 `primary/success/warning/info/danger` |
| actionText  | string | 操作按钮文案                                         |
| path        | string | 点击跳转路由                                         |

### 2.4 GET /api/workbench/activities

用于首页最近动态时间线。

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": [
    {
      "id": "notice-log-1",
      "title": "公告PUBLISH",
      "description": "公告ID：12，发布公告到线上环境",
      "operator": "小毅",
      "time": "2026-05-10 09:12",
      "path": "/notice/sysNotice",
      "icon": "ri:notification-3-line"
    }
  ]
}
```

字段说明：

| 字段        | 类型   | 说明                          |
| ----------- | ------ | ----------------------------- |
| id          | string | 唯一标识                      |
| title       | string | 动态标题                      |
| description | string | 动态说明                      |
| operator    | string | 操作人 / 来源                 |
| time        | string | 时间，格式 `yyyy-MM-dd HH:mm` |
| path        | string | 点击跳转路由                  |
| icon        | string | Iconify 图标名                |

## 3. 顶部通知中心

### 3.1 GET /api/notifications/panel

用于顶部铃铛下拉面板，支持“通知 / 消息 / 待办”三类分组。

成功响应示例：

```json
{
  "code": 200,
  "msg": "success",
  "success": true,
  "data": {
    "generatedAt": "2026-05-10 09:30:00",
    "tabs": [
      {
        "key": "notify",
        "name": "通知",
        "emptyText": "暂无通知",
        "list": [
          {
            "id": "notify-12",
            "avatar": "",
            "title": "系统配置已同步到预发环境",
            "description": "geo、ai 两个分组的最新配置已经完成预发同步。",
            "datetime": "5 分钟前",
            "type": "notify",
            "extra": "新通知",
            "status": "primary",
            "path": "/notice/sysNotice",
            "read": false
          }
        ]
      }
    ]
  }
}
```

字段说明：

#### tabs

| 字段      | 类型   | 说明                                         |
| --------- | ------ | -------------------------------------------- |
| key       | string | 分组唯一标识，固定使用 `notify/message/todo` |
| name      | string | 分组名称                                     |
| emptyText | string | 空状态文案                                   |
| list      | array  | 当前分组消息列表                             |

#### list item

| 字段        | 类型    | 说明                                                   |
| ----------- | ------- | ------------------------------------------------------ |
| id          | string  | 唯一标识                                               |
| avatar      | string  | 头像地址，可空                                         |
| title       | string  | 标题                                                   |
| description | string  | 描述                                                   |
| datetime    | string  | 时间文案，通常为相对时间                               |
| type        | string  | 分类标识                                               |
| extra       | string  | 右上角补充信息，可空                                   |
| status      | string  | `tag` 颜色，支持 `primary/success/warning/info/danger` |
| path        | string  | 点击跳转路由，可空                                     |
| read        | boolean | 是否已读                                               |

注意事项：

- 前端右上角角标可以直接统计 `read = false` 的总数
- `notify` 分组中的 `read` 受可选请求头 `X-User-Id` 影响
- `path` 非空时，点击后可直接做路由跳转

## 4. TypeScript 类型建议

```ts
export interface WorkbenchSummaryCard {
  key: string;
  label: string;
  value: number;
  unit?: string;
  delta: number;
  trend: "up" | "down" | "flat";
  description: string;
  icon: string;
  color: string;
  path?: string;
}

export interface WorkbenchQuickEntry {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  accent: string;
}

export interface WorkbenchTrendData {
  range: "7d" | "30d";
  categories: string[];
  rewardIssued: number[];
  mailSuccessRate: number[];
  taskExecutions: number[];
}

export interface WorkbenchTodoItem {
  id: string;
  title: string;
  description: string;
  dueTime: string;
  tag: string;
  status: "primary" | "success" | "warning" | "info" | "danger";
  actionText: string;
  path: string;
}

export interface WorkbenchActivityItem {
  id: string;
  title: string;
  description: string;
  operator: string;
  time: string;
  path: string;
  icon: string;
}

export interface NoticeListItem {
  id: string;
  avatar?: string;
  title: string;
  datetime: string;
  type: string;
  description: string;
  status?: "primary" | "success" | "warning" | "info" | "danger";
  extra?: string;
  path?: string;
  read?: boolean;
}

export interface NoticeTabItem {
  key: "notify" | "message" | "todo";
  name: string;
  list: NoticeListItem[];
  emptyText: string;
}
```

## 5. 联调说明

1. 当前后端已直接提供真实接口，前端只需要替换请求地址即可。
2. `summary / trends / todos / activities` 已做短时缓存，适合首页高频打开场景。
3. `notifications/panel` 暂未做用户维度缓存，方便后续补“已读 / 全部已读”能力。
4. 如果后续前端需要补：

```text
POST /api/notifications/{id}/read
POST /api/notifications/read-all
POST /api/workbench/todos/{id}/complete
```

这三个接口可以在现有结构上继续往下接，不需要推翻当前返回格式。
