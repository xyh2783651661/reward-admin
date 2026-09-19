# reward-admin 特殊页面标准化评估（Phase 1 后复盘）

> 阶段性质：**评估 + 设计方案**（只读）。不修改代码、不提交、不 push。
> 配套：上阶段的《reward-admin-LIST-UI-AUDIT.md》《reward-admin-PHASE1-REPORT.md》。

---

## 0. 最重要的元结论（修正上一阶段假设）

上一阶段审计把 8 个页面列为「特殊页面」，本阶段逐文件重读后，**结论需要修正**：

- **`love/anniversaries`、`permission/menu` 其实已是完全标准 CRUD**——它们用 `.main` + `PureTableBar` + `pure-table`（8 个标准属性齐全）+ 标准操作列（修改 `link primary` / 删除 `link danger` + popconfirm）。`permission/menu` 是「树表」变体，菜单管理天然是树，属于标准允许的变体，不是特殊结构。
  → **二者应从特殊清单移除，无需任何改造。**
- 剩余 6 个里，5 个的**页面骨架其实已经接入标准体系**（只是 Content 是 Grid/看板，或内层表已标准），真正「历史遗留、未接入标准查询体系」的只有 **2 处**：
  1. `check-record.vue` / `alert-record.vue`（provider-health 内层）用**裸 `el-form :inline` 查询栏**绕过 `ReSearchBar`，但表格本身已是标准；
  2. `daily-image/manage` 的**整页 chrome 全自定义**（不套 `.main`、不套 `PureTableBar`、不套 `ReSearchBar`），但分页已接 `RA_PAGINATION`。

> 即：项目页面一致性比上阶段审计判断的更好。大多数「特殊页」只是 **Content 特殊（网格/看板）**，而 **chrome（工具栏/表格/分页）已标准化**。统一的是设计体系与页面骨架，不是强制所有页面长得一模一样。

---

## 1. 页面标准化评估表

| #   | 页面                                     | 当前结构                                                                              | 核心业务                       | 是否 CRUD               | 必须特殊布局?                   | 标准化建议                                                                         | 改造难度 | 等级                       |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------ | ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------- | -------- | -------------------------- |
| 1   | `love/anniversaries`                     | `.main`+`PureTableBar`+`pure-table`(8属性)+标准操作列                                 | 纪念日管理                     | 是(增改删)              | 否                              | **移出特殊清单，无需改**                                                           | 无       | L3(已是标准)               |
| 2   | `permission/menu`                        | `.main`+`PureTableBar`+`pure-table`(树表+8属性)+标准操作列                            | 菜单管理(树)                   | 是(增改删)              | 否(树表是标准变体)              | **移出特殊清单，无需改**                                                           | 无       | L3(已是标准)               |
| 3   | `love/media`                             | `PureTableBar`(标题/上传/刷新)+自定义`media-grid`+`RA_PAGINATION`+删除`danger`        | 媒体文件浏览(网格)             | 查+删(+上传)            | 否(网格内容业务必要,骨架已标准) | 保持；仅卡片圆角 `12px→8px` token 对齐(可选)                                       | 低       | L2(骨架已标准)             |
| 4   | `daily-image/manage`                     | 自定义`.toolbar`+`image-grid`+浮动`batch-bar`+自定义`el-pagination`/`dialog`/`drawer` | 图库(网格+多选+批量+上传+详情) | 查(当前页)+删+批量+上传 | 部分(网格必要;chrome 待统一)    | L1：包进 `.main`；可选 `PureTableBar` 接管标题/刷新/上传；**不强行 `ReSearchBar`** | 中       | L2(内容特殊,chrome 待统一) |
| 5   | `monitor/cache-monitor`                  | 多只读信息表+卡片(dashboard)                                                          | 缓存监控                       | 查(只读)                | 是(看板)                        | L1：视觉 token 已统一(`fill-color-light`)；保持结构                                | 低       | L1(看板)                   |
| 6   | `monitor/ai-provider-health`             | `el-tabs`+Hero+`ProviderStatus`卡片网格+`CheckRecord`/`AlertRecord`表                 | AI 服务健康监控                | 查/状态/批量启停        | 是(看板)                        | L0/L1：顶层保持；内层表已标准                                                      | 低       | L0(看板)+内层L3            |
| 7   | `monitor/image-provider-health`          | 同上(仅标题不同)                                                                      | 图片源健康监控                 | 同上                    | 是                              | 同 #6                                                                              | 低       | L0+内层L3                  |
| 8   | `monitor/geo-provider-health`            | 同上(仅标题+pool 绑定不同)                                                            | 地理源健康监控                 | 同上                    | 是                              | 同 #6                                                                              | 低       | L0+内层L3                  |
| 9   | `check-record.vue`(provider-health 内层) | `PureTableBar`+`pure-table`(8属性,内置分页)+**裸 `el-form :inline` 查询栏**           | 检测流水(列表)                 | 查+导出+解决            | 否(表已标准;仅查询栏裸)         | **迁 `ReSearchBar`**(真正的「历史遗留」点)                                         | 中       | L2→L3                      |
| 10  | `alert-record.vue`(provider-health 内层) | 同 #9                                                                                 | 告警记录(列表)                 | 查+批量解决             | 否                              | 同 #9                                                                              | 中       | L2→L3                      |

> 说明：#9/#10 不在原 8 项清单内，但本阶段发现它是**最该标准化**的页面——表格 100% 标准，唯独查询栏绕过 `ReSearchBar`，正是用户要找的「单纯因历史单独开发而未接入标准查询体系」的典型。

---

## 2. 重点页面逐项判断

### 2.1 `love/media`（L2，已是标准骨架，Content 为 Grid）

- 已用 `PureTableBar` 标题「媒体文件」+ `#buttons`(上传文件/刷新)、`RA_PAGINATION`、删除 `link danger`。
- 唯一非标准：Content 是 `.media-grid`(CSS Grid 的 `.media-card`)，且卡片 `border-radius:12px`（未吃 `--ra-radius-card`）。
- **判断**：媒体缩略图浏览用 Grid 是业务必要，**不能强改 Table**（会毁 UX）。骨架已标准，只差视觉 token。
- 现状已有：上传走隐藏 `<input type=file multiple>`；删除用 `ElMessageBox.confirm`（与标准 popconfirm 语义等价）。
- **建议**：`--ra-radius-card:8px` 已建立，将 `.media-card` 的 `12px` 改为 `var(--ra-radius-card)`（一行，可选）。

### 2.2 `daily-image/manage`（L2，唯一 chrome 全自定义的页面）

- 结构：自定义 `.toolbar`(原始 `el-input`+`el-select`+`el-segmented`+按钮) → `image-grid`(卡片网格+多选) → 浮动 `batch-bar` → 自定义 `el-pagination`(已接 `RA_PAGINATION`) → `el-drawer`(详情 600px)+`el-dialog`(上传 520px)。
- **是否必须特殊**：
  - Grid 内容：必须（图库浏览）。
  - `segmented` 密度控制：是**展示控制**，不是查询字段 → 不属于 `ReSearchBar` 的字段模型，放在 `PureTableBar` 右侧区或保留均可。
  - `keyword` 搜索：**仅过滤当前页（客户端）**，语义与 `ReSearchBar`（服务端查询+搜索/重置）不同，强行套会误导。
  - 上传 `el-dialog`/详情 `el-drawer`：业务内容相关（拖拽上传、左右切换），Phase 1 §XVII 已判定保留。
- **结论**：Content 特殊合理；但**整页不套 `.main` 容器、不套 `PureTableBar`** 是「看起来不属于同一系统」的根因。
- **改造后结构（建议）**：
  ```
  .main
   ├─ RePureTableBar(title="图片管理"; #buttons: 上传图片/刷新; 右侧放 segmented)
   ├─ ImageGrid(原 image-grid,保留多选/批量/卡片)
   ├─ RA_PAGINATION(已接)
   └─ 详情 el-drawer / 上传 el-dialog(保留)
  ```

  - 最低成本一致性动作：把 `<div class="daily-image-page">`(自带 `padding:16px`) 换成 `<div class="main">`，让页面容器与全站一致（`.daily-image-page` 的 `position:relative`+`min-height:400px` 可保留为附加类）。

### 2.3 `permission/menu`（L3，已是标准，移出特殊清单）

- `.main`+`PureTableBar`(新增菜单/导出)+`pure-table`(`tree-props`+8属性)+操作列(修改 primary/删除 danger+popconfirm)。
- 无查询区（已删死 `.search-form` CSS，见 Phase 1 报告）。
- **结论**：树表是标准变体，无需改造。

### 2.4 `love/anniversaries`（L3，已是标准，移出特殊清单）

- `.main`+`PureTableBar`(新增纪念日)+`pure-table`(8属性)+操作列(修改 primary/删除 danger+popconfirm)。
- **结论**：纯标准 CRUD，无需改造。

### 2.5 `cache-monitor`（L1，看板，保留结构）

- 多张只读信息表嵌在卡片里（Redis info / 命令统计 / 内存等），属监控看板。
- 表头 `fill-color` 已在 Phase 1 统一为 `light`。
- **结论**：看板业务必要，保持结构；仅视觉 token 已统一，无需结构改造。

### 2.6 三个 provider-health（L0/L1 看板 + 内层 L3）

- 顶层：`el-tabs`(border-card)+Hero 头+`el-alert` 上下文+三 `el-tab-pane`(`ProviderStatus` 卡片网格 / `CheckRecord` / `AlertRecord`)。
- 三页**几乎完全相同**（仅 `<h1>` 标题 + `geo` 多了 `poolName` 绑定），是历史复制粘贴产物。
- 内层 `ProviderStatus`：卡片网格（监控看板，业务必要）。
- 内层 `CheckRecord`/`AlertRecord`：**已是标准列表页**（`PureTableBar`+`pure-table` 8 属性+`pure-table` 内置 `:pagination="{...pagination,size}"`+操作列），**唯一例外是查询栏用裸 `el-form :inline`**（见 2.7）。
- **结论**：顶层看板保留；内层表已是标准，仅查询栏待统一。

### 2.7 `check-record.vue` / `alert-record.vue`（L2→L3，最该标准化的页面）

- 现状（line 83-92 / 83-90）：
  ```vue
  <el-form
    ref="formRef"
    v-search-enter="onSearch"
    :inline="true"
    :model="form"
    class="filter-bar bg-bg_color w-full pl-4 pt-[12px] overflow-auto"
  >
    <el-form-item label="供应商"><el-select .../></el-form-item>
    <el-form-item label="结果/状态"><el-select .../></el-form-item>
    <el-form-item label="检测时间/告警时间"><el-date-picker .../></el-form-item>
    <el-form-item><el-popover>更多筛选(2个select)</el-popover></el-form-item>
    <el-form-item><el-button 搜索/><el-button 重置/><el-button 导出/></el-form-item>
  </el-form>
  ```
- **判断**：这是全项目**唯一**用裸 `el-form inline` 做查询栏的列表页（上阶段审计的 `el-form inline` grep 因跨行未命中，靠逐文件阅读才发现）。表格已 100% 标准，唯独查询栏绕过了 `ReSearchBar`——正是用户要找的「历史单独开发、未接入标准查询体系」的典型。
- **可迁移性**：字段均可映射为 `ReSearchBar` 的 options（`visibleCount=3`：供应商/结果/时间 可见，「更多筛选」的 2 个 select 作为展开项；搜索/重置/导出按钮放入 `#buttons` 或 `ReSearchBar` 的标准按钮位）。
- **改造后结构**：
  ```
  ReSearchBar(:options=供应商/结果/时间/更多×2; @search=onSearch)
  RePureTableBar(title; #buttons: 导出/批量解决)
  PureTable(:pagination="{...pagination,size}")
  el-drawer(详情,保留)
  ```
- **风险**：`更多筛选` 是 popover 高级筛选，映射到 `ReSearchBar` 的「展开」需在选项里配置；`v-search-enter` 回车搜索需确认 `ReSearchBar` 是否支持（支持，组件内置）。

---

## 3. 用户八问回答

### 3.1 哪些特殊页面应该改成标准页面？

- **`check-record.vue` + `alert-record.vue`**：查询栏迁 `ReSearchBar`（表格已标准，改造最干净、收益最高）。
- **`daily-image/manage`**：包进 `.main` + 可选 `PureTableBar` 接管 chrome（内容 Grid 保留）。

### 3.2 哪些特殊页面不应该改？

- `love/anniversaries`、`permission/menu`：已是标准，**移出特殊清单**（上阶段误列）。
- `love/media`：Grid 内容业务必要，骨架已标准，仅 token 对齐。
- `cache-monitor`、三个 `provider-health` 顶层：看板业务必要，保留结构。

### 3.3 每个页面为什么？（见 §1 表 + §2）

### 3.4 改造后的页面结构？（见 §2.2 / §2.7）

### 3.5 哪些现有代码可以删除？

- `check-record.vue` / `alert-record.vue` 的 `.filter-bar` 自定义 CSS（迁 `ReSearchBar` 后删除）。
- （Phase 2 候选）三个 `provider-health` 顶层页 90% 重复 + Hero 头 CSS 重复 3 份 → 合并为参数化单页后删 2 份。
- `daily-image/manage` 的 `.toolbar`/`.batch-bar` CSS（若迁 `PureTableBar`，部分可删；高风险，递延）。

### 3.6 哪些公共组件可以直接复用？

- `ReSearchBar`：#9/#10 查询栏。
- `PureTableBar`：`daily-image/manage` chrome。
- `RA_PAGINATION`：已接 `love/media`+`daily-image`；cache/provider 多为只读表，不适用。
- `ReDialog`/`ReDrawer`：`daily-image` 上传/详情（递延，Phase 1 §XVII）。

### 3.7 哪些地方需要新增轻量公共组件？

- **`ReStatHero`**（可选）：Hero 头模式出现在 `notice/sysNotice` + 3×`provider-health`（共 4 处）。若合并 provider-health 顶层页，可抽；否则不抽（单一使用方时不抽象）。
- **不新增**：`ListPage`/`DataTable`/`useListTable`/`OperationButtons`（上阶段已定，避免过度抽象）。

### 3.8 改造优先级

- **P0（最明显历史遗留，低风险高收益）**：`check-record.vue` + `alert-record.vue` 查询栏迁 `ReSearchBar`。
- **P1（低成本接入标准体系）**：`daily-image/manage` 包 `.main` + 卡片圆角 token 对齐（`10px→8px`）+ 可选 `PureTableBar` 接管 chrome。
- **P2（需较大业务重构，谨慎）**：3× `provider-health` 顶层页去重合并为参数化单页 + 抽 `ReStatHero`。
- **保留（确实应特殊）**：`love/media` Grid、`cache-monitor` 看板、3× `provider-health` 看板结构、各页 Grid/Drawer 内容。

---

## 4. 与上一阶段审计的差异说明

| 上阶段判断                        | 本阶段复核结论                                                       | 依据                                             |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `love/anniversaries` 是特殊页     | 已是标准 CRUD                                                        | 重读 `love/anniversaries/index.vue` 全文 88 行   |
| `permission/menu` 是特殊页(树+表) | 已是标准树表 CRUD                                                    | 重读 `permission/menu/index.vue` 全文 107 行     |
| 特殊页均有自定义查询栏            | 仅 #9/#10 裸 `el-form inline`；其余已用 `ReSearchBar`/`PureTableBar` | 逐文件阅读 + `ReSearchBar` 引用清单(21 页)       |
| `daily-image` 是重点标准化候选    | 是，但仅 chrome 待统一，Content Grid 合理保留                        | 重读 `daily-image/manage/index.vue` 全文 1088 行 |

---

## 5. 下一步建议（等待指令）

本阶段只产出方案。若进入落地：

- **推荐先做 P0**（2 个查询栏迁 `ReSearchBar`）：范围小、表格已标准、收益直观，且能顺带验证 `ReSearchBar` 对「高级筛选 popover + 多 select + daterange」的表达力。
- 再做 P1（`daily-image` 容器与 token 对齐）。
- P2 合并 provider-health 顶层页作为单独重构议题，不在本系列强制范围。

> 全程守界：不新建大容器、不改业务/接口/路由/权限、不破坏 Grid/Drawer 业务交互。
