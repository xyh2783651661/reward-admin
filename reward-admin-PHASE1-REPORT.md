# reward-admin 列表页统一规范 Phase 1 落地报告

> 阶段目标：在不改变业务逻辑 / 接口 / 路由 / 权限的前提下，落地审计报告已确认的统一规范。
> 守界：未建 `ListPage` / `DataTable`，未重写 `RePureTableBar` / `ReSearchBar`，未改任何业务/接口/路由/权限。

## 一、修改文件列表（25 文件 + 1 新增）

| 文件                                           | 修改内容                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `src/constants/index.ts`                       | **新增** `RA_PAGINATION` 常量                                          |
| `src/style/index.scss`                         | `--ra-radius-card: 6px → 8px`                                          |
| `src/style/element-plus.scss`                  | `.el-form-item__label` 字重 `700 → 400`                                |
| `src/views/config/composables/useCrudTable.ts` | 分页对象 `...RA_PAGINATION`（克隆 pageSizes 防共享引用）               |
| `src/views/love/media/index.vue`               | 引用 `RA_PAGINATION`；`pageSize 30→10`；`:page-sizes`/`:layout` 走常量 |
| `src/views/daily-image/manage/index.vue`       | 引用 `RA_PAGINATION`；`:page-sizes`/`:layout` 走常量                   |
| `src/views/daily-image/manage/hook.tsx`        | `pageSize 30→10`                                                       |
| `src/views/monitor/cache-monitor/index.vue`    | 3 处表头 `fill-color-lighter → fill-color-light`                       |
| `src/views/permission/menu/index.vue`          | 删除死样式 `.search-form`（scoped 且无引用）                           |
| `src/views/config/user/index.vue`              | 删除按钮 `primary → danger` + 删冗余 `:visible-count="3"`              |
| `src/views/config/system-config/index.vue`     | 删除按钮 `primary → danger` + 删冗余 `:visible-count="3"`              |
| `src/views/config/reward/index.vue`            | 删除按钮 `primary → danger` + 删冗余 `:visible-count="3"`              |
| `src/views/config/holiday/index.vue`           | 删除按钮 `primary → danger`                                            |
| `src/views/config/mail-task/index.vue`         | 删除按钮 `primary → danger`                                            |
| `src/views/config/mail/index.vue`              | 删除按钮 `primary → danger`                                            |
| `src/views/config/subject/index.vue`           | 删除按钮 `primary → danger`                                            |
| `src/views/config/pocket-money/index.vue`      | 删除按钮 `primary → danger`                                            |
| `src/views/config/morning-greeting/index.vue`  | 删除按钮 `primary → danger`                                            |
| `src/views/ai/prompt/index.vue`                | 删除按钮 `primary → danger`                                            |
| `src/views/love/anniversaries/index.vue`       | 删除按钮 `primary → danger`                                            |
| `src/views/love/records/index.vue`             | 删除按钮 `primary → danger`                                            |
| `src/views/notice/sysNotice/index.vue`         | 删冗余 `:visible-count="3"`                                            |
| `src/views/monitor/logs/system/index.vue`      | 删冗余 `:visible-count="3"`                                            |
| `src/views/monitor/ai-call-record/index.vue`   | 删冗余 `:visible-count="3"`                                            |
| `src/views/monitor/logs/login/index.vue`       | 删冗余 `:visible-count="3"`                                            |

## 二、每个文件修改原因

- **`RA_PAGINATION` 常量**：收敛分页 pageSize / pageSizes / layout / background，消除「库默认」与「画廊写死 `[15,30,60,100]`」两套配置。
- **`useCrudTable`**：原 `pageSize:10, background:true` 缺 `pageSizes/layout`，依赖库默认；现展开 `RA_PAGINATION`，`pageSizes` 克隆避免多页面共享同一可变数组。
- **画廊页**：原 `pageSize:30` + `[15,30,60,100]` 与全局不一致；统一为 `10` + `[10,20,50,100]`。
- **`--ra-radius-card`**：搜索面板/标准面板圆角由 6px 收敛到 8px（与 cache-monitor 等既有面板一致）。
- **label 字重**：全局表单 label 700 与查询表单 `.search-form` 的 400 割裂，统一为 400。
- **cache-monitor 表头**：只读表头底色 `lighter → light`，与标准列表页 `pure-table` 表头视觉统一；**未加 `adaptive`**（会撑破看板布局）。
- **删除按钮**：12 页 `link type="primary"` 与 5 页 `link type="danger"` 割裂，全项目统一为 `danger`（保留 `link` + 图标 + `reset-margin` + `popconfirm`）。
- **`visible-count`**：`ReSearchBar` 默认已是 3，删除 6 处冗余 `:visible-count="3"`；保留 7 处 `:visible-count="4"`（字段多，业务需要）。
- **`permission/menu` 死样式**：`.search-form` scoped 规则在模板无对应 class 引用，删除。

## 三、视觉规范变化

- 圆角：查询面板/标准卡片 = `8px`（token 统一）。
- 删除按钮语义：`danger` 红色（全局一致）。
- 表单 label：`400` 常规字重（全局一致）。
- 分页：业务列表统一 `10 / [10,20,50,100]` + `total, sizes, prev, pager, next, jumper` + 背景。

## 四、保留的特殊页面 / 特殊处理

- **画廊 `love/media`、`daily-image/manage`**：内部卡片半径（10/12px 等）属特殊业务布局，按 §XVIII 保留，仅收敛分页与删除语义。
- **`daily-image` 上传弹窗 `width=520px`**：业务内容相关，按 §XVII 保留（不强行改 480/680）。
- **看板 `cache-monitor` / 三类 provider-health**：保留各自业务布局，仅收敛表头底色。
- **`ReFriendPicker` / `ReIcon Select` 内部分页**：组件内部数据选择，不引用 `RA_PAGINATION`（按 §VIII 豁免）。

## 五、验证结果

- `pnpm typecheck`（`tsc --noEmit && vue-tsc --noEmit --skipLibCheck**`）：**全绿，无错误**。
- `eslint`（改动文件，不带 `--fix` 以免引入无关格式化 diff）：**全绿，无 warning**。
- `git diff --stat`：仅显示意图内行（删除按钮各 ±1 行、分页各 ±1~2 行、scss 各 1 行等）。
- **未触碰** `src/views/config/mail-task/form.vue`（用户既有 60 行修改，保持原样）。
- 未提交 Git（按规约等待指令）。

## 六、剩余不一致项（业务合理 / 留待 Phase 2）

1. 画廊内部卡片圆角（10/12px）—— 特殊业务布局，非列表页容器。
2. `welcome` 首页看板、`layout` 全局 chrome 的圆角/字重 —— 非列表页，不在本次范围。
3. `OperationButtons` 组件 —— 暂缓（审计判定：操作列业务差异仍多，抽早易膨胀 props/slots）。
4. `useListTable` 组合式 —— 未抽（8 个 `pure-table` 属性已全项目统一，抽了反而增间接层、降可读性）。
5. `daily-image` 弹窗 `520px` —— 业务内容相关，保留。

## 七、Phase 2 建议

- 视第一批试点反馈，再决定是否抽 `OperationButtons`（仅当操作列出现第 4+ 种稳定模式时）。
- 若后续新增标准列表页，直接 `useCrudTable` + `ReSearchBar` + `RePureTableBar` + `RA_PAGINATION`，无需重新约定。
- Dialog 统一（宽度三档 480/680/800 + 全走 `ReDialog`）可单独立项，与列表规范解耦。
