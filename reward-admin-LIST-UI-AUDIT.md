# reward-admin 前端列表页 UI 一致性审计报告

> 审计阶段：仅阅读源码、统计模式、定位不一致。**本阶段不修改任何代码 / 组件 / CSS / 接口，不提交 Git。**
> 审计范围：所有「查询条件 + 表格 + 分页」「查询 + 卡片/网格」「树 + 列表」「监控看板」类页面。
> 技术栈依据：`package.json` —— `pure-admin-thin` 6.2.0、Vue 3.5.22、Element Plus 2.11.5、`@pureadmin/table` 3.3.0。

---

## 1. 项目现状

### 1.1 技术底座

- 项目基于 **pure-admin-thin** 模板，列表页已大规模采用 `@pureadmin/table` 的 `PureTable` + `PureTableBar`（项目内封装为 `RePureTableBar`）。
- 全项目 `PureTableBar` 出现在 **30 个** `.vue` 文件中；其中 `views/**/index.vue` 列表页约 **24 个**作为主列表容器。
- 已存在的高质量公共能力（这是审计结论的重要前提——**大部分一致性问题已被 pure-admin 模板和项目自建组件兜底**）：

| 公共能力                                                                                                       | 位置                                           | 作用                                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `RePureTableBar`                                                                                               | `src/components/RePureTableBar/`               | 统一工具栏（标题 / 刷新 / 密度 / 列设置 / 全屏）+ `#buttons` 插槽，向默认插槽下发 `size` 与 `dynamicColumns` |
| `ReSearchBar`                                                                                                  | `src/components/ReSearchBar/index.vue`         | 配置式查询区（`SearchField[]`），含 搜索/重置/展开 按钮与宽度 token                                          |
| `ReDialog`                                                                                                     | `src/components/ReDialog/index.vue`            | 编程式弹窗，默认 取消/确定 底栏，`pure-dialog` 样式类                                                        |
| `useCrudTable`                                                                                                 | `src/views/config/composables/useCrudTable.ts` | 列表页 CRUD 数据层基类（分页/删除/重置）                                                                     |
| `useCrudDialog`                                                                                                | `src/hooks/useCrudDialog.ts`                   | 弹窗提交可靠性封装（防重复提交 / 校验失败不关窗）                                                            |
| `DictSelect` / `ReStatusSwitch` / `ReFriendPicker` / `ReMenuTree` / `ReJsonField` / `ReText` / `ReImageViewer` | `src/components/`                              | 业务型公共组件                                                                                               |
| 设计 token                                                                                                     | `src/style/index.scss`                         | `--ra-space-*`、`--ra-radius-card`、`--ra-shadow-card`、`--ra-search-width` 系列                             |

### 1.2 现状小结

- **表格渲染层已高度统一**：所有 `pure-table` 页面均固定 `align-whole="center"`、`table-layout="auto"`、`showOverflowTooltip`、`adaptive`、`adaptiveConfig="{ offsetBottom: 108 }"`、`header-cell-style` 背景 `var(--el-fill-color-light)`（grep `table-layout|align-whole|adaptiveConfig` 命中 29 个文件，且逐项阅读 `config/reward`、`permission/menu`、`monitor/logs/operation` 等确认）。
- **真正的不一致集中在三处**：① 操作列「删除」按钮的语义颜色（primary 蓝 vs danger 红）约五五开；② 分页 `pageSize` / `pageSizes` 默认值不统一；③ 少数页面（画廊 / 看板）完全绕开 `ReSearchBar` + `PureTableBar` 体系，使用自定义布局与自定义圆角/间距。
- **结论**：本项目不需要从零建立列表规范，而是**把已有 `ReSearchBar` / `RePureTableBar` / `useCrudTable` 的覆盖范围补齐 + 收敛几处颜色/分页/圆角离散值**即可消除 80% 的割裂感。

---

## 2. 列表页面清单

> 类型缩写：A=标准数据列表，B=带 Tabs/子页，C=左树右列表，D=高级/画廊/看板（特殊），E=监控看板。

| 页面         | 文件                                      | 查询区          | 表格                | 分页               | 操作列             | 弹窗                         | 类型 |
| ------------ | ----------------------------------------- | --------------- | ------------------- | ------------------ | ------------------ | ---------------------------- | ---- |
| 奖励配置     | `config/reward/index.vue`                 | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog(680)                | A    |
| 邮件配置     | `config/mail/index.vue`                   | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 邮件任务     | `config/mail-task/index.vue`              | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 用户配置     | `config/user/index.vue`                   | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除/**更多** | ReDialog                     | A    |
| 节假日       | `config/holiday/index.vue`                | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 系统配置     | `config/system-config/index.vue`          | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 零花钱       | `config/pocket-money/index.vue`           | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 科目         | `config/subject/index.vue`                | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 早安语       | `config/morning-greeting/index.vue`       | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 系统通知     | `notice/sysNotice/index.vue`              | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 提示词       | `ai/prompt/index.vue`                     | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 用户(RBAC)   | `permission/user/index.vue`               | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除/**更多** | ReDialog                     | A    |
| 角色(RBAC)   | `permission/role/index.vue`               | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 菜单(RBAC)   | `permission/menu/index.vue`               | 无（树）        | pure-table(tree)    | 无                 | 修改/删除          | ReDialog                     | C    |
| 版本日志     | `monitor/logs/version/index.vue`          | ReSearchBar     | pure-table          | useCrudTable(10)   | 详情/删除          | ReDialog                     | A    |
| 系统日志     | `monitor/logs/system/index.vue`           | ReSearchBar     | pure-table          | useCrudTable(10)   | 详情/删除          | ReDialog                     | A    |
| 操作日志     | `monitor/logs/operation/index.vue`        | ReSearchBar     | pure-table          | useCrudTable(10)   | 执行详情           | ReDialog                     | A    |
| 登录日志     | `monitor/logs/login/index.vue`            | ReSearchBar     | pure-table          | useCrudTable(10)   | 邮件详情           | ReDialog                     | A    |
| 登录日志(新) | `monitor/logs/login-log/index.vue`        | ReSearchBar     | pure-table          | useCrudTable(10)   | 详情               | ReDialog                     | A    |
| AI 调用记录  | `monitor/ai-call-record/index.vue`        | ReSearchBar     | pure-table          | useCrudTable(10)   | 详情/删除          | ReDialog                     | A    |
| 缓存列表     | `monitor/cache/index.vue`                 | ReSearchBar     | pure-table          | useCrudTable(10)   | 删除               | ReDialog                     | A    |
| 纪念日       | `love/anniversaries/index.vue`            | 无              | pure-table          | 无                 | 修改/删除          | ReDialog                     | A    |
| 恋爱记录     | `love/records/index.vue`                  | ReSearchBar     | pure-table          | useCrudTable(10)   | 修改/删除          | ReDialog                     | A    |
| 媒体文件     | `love/media/index.vue`                    | 无（上传/刷新） | **自定义网格**      | 原生[15,30,60,100] | 删除(link)         | 无                           | D    |
| 每日图片     | `daily-image/manage/index.vue`            | 自定义工具栏    | **自定义网格**      | 原生[15,30,60,100] | 批量删除/下载      | 原生 Dialog(520)/Drawer(600) | D    |
| 缓存监控     | `monitor/cache-monitor/index.vue`         | 无              | 多 pure-table(只读) | 无                 | 无                 | 无                           | E    |
| AI 服务健康  | `monitor/ai-provider-health/index.vue`    | 组件内筛选      | 组件内 pure-table   | 组件内             | 启用/禁用          | 无                           | E    |
| 图片服务健康 | `monitor/image-provider-health/index.vue` | 同上            | 同上                | 同上               | 同上               | 无                           | E    |
| 地理服务健康 | `monitor/geo-provider-health/index.vue`   | 同上            | 同上                | 同上               | 同上               | 无                           | E    |

> 说明：`ReSearchBar` 实际被 **21 个** `index.vue` 引用；未引用的主要是 树/画廊/看板类（菜单、纪念日、媒体、每日图片、缓存监控、三类 provider 健康）。

---

## 3. 查询区域问题

### 3.1 现在是什么

- **主流（21 页）**：`ReSearchBar` —— 配置式 `SearchField[]`，`el-form inline`，`label-width="auto"`，`padding:16px 24px 0`，固定按钮 **搜索/重置/展开**（展开阈值 `visibleCount`，默认 3）。
- **宽度 token 已统一**：`src/style/index.scss` 定义 `--ra-search-width` 系列（input 200 / lg 220 / sm 160；select 180 / sm 160；daterange 260；datetimerange 340），由 CSS 变量映射到 EP 各控件宽度，避免写死。
- **少数页面无查询区**：`permission/menu`（树）、`love/anniversaries`、`love/media`、`daily-image`、`cache-monitor` —— 这些属于树/画廊/看板，本就不需要标准查询条。
- **特殊页自定义查询**：`daily-image/manage` 用 `el-input + el-select + el-segmented` 自定义工具栏（`toolbar` 类，圆角 10px）；三类 provider 健康页在子组件内用「更多筛选」自定义。

### 3.2 问题

1. **P1** `ReSearchBar` 覆盖率 21/24（标准列表页），仍有 3 个标准列表页（`permission/menu` 除外）绕开它——但其中 `love/anniversaries` 实际是「无查询的数据列表」，可接受。
2. **P2** `ReSearchBar` 的 `visibleCount` 默认值不统一：多数页传 `3`（`config/reward`、`monitor/logs/login`），`monitor/logs/operation` 传 `4`。建议统一为项目常量（如 3）。
3. **P2** `permission/menu/index.vue:108` 残留一段针对 `.search-form` 的 scoped 样式（`margin-bottom:12px`），但本页并未使用 `ReSearchBar`——死代码，应删除。
4. **label 字重冲突（P2）**：`src/style/element-plus.scss:1` 全局 `.el-form-item__label { font-weight:700 }`，而 `.search-form` 覆盖为 `400`。导致**详情/表单页标签加粗、查询页标签常规**，视觉上不一致。建议查询与表单统一一套字重策略（推荐查询常规 400、表单常规 400，去掉全局 700）。

### 3.3 建议统一成什么

- 所有「有查询条件的标准列表页」一律使用 `ReSearchBar`；树/画廊/看板类允许无查询区或自定义工具栏（但需沿用 `.main` 容器与 token 圆角）。
- `visibleCount` 统一为常量 `3`，展开按钮文案/图标已统一（无需改）。
- 收敛 label 字重：查询与表单统一为 `400`（修改 `element-plus.scss` 全局 700 → 移除或改为 400）。

---

## 4. Table 问题

### 4.1 现在是什么（已统一，正面结论）

所有 `pure-table` 列表页逐项核对均为：

```
align-whole="center"  table-layout="auto"  showOverflowTooltip
adaptive  :adaptiveConfig="{ offsetBottom: 108 }"
:header-cell-style="{ background:'var(--el-fill-color-light)', color:'var(--el-text-color-primary)' }"
```

- 表头底色 `fill-color-light` 一致；操作列均居中对齐（`align-whole="center"` 已涵盖）。
- 行高/字号由 `PureTableBar` 下发的 `size`（用户持久化：宽松/默认/紧凑，默认 `default`）控制，用户可在工具栏切换——这是**一致性加分项**。

### 4.2 问题

1. **P2** 看板页 `cache-monitor` 的只读子表用了 `header-cell-style` 背景 `var(--el-fill-color-lighter)`（`index.vue:259/278/299`），比列表页的 `fill-color-light` 浅一档——同类表头底色不一致。建议看板只读表也用 `fill-color-light` 或抽成统一常量。
2. **P2** `monitor/cache-monitor` 的纯展示子表未设 `table-layout`/`adaptive`，在窄屏下列宽行为与主列表不同。
3. **特殊页无表格**：`daily-image`、`love/media` 用网格卡片代替表格，属业务特例，不应强改，但需保证卡片圆角/间距走 token。

### 4.3 建议统一成什么

- 列表页 `pure-table` 属性保持现状（已统一），把上述 8 个属性抽成 **`useListTable` 组合式返回的默认 column/table 选项**，新页面直接 spread，避免手敲遗漏。
- 看板只读表统一 `header-cell-style` 背景为 `var(--el-fill-color-light)`，并补齐 `table-layout="auto"`。

---

## 5. Pagination 问题

### 5.1 现在是什么

| 来源                                                       | pageSize | pageSizes          | layout                             | background |
| ---------------------------------------------------------- | -------- | ------------------ | ---------------------------------- | ---------- |
| `useCrudTable`（`config/composables/useCrudTable.ts:44`）  | **10**   | **未设置**         | **未设置**                         | true       |
| `ReFriendPicker`（`ReFriendPicker/index.vue:41`）          | 10       | 未设置             | 未设置                             | —          |
| `love/media`（`love/media/index.vue:182`）                 | 30       | **[15,30,60,100]** | total,sizes,prev,pager,next,jumper | true       |
| `daily-image/manage`（`daily-image/manage/index.vue:560`） | —        | **[15,30,60,100]** | total,sizes,prev,pager,next,jumper | true       |
| `config/mail-task/detail`（`detail.vue:28`）               | 10       | 未设置             | 未设置                             | —          |
| `ReIcon/Select`（`ReIcon/src/Select.vue:22`）              | 35       | 未设置             | 未设置                             | —          |

- `useCrudTable` 仅设 `pageSize:10` + `background:true`，**未设 `pageSizes` 与 `layout`**，因此依赖 `@pureadmin/table` 库默认值（与自定义页的 `[15,30,60,100]` 不一致）。
- 原生 `el-pagination` 页（`love/media`、`daily-image`）写死 `[15,30,60,100]`。

### 5.2 问题

1. **P1（明显割裂）** `pageSizes` 存在两套：`[10,20,30,40,50]`（库默认，useCrudTable 页）vs `[15,30,60,100]`（画廊页）——同一系统翻页选项不同。
2. **P1** `pageSize` 默认不统一：10（绝大多数）/ 30（media）/ 35（图标选择）。
3. **P2** `layout` 未集中定义，未来新增页可能写出不同顺序。

### 5.3 建议统一成什么

建立项目级 `PaginationProps` 常量（建议）：

```ts
// src/composables/useListTable.ts 或 src/utils/pagination.ts
export const RA_PAGINATION: PaginationProps = {
  pageSize: 10,
  pageSizes: [10, 20, 50, 100],
  layout: "total, sizes, prev, pager, next, jumper",
  background: true
};
```

- `useCrudTable` 改为 `Object.assign` 该常量，画廊页（`daily-image`、`love/media`）的 `el-pagination` 也引用同一 `pageSizes`/`layout`。
- `pageSize` 默认统一 **10**（媒体类若确需更大可显式覆盖，但需评审）。

---

## 6. Button / 操作列问题

### 6.1 现在是什么（已统一的部分）

- 操作列按钮**几乎全部**为：`class="reset-margin" link type="primary" :size="size" :icon="useRenderIcon(...)"`，删除包在 `el-popconfirm` 内。查看/详情/修改 一律 `link type="primary"`。
- 图标统一用 `useRenderIcon`（在线 iconify 或本地 `~icons/*`）。

### 6.2 问题（核心割裂点）

**删除按钮语义颜色五五开**（grep `useRenderIcon(Delete)` 全景核对）：

| 删除= `link type="danger"`（红色，5 页） | 删除= `link type="primary"`（蓝色，12 页） |
| ---------------------------------------- | ------------------------------------------ |
| `notice/sysNotice`                       | `config/reward`                            |
| `permission/user`                        | `config/mail`                              |
| `permission/menu`                        | `config/mail-task`                         |
| `permission/role`                        | `config/user`                              |
| `monitor/cache`                          | `config/holiday`                           |
|                                          | `config/system-config`                     |
|                                          | `config/pocket-money`                      |
|                                          | `config/subject`                           |
|                                          | `config/morning-greeting`                  |
|                                          | `love/anniversaries`                       |
|                                          | `love/records`                             |
|                                          | `ai/prompt`                                |

→ **同一个「删除」动作在 config/love/ai 模块是蓝色、在 permission/notice/cache 模块是红色**，肉眼明显不一致，且对危险操作语义表达混乱（蓝色删除弱化了破坏性）。

**其他操作列差异**：

- `config/user`（`index.vue:125`）与 `permission/user` 操作列多出 `el-dropdown`「更多操作」（上传头像/重置密码/分配角色）——这是**唯一使用下拉收纳次级操作的页面**，其余页没有「更多」概念。
- `daily-image` 操作列是 `type="danger" plain`（非 link），且为批量按钮（下载/删除），属画廊特例。
- 部分操作按钮未带图标或文案不统一（如 `monitor/logs/operation` 详情按钮文案随状态变「执行详情/异常详情」——属合理动态文案，非问题）。

### 6.3 建议统一成什么

1. **P0** 删除按钮统一为 **`link type="danger"`**（红色 + popconfirm）。把 12 个 primary 删除页改为 danger。这是视觉割裂最重、改动成本最低的一项。
2. 查看/详情/修改 维持 `link type="primary"`；启用/禁用维持 `link type="primary"`（或 `ReStatusSwitch`）。
3. **统一「更多」规则**：当某行次级操作 ≥ 3 个时，用 `el-dropdown`「更多操作」收纳（参考 `config/user` 写法），避免操作列过长；≤ 2 个直接平铺。
4. 提供 `<OperationButtons>` 或一组语义 slot 模板（见 §11），把「修改/删除/详情」三件套固化，新页面不再手敲。

---

## 7. 页面间距问题

### 7.1 现在是什么

- 标准列表页：根容器 `.main`（`src/style/index.scss:48`）= `display:flex; flex-direction:column; gap:16px`；查询区→表格间距由 `.main` 的 16px gap 提供；`PureTableBar` 卡片自身 `mt-2`（8px）+ `px-2 pb-2`。
- `search-form`：`padding:16px 24px 0`，内部 `form-item margin-bottom:16px`。
- 圆角离散（**P1**）：
  - `search-form` / `--ra-radius-card` = **6px**
  - `cache-monitor` 卡片 = **8px**
  - `daily-image` 工具栏/卡片 = **10px**
  - `love/media` 卡片 = **12px**
  - `PureTableBar` 卡片（`bg-bg_color`）= 无圆角（0）
- 弹窗/Drawer 内边距：由 `ReDialog`（`pure-dialog` 类，`element-plus.scss:46`）统一了 header padding/关闭按钮；但原生 `el-dialog`（`daily-image` 520px）走 EP 默认。

### 7.2 问题

1. **P1** 卡片圆角 4 套值（6/8/10/12），同一系统观感割裂。
2. **P2** 特殊页（看板/画廊）未用 `.main` 容器，间距靠各自 scoped 样式（16px/12px 混用），与标准页的 16px gap 不完全一致。
3. **P2** `daily-image` 工具栏 `padding:12px 16px`、卡片 `gap:14px`；`cache-monitor` 区块 `gap:12px`；标准页 `.main` gap 16px——小间距不统一。

### 7.3 建议统一成什么

- 引入统一圆角 token 并全量替换写死值：卡片/查询区/弹窗统一 `--ra-radius-card: 8px`（建议从 6 提到 8，与看板对齐；或保留 6 但把 8/10/12 全部收敛到 6）。**二选一并全量替换**。
- 所有列表/看板页统一包在 `.main`（或同等 `flex column gap:16px`）容器内；间距只依赖 token `--ra-space-md(16)`。
- 区块内 `gap` 统一为 `--ra-space-sm(12)`。

---

## 8. Dialog / Drawer 问题

### 8.1 现在是什么

- **主流（CRUD 表单）**：走 `useCrudDialog` → `addDialog`，`width` 默认 **680px**，限定 `480px | 680px | 800px`（`useCrudDialog.ts:8/68`）；`draggable`、`fullscreen: deviceDetection()`、`fullscreenIcon`、`closeOnClickModal:false`、`sureBtnLoading` 已统一。
- **特殊页原生弹窗**：`daily-image/manage` 用原生 `el-dialog width="520px"`（上传）与 `el-drawer size="600px"`（详情），且 Drawer 内是自己写的 collapse + dl 字段布局，未复用任何公共详情组件。

### 8.2 问题

1. **P1** 弹窗宽度出现第 4 个值 `520px`（daily-image），与 CRUD 的 480/680/800 体系不兼容。
2. **P2** `daily-image` 的 Drawer 详情布局完全手写，与潜在的其他「详情抽屉」无复用；若未来多处需要详情抽屉，会再次分化。
3. **P2** 原生 `el-dialog`（daily-image）未享受 `pure-dialog` 的 header/footer 统一样式（虽 EP 默认差异不大，但全量走 `ReDialog` 更稳）。

### 8.3 建议统一成什么

- 所有弹窗统一走 `ReDialog`（编程式 `addDialog`），宽度只取 `480/680/800` 三档（在 `CrudDialogWidth` 已约束；其他场景也禁止出现 520 之类游离值）。
- `daily-image` 的上传/详情改为 `ReDialog` + `ReDrawer`（或复用现有 `ReDialog`，详情用 Drawer 时封装 `ReDetailDrawer`）。
- 详情类展示统一一套字段布局组件（参考 `daily-image` 已有的 `dl.drawer-body__fields` 网格，抽为 `ReDescList`/`ReDetailPanel`）。

---

## 9. 现有公共组件分析

| 组件                         | 覆盖度             | 评价                                    | 是否需要改                                   |
| ---------------------------- | ------------------ | --------------------------------------- | -------------------------------------------- |
| `RePureTableBar`             | 24+ 列表页         | 工具栏/列设置/密度/全屏已统一，质量高   | 仅补 `#buttons` 书写约定                     |
| `ReSearchBar`                | 21/24 标准列表页   | 查询布局/宽度/按钮已统一                | 把 `visibleCount` 默认常量化；覆盖剩余标准页 |
| `ReDialog` + `useCrudDialog` | 全部 CRUD 表单     | 宽度/提交可靠性已统一                   | 约束游离宽度值                               |
| `useCrudTable`               | config 等模块      | 分页基类                                | 补 `pageSizes`/`layout` 常量                 |
| `pure-table` 属性            | 全部列表页         | 8 属性已统一                            | 抽 `useListTable` 防手敲遗漏                 |
| 操作列                       | 25 个 `#operation` | link+icon+popconfirm 已统一，仅颜色分裂 | 收敛删除颜色 + 固化三件套                    |

**结论**：项目已具备 70% 的统一基础设施，**不需要新建「列表页大组件」**，缺的是：① 把分页默认值、删除颜色、圆角 token 这三处离散值收敛；② 把 `useCrudTable` 的分页常量、操作列三件套固化成可复用片段。

---

## 10. 建议的统一设计规范（基于现有实际样式，不凭空设计）

### 10.1 页面结构

```
.main  (flex column, gap:16px, 全局容器)
 ├── ReSearchBar        (有查询条件时；无则用 .toolbar 自定义但沿用 token)
 ├── PureTableBar        (title + #buttons：新增/导出；刷新/密度/列设置/全屏内置)
 │    └── pure-table      (align-whole=center, table-layout=auto, adaptive, offsetBottom:108)
 │         └── #operation (修改 link-primary / 删除 link-danger / 详情 link-primary / 更多 dropdown)
 └── (分页由 pure-table :pagination 内置，或原生 el-pagination 引用 RA_PAGINATION)
```

### 10.2 查询区

- 布局：一律 `ReSearchBar`（`el-form inline`，`label-width:auto`）。
- 宽度：沿用 `--ra-search-width` token（input 200 / select 180 / daterange 260），不写死。
- 按钮：**搜索（primary+icon）/ 重置（default+icon）/ 展开（link primary）**，顺序固定。
- `visibleCount` 统一常量 `3`。

### 10.3 Table

- 固定 8 属性（见 §4.3），经 `useListTable` 下发。
- 空数据：依赖 `pure-table` 默认空态；画廊页用 `el-empty`。

### 10.4 Pagination（项目常量 `RA_PAGINATION`）

- `pageSize:10`、`pageSizes:[10,20,50,100]`、`layout:"total, sizes, prev, pager, next, jumper"`、`background:true`。

### 10.5 Button / 操作列

- 主操作（新增/导出/上传）：`type="primary"` + `useRenderIcon` 图标。
- 行内操作：一律 `link` + `:size="size"` + `useRenderIcon` 图标 + `reset-margin`。
- **修改/详情/启用** = `link type="primary"`；**删除** = `link type="danger"`（包 `el-popconfirm`）。
- 次级操作 ≥3 → `el-dropdown`「更多操作」。

### 10.6 Dialog / Drawer

- 宽度三档：`480 / 680 / 800`（由 `CrudDialogWidth` 约束），禁止游离值。
- 全部走 `ReDialog`/`useCrudDialog`；详情抽屉封装 `ReDetailDrawer`。

### 10.7 视觉 token（统一后）

- 圆角：卡片/查询/弹窗统一 `--ra-radius-card`（建议 **8px**，全量替换 6/10/12）。
- 间距：`--ra-space-xs(8)/sm(12)/md(16)/lg(24)`。
- 标签字重：查询与表单统一 `400`（移除 `element-plus.scss` 全局 `700`）。

---

## 11. 建议新增的公共组件

| 组件                                      | 是否建议           | 使用范围                     | 原因 / API 草图                                                                                                                                   |
| ----------------------------------------- | ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useListTable`                            | **是**             | 所有 pure-table 页           | 固化 8 个 table 属性 + `RA_PAGINATION`，返回 `{ tableAttrs, pagination }`，页面 `v-bind="tableAttrs"`；避免手敲遗漏                               |
| `RA_PAGINATION` 常量                      | **是**             | 所有分页                     | 集中 pageSize/pageSizes/layout/background；`useCrudTable` 与画廊页共用                                                                            |
| `<OperationButtons>` 或 `#operation` 片段 | **是（轻量）**     | 25 个操作列                  | props：`row`、`edit?`、`detail?`、`remove?`、`more?[]`；渲染统一的 link 按钮 + popconfirm；新页面 `<OperationButtons :row="row" :edit :remove />` |
| `ReDetailDrawer`                          | **谨慎**           | 详情类抽屉（daily-image 等） | 统一抽屉头/字段网格布局，抽自 `daily-image` 的 `dl` 结构；仅当详情页 ≥2 时引入                                                                    |
| `ListPage` 大容器                         | **否（过度抽象）** | —                            | `.main + ReSearchBar + PureTableBar` 已足够清晰，包一层反而增加理解成本                                                                           |
| `DataTable`                               | **否**             | —                            | `pure-table` + `RePureTableBar` 组合已满足，再封装会丢失列配置灵活性                                                                              |

> 原则：**不为了抽象而抽象**。只抽「能统一 60%~80% 页面且不会让复杂页为适配而变复杂」的三样东西：分页常量、table 属性组合式、操作列三件套。

---

## 12. 页面分类

- **A. 标准列表页（必须统一，约 21 页）**：全部 config/notice/ai/permission(logs)/monitor(logs) 页 —— 已高度统一，仅需收敛删除颜色 + 分页常量。
- **B. 带 Tabs/子页**：本项目无典型 Tabs 列表页（可暂不单列）。
- **C. 左树右列表（1 页）**：`permission/menu` —— 树无查询区，表格统一，保持现状。
- **D. 画廊/特殊（2 页）**：`love/media`、`daily-image/manage` —— 允许保留网格布局，但分页 `pageSizes`、圆角、弹窗宽度需向 token 收敛。
- **E. 监控看板（4 页）**：`cache-monitor` + 三类 provider 健康 —— 允许特殊布局，需统一卡片圆角(8)与只读表头底色，弹窗走 `ReDialog`。

> 必须统一：A 类全部 + D/E 的离散值。允许保留特殊布局：C/D/E 的整体结构。

---

## 13. 整改优先级

### P0（严重割裂，低成本）

- 删除按钮颜色：12 个 primary 页 → `link type="danger"`（§6.2）。

### P1（建议统一）

- 分页 `pageSizes`/`pageSize` 不统一 → 引入 `RA_PAGINATION`（§5）。
- 卡片圆角 4 套值 → 统一 `--ra-radius-card`（§7）。
- 弹窗宽度游离 `520px` → 收进 `ReDialog` 三档（§8）。
- 看板只读表头底色 `lighter` vs `light` 不一致（§4.2）。

### P2（细节优化）

- `visibleCount` 默认常量（§3.2）。
- label 字重 700 vs 400 冲突（§3.2）。
- `permission/menu` 死代码 `.search-form` 样式（§3.2）。
- 画廊/看板间距 `gap` 统一为 `--ra-space-sm`（§7.2）。
- 统一「更多操作」下拉规则（§6.3）。

---

## 14. 分阶段整改计划（仅规划，本阶段不执行）

```
Phase 1  建立规范
  - 新增 src/utils/pagination.ts（RA_PAGINATION）+ src/composables/useListTable.ts
  - 在 src/style/index.scss 确定统一圆角值，新增操作列语义说明（文档/注释）
  - 文件：src/style/index.scss、src/utils/pagination.ts（新）、src/composables/useListTable.ts（新）

Phase 2  抽公共组件
  - 实现 OperationButtons（或 #operation 片段）、ReDetailDrawer（按需）
  - 文件：src/components/OperationButtons/（新）、src/components/ReDetailDrawer/（新，按需）

Phase 3  试点 3~5 页
  - 选 config/reward、notice/sysNotice、permission/user、love/records、ai/prompt
  - 验证 RA_PAGINATION + useListTable + OperationButtons 是否顺手

Phase 4  验证合理性
  - 跑 typecheck（tsc --noEmit && vue-tsc --noEmit）+ lint；确认无回归

Phase 5  批量迁移标准列表页（A 类）
  - 删除颜色 danger 化、pagination 引用常量、table 属性走 useListTable

Phase 6  处理特殊页（D/E）
  - daily-image/love/media 分页与弹窗收敛；cache-monitor/provider 健康圆角与表头底色

Phase 7  全项目扫描消灭残留
  - grep 游离 width/pageSizes/半径值；补 unit/视觉走查
```

---

## 15. 第一批建议整改页面（P0，最低风险最高收益）

| 顺序 | 页面                                | 改动                               | 风险 |
| ---- | ----------------------------------- | ---------------------------------- | ---- |
| 1    | `config/reward/index.vue`           | 删除按钮 `type="primary"`→`danger` | 极低 |
| 2    | `config/mail/index.vue`             | 同上                               | 极低 |
| 3    | `config/mail-task/index.vue`        | 同上                               | 极低 |
| 4    | `config/user/index.vue`             | 同上                               | 极低 |
| 5    | `config/holiday/index.vue`          | 同上                               | 极低 |
| 6    | `config/system-config/index.vue`    | 同上                               | 极低 |
| 7    | `config/pocket-money/index.vue`     | 同上                               | 极低 |
| 8    | `config/subject/index.vue`          | 同上                               | 极低 |
| 9    | `config/morning-greeting/index.vue` | 同上                               | 极低 |
| 10   | `love/anniversaries/index.vue`      | 同上                               | 极低 |
| 11   | `love/records/index.vue`            | 同上                               | 极低 |
| 12   | `ai/prompt/index.vue`               | 同上                               | 极低 |

> 同步在 `Phase 1` 落地 `RA_PAGINATION` 常量并让 `useCrudTable` 引用，可一次性修掉所有 useCrudTable 页的分页默认值（覆盖上述 12 页 + 其余 config/permission/notice/monitor 页）。

---

## 16. 风险与注意事项

1. **删除颜色改动需同步评审文案/权限**：删除按钮改为 danger 仅改 `type`，不影响 `v-perms` 与 `el-popconfirm` 逻辑，风险低；但需确认 `config/*` 业务上「删除」确实是破坏操作（目前均带 popconfirm，符合）。
2. **分页 `pageSizes` 变更会影响用户习惯**：将画廊页 `[15,30,60,100]` 改为 `[10,20,50,100]` 属产品决策，需与业务确认；建议先在 `RA_PAGINATION` 定标，再逐页引用。
3. **`useCrudTable` 是共享基类**：改其 `pagination` 初始值会影响所有引用页（config/permission/notice/monitor 等），必须在 `Phase 4` 跑全量 typecheck + 回归。
4. **不要动画廊/看板的结构**：`daily-image`、`love/media`、`cache-monitor`、provider 健康页的业务布局是合理的，仅收敛其离散的 token 值（圆角/分页/宽度），不重构交互。
5. **`PureTableBar` 的 `size` 是用户持久化偏好**：不要强行把表格 `size` 写死为某个值，保留「宽松/默认/紧凑」切换能力。
6. **禁止本阶段任何写操作**：以上均为方案，落地待下一阶段指令。

---

> **状态**：审计完成，所有结论基于实际源码（已标注文件路径与行号）。**等待下一阶段指令（是否进入 Phase 1 规范落地 / 先修 P0 删除颜色 / 其他）。**
