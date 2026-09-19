# reward-admin UI/交互展示优化实施方案

> 适用场景：本文件可直接交给 Coding Agent 逐项执行。
> 执行原则：**按 TASK 编号顺序执行，每个 TASK 完成后跑一次 `pnpm typecheck` 和 `pnpm lint:eslint`，全部通过再进入下一个 TASK。**
> 所有结论均来自对 `D:\pri-project\reward-admin` 当前代码的逐文件核查，证据以 `文件:行号` 标注。

---

# 1. 项目整体审计结论

## 1.1 技术栈基线（不可更换）

| 项    | 现状                                                                            | 约束                         |
| ----- | ------------------------------------------------------------------------------- | ---------------------------- |
| 框架  | Vue 3.5 + `<script setup>` + TS                                                 | 保持                         |
| UI 库 | Element Plus 2.11                                                               | **不得更换**，全部优化基于它 |
| 表格  | `@pureadmin/table`（el-table 封装，支持 `adaptive` / `hide` 列 / 列显隐工具栏） | 保持                         |
| 弹窗  | `@/components/ReDialog`（`addDialog` 命令式）                                   | 保持                         |
| 样式  | Tailwind v4 + SCSS + Element Plus CSS Var                                       | 保持                         |
| 请求  | `src/utils/http/index.ts`（axios 封装）                                         | 保持                         |
| 构建  | Vite 7 + pnpm                                                                   | 保持                         |

**本次优化不引入任何新的第三方依赖。**

## 1.2 整体评分

| 维度       | 评分  | 说明                                                                                                                                                                           |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 整体完成度 | ★★★★☆ | 业务功能齐全，22 个 api 模块 / 154 个视图文件，覆盖 配置 / 监控 / 日志 / 内容 / 权限 五大域                                                                                    |
| UI 一致性  | ★★☆☆☆ | **最弱项**。115 处写死宽度（`w-[180px]!` 等）；26 处 `addDialog` 宽度从 `40%` 到 `800px` 有 7 种取值；`<div class="main">` 在 23 个页面使用但**全项目无任何 `.main` 样式定义** |
| 交互体验   | ★★☆☆☆ | **18/26 个弹窗无防重复提交**；5 个页面的状态开关用 `setTimeout(300)` 假 loading；5 个页面提交失败也会关窗并提示成功                                                            |
| 数据展示   | ★★★☆☆ | 表格基础设施好（`adaptive` + 列显隐 + 操作列固定），但**列默认全展开**，ID/创建时间/更新时间 三列占了近 400px，1366px 下必然横向滚动                                           |
| 代码结构   | ★★☆☆☆ | `config/*` 九个页面高度同构（复制粘贴），三套 provider-health 约 95% 重复；4 个超 700 行的巨型文件                                                                             |
| 响应式     | ★★★☆☆ | 无移动端适配需求（后台系统），桌面端 1366~1920 可用，但**列表表格在 1366px 下横向滚动**                                                                                        |

## 1.3 总体评价

项目的**骨架是健康的**：统一用 `PureTableBar + pure-table + addDialog + el-popconfirm + message()`，已经有了事实上的页面规范雏形，`holiday` / `system-config` / `permission/*` / `daily-image` 四个模块是**质量标杆**（有 `sureBtnLoading`、真实 loading、`closeLoading()` 正确控制、空值 formatter 返回 `-`、Promise.allSettled 局部容错）。

真正的问题不在「设计不好看」，而在**三处系统性缺陷**：

1. **交互可靠性缺失** —— 弹窗无防重复提交、失败也关窗、开关用假 loading、`console.error` 吞异常（57 处）。用户会遇到「点了没反应」或「报成功但实际失败」。
2. **复制粘贴扩散** —— `config/reward` 带着一整套**根本不存在的「菜单权限」树面板**（数据来自 `mockLoadTreeData`），`config/subject` 和 `config/user` 带着计算树高但页面上**根本没有树**的死代码。这些是直接从角色管理页复制后没清理的。
3. **信息密度失控** —— 表格列默认全开，低价值列（ID / 创建时间 / 更新时间）挤占空间，导致 1366px 横向滚动。

**结论：不需要重做，只需要「收敛规范 + 修补可靠性 + 清理残留」。** 预计改动约 45 个文件，其中 30 个为小范围修改，不触碰任何后端接口。

---

# 2. 全局设计优化方案

## 2.1 色彩规范（全部复用 Element Plus CSS Var，不新增硬编码色值）

```text
主色        var(--el-color-primary)       #4091f7（沿用项目主题）
成功        var(--el-color-success)       #67c23a
警告        var(--el-color-warning)       #e6a23c
危险        var(--el-color-danger)        #f56c6c
信息        var(--el-color-info)          #909399

页面背景     var(--el-bg-color-page)       #f5f7fa
卡片/容器背景 var(--el-bg-color)            #ffffff   → Tailwind 工具类 bg-bg_color
表头背景     var(--el-fill-color-light)    #f5f7fa
悬浮背景     var(--el-fill-color-lighter)
分割线       var(--el-border-color-lighter) #ebeef5

主文本       var(--el-text-color-primary)   rgba(0,0,0,.88)
次要文本     var(--el-text-color-regular)   rgba(0,0,0,.65)
辅助/占位    var(--el-text-color-placeholder) rgba(0,0,0,.35)
```

**执行要求**：页面中出现的所有十六进制色值（除 `src/style/theme.scss` 主题定义外）一律替换为上述 CSS Var。

## 2.2 字体规范

```text
页面主标题（hero h2）   20px / 700 / var(--el-text-color-primary)
区块标题（PureTableBar）14px / 600
正文 / 表格单元格        14px / 400（表格 size=small 时 13px）
表头                    14px / 600 / var(--el-text-color-primary)
辅助说明 / 空态副文案    12px / 400 / var(--el-text-color-placeholder)
数值 / 代码 / Key 字段   font-mono（等宽），已有 font-mono 类沿用
```

## 2.3 间距规范（**新增**，写入 `src/style/index.scss`）

```scss
:root {
  --ra-space-xs: 8px;
  --ra-space-sm: 12px;
  --ra-space-md: 16px;
  --ra-space-lg: 24px; /* 与现有 .main-content { margin: 24px } 对齐 */
  --ra-radius-card: 6px;
  --ra-radius-tag: 4px;
  --ra-shadow-card: 0 1px 2px rgb(0 0 0 / 4%);
}
```

- 页面内容区外边距：`24px`（沿用 `.main-content { margin: 24px }`，**不改动**，见 `layout/components/lay-content/index.vue:212`）
- 搜索表单内边距：`16px 24px 0`（替换现有 `pl-8 pt-[12px]`）
- 卡片与表格之间间距：`16px`
- 表格工具栏与表格：由 `PureTableBar` 内部控制，不改动

## 2.4 圆角 / 阴影 / 边框

```text
卡片 / 容器圆角    6px
标签 el-tag       4px（Element 默认，不改）
按钮圆角          4px（Element 默认，不改）
弹窗圆角          6px（Element 默认，不改）

卡片阴影          0 1px 2px rgb(0 0 0 / 4%)   ← 新增，仅用于自绘卡片（welcome / notice hero / provider-status 卡片）
弹窗 / 下拉阴影   沿用 Element 默认，不改
分隔线            1px solid var(--el-border-color-lighter)
```

## 2.5 按钮规范

```text
主操作（新增 / 查询 / 保存）  type="primary"，带图标
次操作（重置 / 取消 / 导出）  type="default"，带图标
危险操作（删除）             type="primary" link + el-popconfirm（行内）
                            批量删除 → type="danger" 实心按钮
图标按钮（表格行内）         link + type="primary" + class="reset-margin"

按钮高度：large 40px / default 32px / small 24px（Element 默认，不改动）
所有提交类按钮必须绑定 loading 状态，见 §2.9
按钮文案统一：新增X / 修改 / 删除 / 搜索 / 重置 / 导出 / 详情
```

## 2.6 表单规范

```text
【弹窗表单】
  label-width        82px（沿用现有约定，见 config/reward/form.vue:33）
  布局               单列纵向（≤6 字段）；>6 字段用 el-row :gutter="20" + el-col :span="12" 双列
  必填               el-form-item 的 rules 中配置 required，label 前自动显示红色 *
  placeholder        输入类「请输入X」，选择类「请选择X」，日期「请选择X」
  清空               输入类与选择类统一 clearable
  提交               由 ReDialog 底部按钮负责，表单内不自带按钮

【搜索表单】
  label              带冒号（如「呢称：」），沿用现有
  控件宽度           输入 200px / 选择 160px / 短选择（状态、是否）140px / 关键词 220px
                     → 用 §2.10 的 token class 替换写死的 w-[180px]!
  筛选项 ≤ 4         一行平铺 + 搜索/重置按钮
  筛选项 > 4         前 3 项平铺 + 「展开 / 收起」切换（见 TASK-006）
  placeholder        筛选类的 placeholder 统一为「全部X」（如「全部状态」）
  搜索按钮           必须 :loading="loading"
  重置按钮           重置后必须把 current 重置为 1（见 TASK-001）
  回车搜索           v-search-enter="onSearch"（已有，保持）
```

## 2.7 表格规范

```text
容器           PureTableBar（自带列显隐 / 密度 / 刷新 / 全屏）
               title 属性必须传（如 title="公告列表"），不传则默认「列表」
自适应高度     adaptive + :adaptiveConfig="{ offsetBottom: 108 }"（已有，保持）
斑马纹/边框    不启用，保持现有
表头样式       :header-cell-style="{ background: 'var(--el-fill-color-light)', color: 'var(--el-text-color-primary)' }"（已有，保持）

列宽规则：
  ID              width: 80，hide: true（默认隐藏）
  业务主键/名称    minWidth: 160~280（按内容长度定）
  枚举/状态        minWidth: 90~120
  数值            minWidth: 90，align: right
  时间            width: 168，formatter YYYY-MM-DD HH:mm:ss，空值返回 "-"
  createdTime     hide: true（默认隐藏，用户可在列设置开启）
  updatedTime     保留可见（默认排序倒序时更有价值）；空间紧张时 hide: true
  长文本/JSON     minWidth: 200~280 + showOverflowTooltip
  操作列          fixed: "right"，宽度按操作个数：2个=140 / 3个=180 / 4个=220 / 含下拉=260

排序：业务主键、状态、数值、时间 列加 sortable: true
空值：所有 formatter 统一返回 "-"（system-config 已是标杆，见 hook.tsx:193/245/252/259）
```

**1366px 横向滚动预算**：侧边栏展开 210px + 内容区左右各 24px margin = **表格可用宽度约 1108px**。所有列表的「默认可见列宽之和」必须 ≤ 1100px。

## 2.8 弹窗 / 抽屉 / 跳转 / 反馈 选型规则（**强制**）

| 场景                                                          | 选型                               | 尺寸                                  |
| ------------------------------------------------------------- | ---------------------------------- | ------------------------------------- |
| 新增 / 编辑，字段 ≤ 6                                         | `ReDialog`                         | `width: "680px"`                      |
| 新增 / 编辑，字段 ≤ 3（如重置密码、分配角色）                 | `ReDialog`                         | `width: "480px"`                      |
| 新增 / 编辑，字段 > 6 或含分组/tabs（如公告、节假日）         | `ReDialog`                         | `width: "800px"`                      |
| **查看详情，需要保留列表上下文**                              | `el-drawer` 右侧                   | `size: "720px"`                       |
| 查看详情，内容极多需打印/分享（如邮件任务详情、操作日志详情） | **保持路由跳转整页**               | 现状不动                              |
| 行内删除                                                      | `el-popconfirm`                    | 文案：`是否确认删除「${业务名称}」？` |
| 批量删除 / 重置密码 / 发布 / 撤回 / 启用停用                  | `ElMessageBox.confirm`             | `type: "warning"`                     |
| 轻反馈（成功/失败/校验）                                      | `message()` from `@/utils/message` | 2000ms 自动关闭                       |
| 需长时间停留或带后续操作                                      | `ElNotification`                   | 暂不引入，保持现状                    |

**当前违规项**：

- `monitor/logs/operation/detail.vue`（1510 行）、`monitor/logs/login/detail.vue`（573 行）、`monitor/ai-call-record/detail.vue`（734 行）目前用 `addDialog` 包成弹窗 → 保持（改造成本 > 收益，且 contentRenderer 已能承载）
- `love/records/detail.vue`（246 行）已用 `el-dialog width 680px` → 保持
- `config/mail-task/*` 用路由整页 → 保持（富文本编辑器在弹窗里体验差）

## 2.9 防重复提交规范（**P0，强制**）

所有 `addDialog` 调用必须：

```ts
addDialog({
  // ...
  sureBtnLoading: true, // ① 必加
  beforeSure: async (done, { options, closeLoading }) => {
    const FormRef = formRef.value?.getRef();
    const curData = options.props.formInline;
    try {
      const valid = await FormRef.validate().catch(() => false);
      if (!valid) {
        closeLoading();
        return;
      } // ② 校验失败：关 loading，不关窗
      const result = await api(curData);
      if (result.code !== 200) throw new Error(result.msg || "操作失败");
      message("操作成功", { type: "success" });
      done(); // ③ 仅成功才关窗
      onSearch();
    } catch (error) {
      closeLoading(); // ④ 失败：关 loading，不关窗
      message(getErrorMessage(error, "操作失败"), { type: "error" });
    }
  }
});
```

**标杆参考**：`views/config/system-config/utils/hook.tsx:337-405`（完全符合）。

## 2.10 搜索区 Token Class（**新增**，消除 115 处写死宽度）

在 `src/style/index.scss` 末尾追加：

```scss
/* ===== 统一页面容器 ===== */
.main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 搜索表单 ===== */
.search-form {
  padding: 16px 24px 0;
  margin-bottom: 0;
  border-radius: var(--ra-radius-card, 6px);

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    font-weight: 400;
  }
}

/* 输入类筛选控件 */
.ra-input {
  width: 200px;
}
.ra-input-lg {
  width: 220px;
}
/* 选择类筛选控件 */
.ra-select {
  width: 160px;
}
.ra-select-sm {
  width: 140px;
}
/* 日期范围 */
.ra-daterange {
  width: 260px;
}
```

**替换映射**（去掉 `!` important，改由 class 控制）：

| 现状                                     | 替换为         |
| ---------------------------------------- | -------------- |
| `w-[180px]!` / `w-[200px]!`（el-input）  | `ra-input`     |
| `w-[220px]!`（el-input 关键词）          | `ra-input-lg`  |
| `w-[180px]!` / `w-[160px]!`（el-select） | `ra-select`    |
| `w-[140px]!`（el-select 状态/是否）      | `ra-select-sm` |
| `w-[150px]!`（公告页 el-select）         | `ra-select-sm` |

---

# 3. 页面问题清单

| 优先级 | 页面                                                                                | 问题                                                                                                        | 原因                                                            | 优化方案                                                                                         | 文件                                                      |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------- |
| **P0** | config 全部（9 页）                                                                 | 列表请求异常被静默吞掉，无 empty / error 态                                                                 | `useCrudTable.onSearch` 只有 `try/finally` 无 `catch`           | 补 `catch`：清空数据 + `message(error)`                                                          | `views/config/composables/useCrudTable.ts:48-59`          |
| **P0** | config 全部                                                                         | 删除后停留在原页码，末页删空后显示空白                                                                      | `handleDelete` 的 `.finally` 直接 `onSearch()` 不重置 `current` | 删除成功后 `form.current = 1`（或末页仅剩 1 条时回退一页）                                       | `useCrudTable.ts:67-87`                                   |
| **P0** | config 全部（除 holiday/system-config）                                             | 重置筛选不重置页码                                                                                          | `resetForm` 只 `resetFields()`                                  | 补 `form.current = 1`                                                                            | `useCrudTable.ts:61-65`                                   |
| **P0** | reward / subject / pocket-money / morning-greeting / mail / config:user / sysNotice | **弹窗无防重复提交**，连点确定会重复提交                                                                    | 未设 `sureBtnLoading`                                           | 全部补 `sureBtnLoading: true` + `closeLoading()`                                                 | 见 §4 各页                                                |
| **P0** | reward / subject / pocket-money / morning-greeting / mail                           | 提交**失败也会关窗**并刷新列表，用户以为成功                                                                | `beforeSure` 里 `chores()` 写在 `.finally` 无条件执行           | 改成「仅 `code === 200` 才 `done()`」                                                            | 各 `utils/hook.tsx`                                       |
| **P0** | reward / subject / morning-greeting / mail / config:user                            | 状态开关用 `setTimeout(300)` **假 loading**，且接口失败不提示、不回滚                                       | 复制粘贴的伪代码                                                | 换成 `await` 真实请求 + `finally` 关 loading + 失败回滚（参照 `system-config/hook.tsx:407-452`） | `reward/hook.tsx:160-174` 等                              |
| **P1** | config/reward                                                                       | 页面挂着一套**不存在的「菜单权限」树面板**，数据来自 mock                                                   | 从角色管理页复制未清理                                          | 整块删除（模板 264-325 + hook 58-76 + 相关 import/return）                                       | `views/config/reward/index.vue`、`utils/hook.tsx`         |
| **P1** | config/subject                                                                      | `treeHeight` / `contentRef` / `useResizeObserver` 是死代码，页面根本没有树                                  | 同上                                                            | 删除                                                                                             | `views/config/subject/index.vue:39-71`                    |
| **P1** | config/subject                                                                      | 表单 placeholder 是「请输入角色名称」                                                                       | 复制残留                                                        | 改为「请输入科目名称」                                                                           | `views/config/subject/form.vue:39`                        |
| **P1** | config/user                                                                         | `useTreePanel` / `isShow` / `rowStyle` / `handleMenu` 全为死代码；`handleUpdate` 是空函数却绑定在下拉触发器 | 同上                                                            | 删除                                                                                             | `views/config/user/index.vue:43-82`、`utils/hook.tsx:169` |
| **P1** | config/morning-greeting                                                             | `defaultForm` 缺 `enabled` 字段，该筛选项不参与请求                                                         | 遗漏                                                            | 补 `enabled: ""`                                                                                 | `utils/hook.tsx:45`                                       |
| **P1** | config/system-config                                                                | 7 个筛选项全部平铺，1366px 下占 2~3 行                                                                      | 无展开/收起                                                     | 接入 `ReSearchBar`，前 3 项常显                                                                  | `views/config/system-config/index.vue:46-136`             |
| **P1** | config/reward、config/subject                                                       | 表格默认列宽合计 1390 / 1110px > 1108px 预算，1366px 横向滚动                                               | 低价值列默认全开                                                | ID + createdTime 设 `hide: true`                                                                 | 各 `utils/hook.tsx`                                       |
| **P1** | monitor 三套 health                                                                 | 三套目录 95% 重复（约 1500 行 ×3），`formatTime`/`formatRelative`/`getReasonLabel` 各复制一份               | 复制粘贴                                                        | 先抽公共 utils（低风险），组件化列为可选                                                         | 见 TASK-026                                               |
| **P1** | monitor/geo                                                                         | image alert-record                                                                                          | 12 / 11 列，无 `fixed: right` 操作列                            | 列定义未收敛                                                                                     | 加 `fixed: "right"` + 默认隐藏「首次告警/解决时间」       | `use*AlertRecord.tsx:204 / :181` |
| **P1** | monitor 三套 provider-status                                                        | 卡片列表一次性拉 `size: 100` 硬上限，超过静默截断                                                           | 无分页                                                          | 提示文案 + 或改分页（接口侧不改）                                                                | `useProviderStatus.tsx:147` 等                            |
| **P1** | daily-image/manage                                                                  | 单文件 1887 行（模板 769 + style 798），上传任务列表**渲染两遍**                                            | 未拆分                                                          | 拆 6 个子组件，第一步先抽 `UploadTaskList`                                                       | `views/daily-image/manage/index.vue`                      |
| **P1** | monitor/logs/operation                                                              | detail.vue 1510 行（其中 style 680 行）                                                                     | 未拆分                                                          | 拆 `StepWaterfall` / `StepDetail` / `ExceptionBlock`                                             | `views/monitor/logs/operation/detail.vue`                 |
| **P1** | welcome                                                                             | 1460 行（style 808 行，占 55%）                                                                             | 未拆分                                                          | 拆 7 个区块组件                                                                                  | `views/welcome/index.vue`                                 |
| **P2** | 全部 23 个页面                                                                      | `<div class="main">` 无任何对应样式定义                                                                     | 复制残留的空壳类                                                | 新增全局 `.main` 样式（见 §2.10），让既有 23 处生效                                              | `src/style/index.scss`                                    |
| **P2** | 全部页面                                                                            | 57 处 `console.error` 只打印不提示，异常被静默吞掉                                                          | 缺少统一错误处理                                                | HTTP 响应拦截加全局兜底提示 + 逐个收敛                                                           | `src/utils/http/index.ts:166-176`                         |
| **P2** | config/mail-task                                                                    | `handleRetry` 的 `.catch(() => {})` 吞异常                                                                  | 无提示                                                          | 补 `message(..., {type:"error"})`                                                                | `utils/hook.tsx:149`、`detail.vue:101`                    |
| **P2** | notice/sysNotice                                                                    | 提交失败时先弹错误 message 又执行 `done()` 关窗                                                             | `message` 与 `done()` 顺序问题                                  | 改为失败不 `done()`                                                                              | `views/notice/sysNotice/hook.tsx:344-352`                 |
| **P2** | 26 处 addDialog                                                                     | 弹窗宽度 7 种取值（`40%` / `400px` / `480px` / `520px` / `680px` / `720px` / `800px`）                      | 无规范                                                          | 按 §2.8 收敛为 480 / 680 / 800 三档                                                              | 各 hook                                                   |
| **P3** | views/error                                                                         | 403 / 404 / 500 三个文件均 79 行且结构雷同                                                                  | 复制                                                            | 合并为 `ErrorPage.vue` + props                                                                   | `views/error/*.vue`                                       |
| **P3** | login                                                                               | 无「记住密码」                                                                                              | 未实现                                                          | 可选：localStorage 存用户名                                                                      | `views/login/index.vue:46-49`                             |
| **P3** | 115 处                                                                              | 写死宽度 `w-[180px]!` 等                                                                                    | 无 token                                                        | 替换为 §2.10 的 token class                                                                      | 全项目                                                    |
| **P3** | permission/menu                                                                     | 无搜索区                                                                                                    | 树形表格                                                        | 保持（树形不适合筛选）                                                                           | —                                                         |

---

# 4. 页面详细改造方案

## 4.1 配置中心 · 奖励配置 `config/reward`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:181-221 无 sureBtnLoading）
P0  beforeSure 的 chores() 写在 .finally → 失败也关窗+刷新（hook.tsx:203-216）
P0  状态开关 setTimeout(300) 假 loading，失败无提示（hook.tsx:160-174）
P1  页面挂着 mock 数据的「菜单权限」树面板（index.vue:264-325 / hook.tsx:58-76）
P1  表格默认列宽合计 ~1390px > 1108px 预算，1366px 横向滚动
P2  contentRenderer 同时传 props.formInline 和 formInline: null（hook.tsx:199）
```

**改造目标**：删掉不存在的业务面板，修好提交可靠性，表格在 1366px 下不横向滚动。

**页面布局（改造后）**

```
[搜索区] KEY / 类型 / 数值 / 说明 / 条件 / 状态  （6 项 → 接入 ReSearchBar，前 3 项常显）
[PureTableBar title="奖励配置"]
   按钮：新增配置 | 导出
   表格默认列：KEY | 类型 | 状态 | 数值 | 说明 | 条件 | 更新时间 | 操作   （合计 ≈ 1010px ✓）
   默认隐藏列（列设置可开）：ID | 创建时间
[ReDialog 680px] 新增/修改配置
```

**交互流程**

```
进入页面 → 表格 loading → 渲染
点「新增配置」→ Dialog(680px) → 填表 → 点确定
  → 按钮进入 loading（防重复）
  → 校验失败：关 loading，弹窗不关，字段下方红字
  → 提交失败：关 loading，弹窗不关，message(error)
  → 提交成功：关 loading → 关窗 → message(成功) → 刷新列表（保持当前页码）
点「搜索」→ 按钮 loading → current 重置为 1 → 渲染
点「重置」→ 清空 + current=1 → 查询
点行内开关 → ElMessageBox.confirm → 真实 await → 成功 message + 刷新；失败回滚开关 + message
点「删除」→ el-popconfirm「是否确认删除「${rewardKey}」？」→ 成功 message → 回到第 1 页 → 刷新
```

**组件调整**：接入 `ReSearchBar`（TASK-006）、`ReStatusSwitch`（TASK-007）、`useCrudDialog`（TASK-008）

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/reward/index.vue` | ① 删 `:264-325` 整块树面板 ② 删 `treeRef/treeHeight/contentRef/iconClass/useResizeObserver` 及 `Close/Check` 图标 import ③ 搜索区改 `ReSearchBar` ④ 删 `.search-form` 里的写死宽度 |
| `views/config/reward/utils/hook.tsx` | ① 删 `useTreePanel` + `mockData` import + `return` 中 8 个树相关字段 ② `useTreePanel` 相关 import 清理 ③ `onChange` 改真实 await ④ `openDialog` 改 `useCrudDialog` ⑤ columns 加 `hide` |
| `views/config/reward/form.vue` | 无改动（已符合规范） |

**验收标准**

1. 页面不再出现「菜单权限」面板
2. 连点「确定」只提交 1 次
3. 提交失败时弹窗不关闭，显示 error message
4. 状态开关切换有真实 loading（不是固定 300ms），失败时开关回滚
5. 表格默认不显示 ID 与创建时间；在列设置里可勾选显示
6. 1366px 宽度下表格无横向滚动条
7. `pnpm typecheck` 通过

---

## 4.2 配置中心 · 科目 `config/subject`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:150-172 chores() 在 .finally）
P0  状态开关假 loading（hook.tsx:111-125）
P1  treeHeight/contentRef/useResizeObserver 死代码（index.vue:39-71）
P1  表单 placeholder「请输入角色名称」（form.vue:39）
P1  基础/卓越/满分 三列无 width/minWidth（hook.tsx:69-71）
P1  表格默认列宽 ~1110px，临界
```

**改造目标**：清理死代码，修可靠性，列宽收敛。

**页面布局**

```
[搜索区] 科目 / 类型 / 学段 / 状态  （4 项，一行平铺，无需折叠）
[PureTableBar title="科目配置"]
   按钮：新增科目
   表格默认列：科目 | 类型 | 学段 | 状态 | 基础 | 卓越 | 满分 | 更新时间 | 操作（≈ 890px ✓）
   默认隐藏：ID | 创建时间
[ReDialog 680px] 新增/修改科目
```

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/subject/index.vue` | 删 `treeHeight`/`contentRef`/`iconClass` 与 `useResizeObserver`/`delay`/`subBefore`/`nextTick`/`onMounted` 整块（`:39-71`）；`useResizeObserver` import 一并删；搜索区宽度改 token |
| `views/config/subject/utils/hook.tsx` | `onChange` 改真实 await；`openDialog` 改 `useCrudDialog`；`基础/卓越/满分` 三列补 `minWidth: 90, align: "right"`；`ID`/`createdTime` 加 `hide: true` |
| `views/config/subject/form.vue` | `:39` placeholder 改「请输入科目名称」 |

**验收标准**

1. `treeHeight` / `contentRef` 相关代码全部移除
2. 新增科目时 placeholder 显示「请输入科目名称」
3. 弹窗确定按钮有 loading，失败不关窗
4. 表格在 1366px 无横向滚动
5. `pnpm typecheck` && `pnpm lint:eslint` 通过

---

## 4.3 配置中心 · 零花钱 `config/pocket-money`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:103-118 chores() 在 .finally）
P2  contentRenderer 传 formInline: null
```

**改造目标**：最小改动，只修可靠性。

**代码修改**：`views/config/pocket-money/utils/hook.tsx` — `openDialog` 改用 `useCrudDialog`；`ID`/`createdTime` 加 `hide: true`；删除 `contentRenderer` 里的 `formInline: null`。

**验收标准**：确定按钮有 loading；失败不关窗；表格默认列 ≤ 1100px。

---

## 4.4 配置中心 · 早安问候 `config/morning-greeting`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:186-204）
P0  状态开关假 loading（hook.tsx:139-157）
P1  defaultForm 缺 enabled 字段（hook.tsx:45）→ 该筛选条件不生效
P3  index.vue:6 import deviceDetection 未使用
P2  contentRenderer 传 formInline: null（hook.tsx:181）
```

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/morning-greeting/index.vue` | 删未使用的 `deviceDetection` import（`:6`）；搜索区宽度改 token |
| `views/config/morning-greeting/utils/hook.tsx` | ① `defaultForm` 补 `enabled: ""` ② `onChange` 改真实 await ③ `openDialog` 改 `useCrudDialog` ④ `ID`/`createdTime` 加 `hide: true` |

**验收标准**

1. 选择「状态」筛选后点搜索，请求参数中确实带上 `enabled`
2. 弹窗防重复提交生效
3. 状态开关真实 loading

---

## 4.5 配置中心 · 邮件收件人 `config/mail`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:215-233）
P0  状态开关假 loading（hook.tsx:170-183）
P1  handleSave（收件人树面板保存）无 catch，失败静默（hook.tsx:78-94）
P2  contentRenderer 传 formInline: null（hook.tsx:210）
```

**注意**：此页的右侧用户树面板是**真实功能**（`getMailRecipientUserList` / `updateMailRecipientUser`），**不要删除**（与 reward 的 mock 面板不同）。

**代码修改**：`views/config/mail/utils/hook.tsx`

1. `handleSave` 包 `try/catch`，失败 `message(..., {type:"error"})`
2. `onChange` 改真实 await
3. `openDialog` 改 `useCrudDialog`
4. `ID`/`createdTime` 加 `hide: true`

**验收标准**：收件人保存失败时有错误提示；弹窗防重复提交；树面板功能不受影响。

---

## 4.6 配置中心 · 奖励用户 `config/user`

**当前问题**

```
P0  弹窗无防重复提交（4 个弹窗：新增/上传头像/重置密码/分配角色，hook.tsx:241-247 等）
P0  状态开关假 loading（hook.tsx:193-208）
P1  useTreePanel / isShow / rowStyle / handleMenu 死代码（index.vue:43-82）
P1  handleUpdate 是空函数却绑定在下拉触发器（index.vue:233 / hook.tsx:169）
P1  formInline 含 status/avatar 但表单无对应项 → 状态无法在弹窗中修改（form.vue）
P2  loadXxxOptions 用 console.error 吞错（hook.tsx:393-400）
```

**改造目标**：清理死代码，补上状态编辑能力，修可靠性。

**页面布局**

```
[搜索区] 昵称 / 生日 / 状态 / 角色  （4 项一行）
[PureTableBar title="奖励用户"]
   按钮：新增用户
   表格默认列：昵称 | 生日 | 状态 | 头像 | 手机号 | 更新时间 | 操作（含更多下拉）
   默认隐藏：ID | 创建时间
[ReDialog 680px] 新增/修改用户 —— 补充「状态」字段
[ReDialog 480px] 重置密码 / 分配角色 / 上传头像
```

**表单字段布局（改造后，form.vue）**

```
第一行：昵称（必填）  |  手机号（必填，11 位校验）
第二行：生日（必填，日期选择）
第三行：状态（el-radio-group：启用 / 停用，默认 启用）
```

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/user/index.vue` | 删 `treeRef`/`treeHeight`/`contentRef`/`useResizeObserver` 块（`:43-82`）；删 `handleUpdate` 的 `@click` 绑定；搜索区宽度改 token |
| `views/config/user/utils/hook.tsx` | ① 删 `useTreePanel` 相关（import / 调用 / return 的 `isShow`/`rowStyle`/`handleMenu`/`curRow`）② 删空函数 `handleUpdate` ③ `openDialog` 的 `formInline` 补 `status` ④ `onChange` 改真实 await ⑤ 4 个弹窗全部加 `sureBtnLoading` ⑥ `loadXxxOptions` 的 `console.error` 改 `message` |
| `views/config/user/form.vue` | 新增「状态」`el-radio-group`（启用=1 / 停用=0），`:model="newFormInline.status"` |
| `views/config/user/utils/types.ts` | `FormItemProps` 的 `status` 类型补全 |

**验收标准**

1. 页面上不再有 `useTreePanel` 相关残留
2. 新增/修改弹窗内可设置「状态」
3. 4 个弹窗的确定按钮均有 loading
4. 选项加载失败时有错误提示（不再只 console）
5. `pnpm typecheck` 通过

---

## 4.7 配置中心 · 系统配置 `config/system-config`（**质量标杆，只做小修**）

**当前问题**

```
P1  7 个筛选项全部平铺，1366px 占 2~3 行（index.vue:46-136）
P1  表格默认列宽合计 ~1290px > 1108px，横向滚动
P2  handleDelete 删除后不回第 1 页（hook.tsx:466-485）
```

**改造目标**：保留现有优秀实现，只加搜索折叠 + 列收敛 + 删除回首页。

**页面布局**

```
[ReSearchBar] 常显：配置 Key | 配置值 | 状态
              展开后追加：说明 | 配置分组 | 值类型 | 敏感标识
[PureTableBar title="系统配置"]
   按钮：新增配置 | 导出
   表格默认列：配置 Key | 配置值 | 配置分组 | 值类型 | 状态 | 敏感标识 | 更新时间 | 操作
   默认隐藏：ID | 说明 | 创建时间
[ReDialog 800px] 新增/修改配置（保持现有三段式表单）
```

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/system-config/index.vue` | 搜索区改 `ReSearchBar`（`:46-136`）；删 `.search-form` 写死宽度 |
| `views/config/system-config/utils/hook.tsx` | `handleDelete` 成功后 `form.current = 1`；`ID`/`description`/`createdTime` 三列加 `hide: true` |

**验收标准**

1. 默认只显示 3 个筛选项 + 「展开」按钮；展开后显示 7 项
2. 删除后回到第 1 页
3. 表格在 1366px 无横向滚动
4. 现有的 `sureBtnLoading` / `closeLoading()` / 状态真实 await 逻辑**保持不变**

---

## 4.8 配置中心 · 节假日 `config/holiday`（**质量标杆，只做小修**）

**当前问题**：`handleDelete` 走通用 `useCrudTable`，删除后不回第 1 页（hook.tsx:684-703）。

**代码修改**：`views/config/holiday/utils/hook.tsx` — `handleDelete` 改为自定义实现（不走 `useCrudTable.handleDelete`），成功后 `form.current = 1; onSearch(); loadOptions();`。

**验收标准**：删除末页唯一一条记录后自动回到第 1 页并正常显示数据。

---

## 4.9 配置中心 · 邮件任务 `config/mail-task`

**当前问题**

```
P2  index 的 handleRetry .catch(() => {}) 吞异常（hook.tsx:149）
P2  detail 的 handleRetry 同样（detail.vue:101）
P2  loadStatusOptions 用 console.error（hook.tsx:156-158）
```

**改造目标**：只补错误提示，路由结构与富文本表单**保持不变**。

**代码修改**
| 文件 | 修改内容 |
|---|---|
| `views/config/mail-task/utils/hook.tsx` | `handleRetry` 的 `.catch(() => {})` 改为 `.catch(e => message(getErrorMessage(e, "重试失败"), { type: "error" }))`；`loadStatusOptions` 的 `console.error` 改 `message` |
| `views/config/mail-task/detail.vue` | 同上的 `handleRetry` 处理 |

**验收标准**：重试失败时有明确错误提示；其他逻辑不变。

---

## 4.10 监控中心 · 三套 Provider 健康度

**当前问题**

```
P1  三套目录 95% 重复（约 1500 行 × 3）
P1  formatTime / formatRelative / getReasonLabel 各复制一份（useProviderStatus.tsx:35-74 等）
P1  geo / image 的 alert-record 12 / 11 列，操作列无 fixed: right
P1  卡片列表 size: 100 硬上限，超量静默截断
P3  el-tab 切换无防抖，快速连点触发多次 onSearch
```

**改造目标**：**先做低风险抽离，组件化分两步走**。第一步（TASK-026）只抽共享工具函数与列配置，不改动组件结构；第二步（TASK-027，可选）再做配置化组件。

**第一步改动**
| 文件 | 修改内容 |
|---|---|
| `views/monitor/utils.ts`（改造） | 新增并导出 `formatTime` / `formatRelative` / `formatProviderStatus` / `getReasonLabel(reasonMap)` 工厂函数 |
| `views/monitor/ai-provider-health/hook/useProviderStatus.tsx` | 删本地 `formatTime` 等（`:35-74`），改从 `../../utils` 引入 |
| `views/monitor/geo-provider-health/hook/useGeoProviderStatus.tsx` | 同上（`:39-76`） |
| `views/monitor/image-provider-health/hook/useImageProviderStatus.tsx` | 同上（`:39-77`） |
| `views/monitor/geo-provider-health/hook/useGeoProviderAlertRecord.tsx` | 操作列加 `fixed: "right"`；「首次告警」「解决时间」加 `hide: true` |
| `views/monitor/image-provider-health/hook/useImageProviderAlertRecord.tsx` | 操作列加 `fixed: "right"`；「首次告警」「解决时间」加 `hide: true` |
| 三个 `provider-status.vue` | 卡片列表为空/超量时给出提示；`el-tab` 的 `@tab-click` 加防抖 |

**验收标准**

1. `formatTime` 等四个函数在三套 hook 中只保留一份
2. geo / image 告警记录表格操作列固定右侧
3. 三个页面功能与改造前完全一致（逐项人工走查：启用/禁用/探测/重置熔断/批量操作/告警解决）
4. `pnpm typecheck` 通过

---

## 4.11 监控中心 · 日志 `monitor/logs`

**当前问题**

```
P1  operation/detail.vue 1510 行（style 680 行）
P1  operation 与 login 的 detail 用 addDialog 承载超长内容
P2  system/hook.tsx:289、login/hook.tsx:192/241 的 console.error
P3  version/detail.vue（97 行）无任何 import 引用 → 疑似死文件，需确认
```

**改造目标**：拆分 `operation/detail.vue`，其余只补错误提示。

**`operation/detail.vue` 拆分方案**
| 新组件 | 负责内容 | 原模板行 | props | events |
|---|---|---|---|---|
| `components/StepWaterfall.vue` | 左侧步骤瀑布列表 | `481-593` | `steps, activeId` | `select(id)` / `move(dir)` |
| `components/StepDetail.vue` | 右侧步骤详情（批处理 / metadata / 失败明细 / 跳过明细） | `596-789` | `step` | `copy(text)` |
| `components/ExceptionBlock.vue` | 异常信息区 | `793-818` | `exception, expanded` | `toggle` |
| `composables/useTaskLogDetail.ts` | `formatMs` / `percentOfTotal` / `clockAt` / `META_KEY_LABEL` | `220-296` | — | — |

拆分后主文件预计降至 ~400 行。

**验收标准**

1. `detail.vue` 行数 ≤ 450
2. 详情页所有功能与拆分前一致（步骤切换、键盘导航、异常展开、复制）
3. `pnpm typecheck` 通过

---

## 4.12 内容中心 · 每日图片 `daily-image/manage`

**当前问题**

```
P1  index.vue 1887 行（script 317 / template 769 / style 798）
P1  上传任务列表渲染两遍（1003-1028 与 1058-1083 几乎逐行一致）
P2  详情抽屉 570-968（约 400 行）内字段行模式重复约 30 次
```

**改造目标**：**分两步，先做零风险去重，再做拆分**。

**第一步（TASK-023）**：抽 `components/UploadTaskList.vue`，两处引用。
**第二步（TASK-024）**：拆 5 个组件。

| 子组件                                       | 负责模板   | props                                                | events                                                                       |
| -------------------------------------------- | ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `components/DailyToolbar.vue`                | `322-371`  | `keyword, sourceOptions, density, loading`           | `update:keyword` / `change:source` / `update:density` / `upload` / `refresh` |
| `components/BatchActionBar.vue`              | `374-427`  | `selectedCount, downloadLoading, batchDeleteLoading` | `download-zip` / `download-links` / `batch-delete` / `clear` / `invert`      |
| `components/ImageGrid.vue` + `ImageCard.vue` | `429-553`  | `list, selectedIds`                                  | `open` / `toggle` / `preview`                                                |
| `components/DetailDrawer.vue`                | `570-968`  | `item, detail, loading`                              | `save-remark` / `delete` / `download` / `regenerate` / `nav`                 |
| `components/UploadDialog.vue`                | `971-1037` | `visible, uploading, tasks`                          | `close` / 拖拽事件                                                           |

**验收标准**

1. 上传任务列表只有一份实现
2. `index.vue` 行数 ≤ 500
3. 上传 / 预览 / 编辑备注 / 删除 / 批量下载 / 全屏预览 六条主流程行为不变
4. `pnpm typecheck` 通过

---

## 4.13 首页工作台 `welcome`

**当前问题**：1460 行，style 占 808 行（55%）。

**改造目标**：拆 7 个区块组件（`Topbar` / `HealthStrip` / `ActionCenter` / `MetricsPanel` / `QuickEntries` / `TrendChart` / `ActivityList`），style 随之分散。

**注意**：此页的 loading / error / empty / ECharts resize / dispose / 主题切换重绘**实现完善，拆分时必须原样保留**（`index.vue:69/76/338/342-349/354`）。

**验收标准**：主文件 ≤ 350 行；六个模块的 loading / 局部错误重试 / 空态均正常；ECharts 在窗口缩放与主题切换时正常重绘，卸载时 dispose。

---

## 4.14 公告通知 `notice/sysNotice`

**当前问题**

```
P0  弹窗无防重复提交（hook.tsx:326-357，closeLoading() 已调用但没设 sureBtnLoading）
P2  提交失败（code !== 200）时先弹 error message 又执行 done() 关窗（hook.tsx:344-352）
P2  搜索控件宽度 w-[150px]! / w-[220px]! 混用
```

**代码修改**：`views/notice/sysNotice/hook.tsx`

1. `addDialog` 补 `sureBtnLoading: true`
2. `beforeSure` 改为：`code !== 200` 时 `throw new Error(result.msg)`，由 catch 统一提示且**不调用 `done()`**
3. `ID` / `createdTime` 列加 `hide: true`

`views/notice/sysNotice/index.vue`：搜索宽度改 token class。

**验收标准**：确定按钮有 loading；提交失败弹窗不关闭；表格 1366px 无横向滚动。

---

## 4.15 权限管理 `permission/*`（**质量标杆，几乎不改**）

**现状**：`user` / `role` / `menu` 三个 hook 均已正确使用 `sureBtnLoading: true`。

**改动**：仅把搜索区写死宽度 `w-[180px]!` 替换为 token class；`menu/index.vue` 无搜索区（树形表格），保持原样。

---

## 4.16 爱心模块 `love/*`

**当前问题**

```
P2  anniversaries/index.vue（87 行）无搜索区
P2  media/index.vue（95-110）删除用 ElMessageBox 而非 el-popconfirm，与全局不一致
P2  records/index.vue 搜索区写死宽度
```

**改动**：

- `love/media/index.vue`：删除改为 `el-popconfirm`（与其余 16 个列表页一致）
- 三页搜索宽度改 token class
- `love/anniversaries` 无搜索区：字段仅 3~4 个，**保持现状**（加搜索栏收益低）

---

## 4.17 错误页 / 登录页

**错误页**：`views/error/403.vue` / `404.vue` / `500.vue` 各 79 行且结构雷同 → 合并为 `views/error/ErrorPage.vue`（props: `code`, `title`, `desc`, `svg`），三个原文件改为 3 行薄壳。

**登录页**：`views/login/index.vue` 已有 `:loading` + `:disabled` + `debounce(1000)`（`:197/198`、`:82-95`），**防重复提交已合格，不改**。可选加「记住用户名」（localStorage），列为 P3 可选。

---

# 5. 公共组件优化方案

## 5.1 新增组件

### `src/components/ReSearchBar/index.vue`

**用途**：统一搜索区，支持「超过 N 项自动折叠」，消除 115 处写死宽度与重复的 `bg-bg_color pl-8 pt-[12px]`。

**哪些页面使用**：`config/system-config`（7 项）、`config/reward`（6 项）、`notice/sysNotice`（5 项）、`monitor/logs/*`、`love/records`、`permission/user`、`config/user`、`config/subject`、`config/mail`、`config/mail-task`、`config/holiday`、`config/morning-greeting`、`config/pocket-money`。共 14 个页面。

**Props**

```ts
interface Props {
  modelValue: Record<string, any>; // 搜索表单对象
  fields: SearchField[]; // 字段配置
  loading?: boolean; // 搜索按钮 loading
  visibleCount?: number; // 常显项数量，默认 3；fields.length <= visibleCount 时不显示展开按钮
  labelWidth?: string; // 默认 "auto"
}
interface SearchField {
  prop: string;
  label: string; // 不带冒号，组件自动补
  type: "input" | "select" | "date" | "daterange" | "input-number";
  placeholder?: string; // 不传时按 type 自动生成
  options?: Array<{ label: string; value: any }>; // type=select 时必传
  optionsLoading?: boolean;
  filterable?: boolean;
  allowCreate?: boolean;
  shortcuts?: boolean; // type=daterange 时启用 monitor/utils 的快捷选项
  width?: "sm" | "md" | "lg"; // 对应 ra-select-sm / ra-input / ra-input-lg，默认 md
}
```

**Events**：`@search` / `@reset`

**内部职责**

1. 渲染 `el-form :inline="true"`，容器 class 用全局 `.search-form bg-bg_color`
2. 字段控件宽度由 `width` 映射到 token class，不写死 px
3. `fields.length > visibleCount` 时，末位渲染「展开 / 收起」文字按钮 + 箭头图标
4. 底部渲染「搜索」（`type="primary"` + `:loading="loading"`）与「重置」按钮
5. 自动挂 `v-search-enter` 指令
6. **不负责**：分页重置（由各页 hook 的 `resetForm` 负责，见 TASK-001）

---

### `src/components/ReStatusSwitch/index.vue`

**用途**：替换 5 个页面里 `setTimeout(300)` 假 loading 的 `el-switch` 单元格渲染器。

**哪些页面使用**：`config/reward`、`config/subject`、`config/morning-greeting`、`config/mail`、`config/user`（5 处几乎逐字相同的 `onChange` 实现）。

**Props**

```ts
interface Props {
  modelValue: number | boolean;
  activeValue?: number | boolean; // 默认 1
  inactiveValue?: number | boolean; // 默认 0
  activeText?: string; // 默认 "启用"
  inactiveText?: string;
  size?: "small" | "default";
  loading?: boolean; // 由外部 switchLoadMap 传入
  confirmTitle?: (row: any) => string; // 不传则不二次确认
  row?: any;
  index?: number;
}
```

**Events**：`@change`（payload: `{ row, index, next: (ok: boolean) => void }`）—— 由父组件执行真实请求，请求结束后必须调用 `next(true/false)`，组件据此关 loading 并在失败时回滚开关。

**内部职责**

1. 渲染 `el-switch` + `inline-prompt` + `style={switchStyle.value}`
2. 切换前若传了 `confirmTitle`，先弹 `ElMessageBox.confirm`
3. 维护自身 `pending` 状态：切换后立刻置 loading，直到父组件 `next()` 才解除
4. `next(false)` 时把 `modelValue` 回滚为切换前的值

---

### `src/hooks/useCrudDialog.ts`

**用途**：统一 `addDialog` 的可靠性封装，把 §2.9 的四条规则固化成代码，杜绝再写出「失败也关窗」的弹窗。

**哪些页面使用**：`config/reward`、`config/subject`、`config/pocket-money`、`config/morning-greeting`、`config/mail`、`config/user`（4 个弹窗）、`notice/sysNotice`。共 9 处调用点。

**签名**

```ts
export function useCrudDialog<T extends Record<string, any>>(config: {
  title: string; // 不带「新增/修改」前缀
  formComponent: Component;
  width?: "480px" | "680px" | "800px"; // 默认 "680px"
  defaultForm: () => T;
  submitApi: (payload: T) => Promise<{ code: number; msg: string }>;
  beforeOpen?: (row?: any) => Promise<T> | T; // 编辑时拉详情
  buildPayload?: (form: T) => T | Promise<T>; // 提交前加工（如 JSON 序列化）
  extraProps?: Record<string, any>; // 传给表单组件的额外 props（如 formOptions）
}) {
  // 返回值
  open: (title: "新增" | "修改", row?: any) => Promise<void>;
}
```

**内部职责（强制实现）**

1. `sureBtnLoading: true`
2. `closeOnClickModal: false`、`draggable: true`、`fullscreen: deviceDetection()`、`fullscreenIcon: true`
3. `beforeSure` 中：`validate()` → 失败 `closeLoading()` 并 return
4. 请求成功（`code === 200`）→ `message("X成功")` → `done()` → 回调 `onSuccess`（由调用方刷新列表）
5. 请求失败 / 抛异常 → `closeLoading()` → `message(error)` → **不关窗**
6. `contentRenderer` 只传 `ref`，不再重复传 `formInline: null`

---

### `src/components/ReEmpty/index.vue`（可选，P2）

**用途**：统一列表空态（当前 el-table 默认空态是纯文字「暂无数据」）。

**Props**：`description?: string`、`type?: "data" | "search" | "error"`。搜索无结果时显示「没有找到匹配的数据 · 试试调整筛选条件」+ 「清空筛选」按钮。

---

## 5.2 修改组件

| 组件                                           | 修改内容                                                                         | 原因                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| `src/style/index.scss`                         | 追加 §2.3 的间距/圆角 token 与 §2.10 的 `.main` / `.search-form` / `.ra-*` class | 消除 115 处写死宽度，让既有 23 处 `.main` 生效 |
| `src/utils/http/index.ts`                      | 响应错误拦截补充全局兜底提示（见 TASK-002）                                      | 消除 57 处静默吞异常                           |
| `src/views/config/composables/useCrudTable.ts` | 补 catch / 分页重置 / 删除回首页（见 TASK-001）                                  | P0 缺陷                                        |
| `src/views/monitor/utils.ts`                   | 新增 `formatTime` / `formatRelative` / `getReasonLabel`（见 TASK-026）           | 消除三套重复                                   |
| `src/components/ReDialog/index.vue`            | **不改**（已完整支持 `sureBtnLoading` / `closeLoading` / `beforeSure`）          | —                                              |
| `src/components/RePureTableBar`                | **不改**（已支持 `title` / `columns.hide` / 列显隐 / 密度 / 刷新 / 全屏）        | —                                              |
| `src/components/DictSelect`                    | **不改**（接口已标准化）                                                         | —                                              |

---

# 6. 文件修改清单

## 6.1 新增（7 个）

| 文件                                                               | 用途                                |
| ------------------------------------------------------------------ | ----------------------------------- |
| `src/components/ReSearchBar/index.vue`                             | 统一搜索栏（支持折叠）              |
| `src/components/ReSearchBar/types.ts`                              | `SearchField` 类型                  |
| `src/components/ReStatusSwitch/index.vue`                          | 状态开关（真实 loading + 失败回滚） |
| `src/hooks/useCrudDialog.ts`                                       | 弹窗可靠性封装                      |
| `src/components/ReEmpty/index.vue`                                 | 统一空态（可选，P2）                |
| `src/views/monitor/logs/operation/components/StepWaterfall.vue`    | 步骤瀑布列表                        |
| `src/views/monitor/logs/operation/components/StepDetail.vue`       | 步骤详情                            |
| `src/views/monitor/logs/operation/components/ExceptionBlock.vue`   | 异常区                              |
| `src/views/monitor/logs/operation/composables/useTaskLogDetail.ts` | 详情工具函数与字典                  |
| `src/views/daily-image/manage/components/UploadTaskList.vue`       | 上传任务列表（去重）                |
| `src/views/daily-image/manage/components/DailyToolbar.vue`         | 工具栏                              |
| `src/views/daily-image/manage/components/BatchActionBar.vue`       | 批量操作条                          |
| `src/views/daily-image/manage/components/ImageGrid.vue`            | 图片网格                            |
| `src/views/daily-image/manage/components/ImageCard.vue`            | 图片卡片                            |
| `src/views/daily-image/manage/components/DetailDrawer.vue`         | 详情抽屉                            |
| `src/views/daily-image/manage/components/UploadDialog.vue`         | 上传弹框                            |
| `src/views/welcome/components/*.vue`（7 个）                       | 首页区块拆分                        |

## 6.2 修改（按模块）

### 基础设施（4 个）

| 文件                                           | 修改内容                                                 | 影响范围            |
| ---------------------------------------------- | -------------------------------------------------------- | ------------------- |
| `src/style/index.scss`                         | 追加间距/圆角 token + `.main` / `.search-form` / `.ra-*` | 全局                |
| `src/utils/http/index.ts`                      | 错误拦截补全局兜底提示                                   | 全局                |
| `src/views/config/composables/useCrudTable.ts` | catch / 分页重置 / 删除回首页                            | config 全部 9 页    |
| `src/views/monitor/utils.ts`                   | 抽公共格式化函数                                         | monitor 三套 health |

### config 模块（14 个）

| 文件                                           | 修改内容                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `views/config/reward/index.vue`                | 删 mock 树面板 + 死代码；搜索区改组件                                           |
| `views/config/reward/utils/hook.tsx`           | 删 useTreePanel；开关改真实 await；弹窗改 useCrudDialog；列加 hide              |
| `views/config/subject/index.vue`               | 删死代码；搜索宽度 token 化                                                     |
| `views/config/subject/utils/hook.tsx`          | 开关改真实 await；弹窗改封装；列加 hide                                         |
| `views/config/subject/form.vue`                | placeholder 修正                                                                |
| `views/config/pocket-money/utils/hook.tsx`     | 弹窗改封装；列加 hide                                                           |
| `views/config/morning-greeting/index.vue`      | 删未使用 import；宽度 token 化                                                  |
| `views/config/morning-greeting/utils/hook.tsx` | 补 enabled；开关改真实 await；弹窗改封装；列加 hide                             |
| `views/config/mail/utils/hook.tsx`             | handleSave 补 catch；开关改真实 await；弹窗改封装；列加 hide                    |
| `views/config/user/index.vue`                  | 删 useTreePanel 死代码 + 空函数；宽度 token 化                                  |
| `views/config/user/utils/hook.tsx`             | 删死代码；4 个弹窗加 loading；补 status 到 formInline；console.error 改 message |
| `views/config/user/form.vue`                   | 新增「状态」单选                                                                |
| `views/config/system-config/index.vue`         | 搜索区改 ReSearchBar                                                            |
| `views/config/system-config/utils/hook.tsx`    | 删除回首页；列加 hide                                                           |
| `views/config/holiday/utils/hook.tsx`          | 删除回首页                                                                      |
| `views/config/mail-task/utils/hook.tsx`        | handleRetry 补错误提示                                                          |
| `views/config/mail-task/detail.vue`            | handleRetry 补错误提示                                                          |

### monitor 模块（10 个）

| 文件                                                                       | 修改内容               |
| -------------------------------------------------------------------------- | ---------------------- |
| `views/monitor/ai-provider-health/hook/useProviderStatus.tsx`              | 格式化函数改引公共     |
| `views/monitor/geo-provider-health/hook/useGeoProviderStatus.tsx`          | 同上                   |
| `views/monitor/image-provider-health/hook/useImageProviderStatus.tsx`      | 同上                   |
| `views/monitor/geo-provider-health/hook/useGeoProviderAlertRecord.tsx`     | 操作列 fixed + 列 hide |
| `views/monitor/image-provider-health/hook/useImageProviderAlertRecord.tsx` | 同上                   |
| `views/monitor/ai-provider-health/components/provider-status.vue`          | tab 防抖 + 超量提示    |
| `views/monitor/geo-provider-health/components/provider-status.vue`         | 同上                   |
| `views/monitor/image-provider-health/components/provider-status.vue`       | 同上                   |
| `views/monitor/logs/operation/detail.vue`                                  | 拆分（1510 → ≤450）    |
| `views/monitor/logs/system/hook.tsx`                                       | console.error 收敛     |

### 其他页面（10 个）

| 文件                                               | 修改内容                               |
| -------------------------------------------------- | -------------------------------------- |
| `views/daily-image/manage/index.vue`               | 拆分（1887 → ≤500）                    |
| `views/welcome/index.vue`                          | 拆分（1460 → ≤350）                    |
| `views/notice/sysNotice/index.vue`                 | 宽度 token 化                          |
| `views/notice/sysNotice/hook.tsx`                  | 加 sureBtnLoading；失败不关窗；列 hide |
| `views/permission/user/index.vue`                  | 宽度 token 化                          |
| `views/permission/role/index.vue`                  | 宽度 token 化                          |
| `views/love/media/index.vue`                       | 删除改 el-popconfirm                   |
| `views/love/media/index.vue` / `records/index.vue` | 宽度 token 化                          |
| `views/error/403.vue` / `404.vue` / `500.vue`      | 改为薄壳，逻辑收敛到 `ErrorPage.vue`   |
| `views/error/ErrorPage.vue`（新增）                | 三页共用实现                           |

## 6.3 删除

```text
无文件删除。
（views/monitor/logs/version/detail.vue 疑似无引用，需先确认是否被动态路由引用，
  确认无引用后再删除，不得在未确认的情况下删除 —— 见 TASK-028 备注）
```

---

# 7. 接口影响分析

## 7.1 前端即可完成（本次全部改动）

```text
✅ 所有搜索/筛选逻辑         —— 纯前端参数组装，接口不变
✅ 所有表格列显隐 / 列宽      —— @pureadmin/table 的 column.hide，纯前端
✅ 所有 loading / empty / error 状态 —— 纯前端
✅ 所有防重复提交            —— 纯前端
✅ 所有弹窗/抽屉形态调整      —— 纯前端
✅ 所有写死宽度 token 化      —— 纯前端样式
✅ 所有 console.error 收敛    —— 纯前端
✅ 所有组件拆分              —— 纯前端重构
✅ 删除后回第 1 页            —— 纯前端分页参数
✅ 配置/用户状态字段补全      —— 现有 update 接口已支持 status 字段
```

## 7.2 无需修改

```text
❌ 不需要新增接口
❌ 不需要修改接口返回结构
❌ 不需要新增返回字段
❌ 不需要修改数据库
❌ 不需要修改后端业务逻辑
```

**结论：本次优化全部基于现有接口完成，不需要任何后端配合。**

## 7.3 需要后端确认（仅一项，非阻塞）

```text
接口：GET /api/admin/provider/health/page（三套 health 卡片列表）
现状：前端固定传 size=100（useProviderStatus.tsx:147 等）
问题：供应商数量 > 100 时静默截断，前端无法感知
建议：① 前端改为分页（推荐，无需后端改动）
     ② 或后端在响应中返回 hasMore / 总数列超限标记
处理方式：本次按方案 ① 实现（前端分页 + 超限文案提示），不阻塞
```

---

# 8. AI 执行任务清单

> **执行约定**
>
> 1. 严格按 TASK 编号顺序执行
> 2. 每个 TASK 完成后运行 `pnpm typecheck`（= `tsc --noEmit && vue-tsc --noEmit --skipLibCheck`）与 `pnpm lint:eslint`，**必须零错误**才能进入下一个 TASK
> 3. `tsc` 失败会短路 `vue-tsc`，先修 `tsc` 的错
> 4. 不得修改任何后端接口、不得新增第三方依赖、不得修改业务逻辑语义

---

## TASK-001 · 修复 useCrudTable 的三个 P0 缺陷

**优先级**：P0
**目标**：让 config 模块 9 个页面的列表请求具备错误提示、空态、正确的分页重置行为。

**涉及文件**：`src/views/config/composables/useCrudTable.ts`

**修改要求**

1. `onSearch`（现 `:48-59`）补 `catch` 分支：
   ```ts
   async function onSearch() {
     loading.value = true;
     try {
       const { data } = await config.searchApi(toRaw(form));
       dataList.value = data?.records ?? [];
       pagination.total = data?.total ?? 0;
       pagination.pageSize = data?.size ?? 10;
       pagination.currentPage = data?.current ?? 1;
     } catch (error) {
       dataList.value = [];
       pagination.total = 0;
       message(
         error instanceof Error && error.message
           ? error.message
           : "加载数据失败",
         { type: "error" }
       );
     } finally {
       loading.value = false;
     }
   }
   ```
2. `resetForm`（现 `:61-65`）在 `resetFields()` 后补 `form.current = 1`
3. `handleDelete`（现 `:67-87`）在删除成功后（`r.code === 200` 分支内）补：
   ```ts
   // 若当前页在删除后已无数据且不是第 1 页，回退到上一页
   if (dataList.value.length === 1 && form.current > 1) {
     form.current -= 1;
   }
   ```
   注意：判断要放在 `onSearch()` 之前，读取的还是旧 `dataList`
4. 顶部补充 `import { getErrorMessage } from "@/utils/..."` —— 若项目无此工具则在 `src/utils/http/index.ts` 同级新增一个 `getErrorMessage`（见 TASK-002 一并定义）

**技术实现**：纯 TS，无模板改动

**注意事项**

- `handleDelete` 的 `.finally` 里已有 `onSearch()`，不要重复调用
- 不要改动 `useCrudTable` 对外返回的对象结构（9 个页面依赖它）

**验收标准**

1. 断网时点搜索，页面弹出「加载数据失败」而非静默
2. 请求失败时表格显示空态而非残留旧数据
3. 在第 3 页点重置，结果回到第 1 页
4. 在第 3 页删除该页唯一一条记录，自动跳回第 2 页
5. `pnpm typecheck` 通过

---

## TASK-002 · HTTP 响应错误兜底提示 + getErrorMessage 工具

**优先级**：P0
**目标**：让「调用方忘记 catch」的请求也有可见的错误反馈，消除 57 处 `console.error` 静默吞异常。

**涉及文件**：`src/utils/http/index.ts`、新增 `src/utils/error.ts`

**修改要求**

1. 新增 `src/utils/error.ts`：
   ```ts
   export function getErrorMessage(
     error: unknown,
     fallback = "操作失败"
   ): string {
     if (error instanceof Error && error.message) return error.message;
     const anyErr = error as any;
     if (anyErr?.msg) return anyErr.msg; // 后端 { code, msg }
     if (anyErr?.response?.data?.msg) return anyErr.response.data.msg;
     if (anyErr?.response?.status === 404) return "请求的资源不存在";
     if (anyErr?.response?.status >= 500) return "服务器异常，请稍后重试";
     if (anyErr?.code === "ECONNABORTED") return "请求超时，请重试";
     return fallback;
   }
   ```
2. `src/utils/http/index.ts` 的响应错误拦截（现 `:166-176`）改为：
   ```ts
   (error: PureHttpError) => {
     const $error = error;
     $error.isCancelRequest = Axios.isCancel($error);
     if ($error?.response?.status === 401) {
       removeToken();
       if (location.hash !== "#/login") location.hash = "#/login";
       return Promise.reject($error); // 401 不弹 toast（已跳转登录）
     }
     return Promise.reject($error);
   };
   ```
   **注意**：不要在拦截器里做全局 message —— 会与业务 catch 重复弹。**保留 `Promise.reject`**。
3. 全项目把 `message(...)` 中手写的错误提取逻辑替换为 `getErrorMessage(...)`（含 `system-config/hook.tsx:48-54` 的本地实现，改为从 `@/utils/error` 引入）

**注意事项**

- **不要在拦截器里加全局 toast**：本项目大量页面已有 `catch` + `message`，全局 toast 会导致重复弹两次
- 401 的处理逻辑保持不变

**验收标准**

1. `getErrorMessage` 能正确提取 `Error.message` / `{msg}` / `response.data.msg` / HTTP 状态码
2. 401 仍然正确跳转登录，不弹 toast
3. `pnpm typecheck` 通过

---

## TASK-003 · 全局样式 token（间距 / 圆角 / `.main` / 搜索区 class）

**优先级**：P1
**目标**：建立可复用的间距与控件宽度 token，让既有 23 处 `<div class="main">` 生效。

**涉及文件**：`src/style/index.scss`

**修改要求**

1. 在 `:root` 块中追加（现有内容保留不动）：
   ```scss
   --ra-space-xs: 8px;
   --ra-space-sm: 12px;
   --ra-space-md: 16px;
   --ra-space-lg: 24px;
   --ra-radius-card: 6px;
   --ra-shadow-card: 0 1px 2px rgb(0 0 0 / 4%);
   ```
2. 文件末尾追加：

   ```scss
   /* 统一页面容器（既有 23 个页面已使用 .main） */
   .main {
     display: flex;
     flex-direction: column;
     gap: var(--ra-space-md);
   }

   /* 统一搜索表单 */
   .search-form {
     padding: 16px 24px 0;
     border-radius: var(--ra-radius-card);

     :deep(.el-form-item) {
       margin-bottom: 16px;
     }
     :deep(.el-form-item__label) {
       font-weight: 400;
     }
   }

   /* 筛选控件宽度 token —— 替换全项目写死的 w-[180px]! 等 */
   .ra-input {
     width: 200px;
   }
   .ra-input-lg {
     width: 220px;
   }
   .ra-select {
     width: 160px;
   }
   .ra-select-sm {
     width: 140px;
   }
   .ra-daterange {
     width: 260px;
   }
   ```

**注意事项**

- 现有各页 `views/*/index.vue` 的 `<style scoped>` 里都有 `.search-form :deep(.el-form-item) { margin-bottom: 12px }`，**保持不动**（scoped 优先级更高，不影响）
- 不要改动 `theme.scss`（主题色定义）

**验收标准**

1. 新建的 `.main` 生效后，23 个页面的搜索区与表格区间距统一为 16px
2. `.ra-input` 等 class 可被任意页面直接使用
3. 不出现任何页面错位（`pnpm dev` 抽查 config/system-config、notice/sysNotice 两页）

---

## TASK-004 · 新增 ReStatusSwitch 组件

**优先级**：P0
**目标**：消除 5 个页面里 `setTimeout(300)` 假 loading 的状态开关，实现真实 loading + 失败回滚。

**涉及文件**：新增 `src/components/ReStatusSwitch/index.vue`

**修改要求**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { usePublicHooks } from "@/hooks/usePublicHooks";

interface Props {
  modelValue: number | boolean;
  row?: any;
  index?: number;
  activeValue?: number | boolean;
  inactiveValue?: number | boolean;
  activeText?: string;
  inactiveText?: string;
  size?: "small" | "default";
  confirmTitle?: string; // 传了才二次确认
  onChange?: (payload: {
    row: any;
    index: number;
    value: any;
    next: (ok: boolean) => void;
  }) => void | Promise<void>;
}
</script>
```

**内部实现要点**

1. `const { switchStyle } = usePublicHooks();`
2. `const pending = ref(false)`
3. `handleChange(val)`：
   - 若 `confirmTitle` 非空 → `await ElMessageBox.confirm(confirmTitle, "系统提示", { type: "warning", dangerouslyUseHTMLString: true, draggable: true })`；用户取消或异常时回滚 `emit("update:modelValue", prevValue)` 并 return
   - `pending.value = true`
   - `await props.onChange?.({ row, index, value: val, next })`
   - 无论 `onChange` 是否 await，`next(ok)` 必须被调用：`ok=false` 时回滚值 + `message(getErrorMessage(e, "状态更新失败"), {type:"error"})`
   - `pending.value = false`（在 `finally`）
4. 渲染 `<el-switch v-model="innerValue" :loading="pending" :active-text :inactive-text inline-prompt :style="switchStyle" :size :before-change="..."/>` —— 用 `beforeChange` 更稳（Element Plus 2.x 支持返回 Promise<boolean>）

**验收标准**

1. 组件可被 5 个页面的 `cellRenderer` 直接调用
2. 切换时有真实 loading（loading 时长 = 请求时长，不是固定 300ms）
3. 请求失败时开关回滚到原状态，并弹出后端返回的错误信息
4. 用户点「取消」确认框时开关不变化

---

## TASK-005 · 新增 useCrudDialog 弹窗封装

**优先级**：P0
**目标**：把 §2.9 的四条防重复提交规则固化成代码，替换 9 处手写的 `addDialog`。

**涉及文件**：新增 `src/hooks/useCrudDialog.ts`

**修改要求**

严格按 §5.1 的签名与「内部职责（强制实现）」6 条实现。核心骨架：

```ts
export function useCrudDialog<T extends Record<string, any>>(
  config: CrudDialogConfig<T>
) {
  const formRef = ref();

  async function open(
    title: "新增" | "修改",
    row?: any,
    onSuccess?: () => void
  ) {
    let initial: T = config.defaultForm();
    if (title === "修改" && config.beforeOpen) {
      try {
        initial = await config.beforeOpen(row);
      } catch (e) {
        message(getErrorMessage(e, "数据加载失败"), { type: "error" });
        return;
      }
    }

    addDialog({
      title: `${title}${config.title}`,
      props: { formInline: initial, ...config.extraProps },
      width: config.width ?? "680px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true, // ← 必须
      contentRenderer: () =>
        h(config.formComponent, {
          ref: formRef,
          formInline: initial,
          ...config.extraProps
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as T;
        if (!FormRef) {
          closeLoading();
          return;
        }
        try {
          const valid = await FormRef.validate().catch(() => false);
          if (!valid) {
            closeLoading();
            return;
          }
          const payload = config.buildPayload
            ? await config.buildPayload(curData)
            : curData;
          const result = await config.submitApi(payload);
          if (result.code !== 200)
            throw new Error(result.msg || `${title}失败`);
          message(result.msg || `${title}${config.title}成功`, {
            type: "success"
          });
          done();
          onSuccess?.();
        } catch (error) {
          closeLoading();
          message(getErrorMessage(error, `${title}${config.title}失败`), {
            type: "error"
          });
        }
      }
    });
  }

  return { open };
}
```

**注意事项**

- `contentRenderer` **不要**再传 `formInline: null`（现有 5 个页面有这个冗余）
- `buildPayload` 抛出的 `Error`（如 system-config 的「配置 Key 为必填项」）要能被 catch 到并提示

**验收标准**

1. 连点确定按钮只发出 1 次请求（Network 面板确认）
2. 校验失败时按钮 loading 消失，弹窗不关闭
3. 请求失败时按钮 loading 消失，弹窗不关闭，弹出后端 msg
4. 成功时弹窗关闭 + 成功 message + 列表刷新

---

## TASK-006 · 新增 ReSearchBar 搜索栏组件

**优先级**：P1
**目标**：统一 14 个页面的搜索区，支持折叠，消除写死宽度。

**涉及文件**：新增 `src/components/ReSearchBar/index.vue` + `types.ts`

**修改要求**

按 §5.1 的 Props / Events / 内部职责实现。要点：

1. 容器：`<el-form :inline="true" v-search-enter="handleSearch" class="search-form bg-bg_color w-full">`
2. 控件宽度：`width: "sm"` → `ra-select-sm`；`"md"` → `ra-input` / `ra-select`；`"lg"` → `ra-input-lg`
3. 折叠逻辑：`const expanded = ref(false)`；`visibleFields = computed(() => expanded.value ? props.fields : props.fields.slice(0, props.visibleCount))`
4. 折叠按钮：仅当 `fields.length > visibleCount` 时渲染，文案「展开 / 收起」+ `ArrowDown` / `ArrowUp` 图标
5. 底部按钮：`搜索`（`type="primary"` + `:icon="useRenderIcon('ri/search-line')"` + `:loading="props.loading"`）、`重置`（+ `Refresh` 图标）
6. 事件：`@search` 直接向上抛，由页面 hook 负责分页重置

**验收标准**

1. `fields.length <= visibleCount` 时不渲染展开按钮
2. 展开状态在搜索后保持（不自动收起）
3. 回车触发搜索
4. 控件宽度全部走 token class，组件内无 `w-[NNNpx]`

---

## TASK-007 · config/reward 整改

**优先级**：P0
**目标**：删除不存在的 mock 树面板，修复提交可靠性与假 loading，收敛表格列。

**涉及文件**

- `src/views/config/reward/index.vue`
- `src/views/config/reward/utils/hook.tsx`

**修改要求**

1. **删除 mock 菜单权限面板**
   - `index.vue`：删除模板 `:264-325` 整个 `<div v-if="isShow">` 块
   - `index.vue`：删除 `treeRef` / `treeHeight` / `contentRef` / `iconClass` / `onMounted` 里的 `useResizeObserver` 块，以及 `delay` / `subBefore` / `deviceDetection` / `useResizeObserver` / `nextTick` / `onMounted` / `Close` / `Check` / `IconifyIconOffline` 相关 import
   - `hook.tsx`：删除 `import { mockLoadTreeData, mockRoleMenuCheckedIds } from "../../composables/mockData"`（`:21`）、`useTreePanel` import 与调用（`:58-76`）、`return` 中的 `isShow / curRow / treeData / treeProps / isLinkage / isExpandAll / isSelectAll / treeSearchValue / handleMenu / handleSave / rowStyle / filterMethod / onQueryChanged`
   - 同步删除 `index.vue` 解构中的对应变量
2. **状态开关**：`onChange`（`:138-179`）删除，改用 `ReStatusSwitch`，`columns` 中「状态」列的 `cellRenderer` 改为：
   ```tsx
   cellRenderer: scope => (
     <ReStatusSwitch
       v-model={scope.row.status}
       row={scope.row}
       index={scope.index}
       size={scope.props.size === "small" ? "small" : "default"}
       activeText="已启用"
       inactiveText="已停用"
       confirmTitle={`确认要<strong>${scope.row.status === 1 ? "启用" : "停用"}</strong>「${scope.row.rewardKey}」吗?`}
       onChange={async ({ row, next }) => {
         try {
           const r = await updateRewardConfig({
             id: row.id,
             status: row.status
           });
           if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
           message(r.msg || "操作成功", { type: "success" });
           next(true);
         } catch (e) {
           next(false, e);
         }
       }}
     />
   );
   ```
3. **弹窗**：`openDialog`（`:181-221`）改用 `useCrudDialog`（TASK-005）
4. **列收敛**：`ID` 加 `width: 80, hide: true`；`createdTime` 加 `hide: true`
5. **搜索区**：改用 `ReSearchBar`，`fields` 为 rewardKey / rewardType / rewardValue / description / condition / status，`visibleCount: 3`
6. **删除** `contentRenderer` 里的 `formInline: null`

**验收标准**

1. 页面无「菜单权限」面板，无 `mockData` 引用
2. 连点确定只提交 1 次；失败不关窗
3. 状态开关真实 loading，失败回滚并提示
4. 表格默认列宽合计 ≤ 1100px，1366px 无横向滚动
5. `pnpm typecheck` 通过

---

## TASK-008 · config/subject 整改

**优先级**：P0
**目标**：清理死代码，修 placeholder，修可靠性，收敛列宽。

**涉及文件**

- `src/views/config/subject/index.vue`
- `src/views/config/subject/utils/hook.tsx`
- `src/views/config/subject/form.vue`

**修改要求**

1. `index.vue`：删除 `treeHeight`（`:42`）、`contentRef`（`:41`）、`iconClass`（`:22-41`）、`onMounted` + `useResizeObserver` 块（`:62-71`）；删除 `delay` / `subBefore` / `deviceDetection` / `useResizeObserver` / `nextTick` / `onMounted` 的 import
2. `form.vue:39`：`placeholder="请输入角色名称"` → `"请输入科目名称"`
3. `hook.tsx`：
   - `onChange` 改用 `ReStatusSwitch`（同 TASK-007 第 2 点）
   - `openDialog` 改用 `useCrudDialog`
   - `基础` / `卓越` / `满分` 三列（`:69-71`）补 `minWidth: 90, align: "right"`
   - `ID` 加 `width: 80, hide: true`；`createdTime` 加 `hide: true`
4. 搜索区改用 `ReSearchBar`（4 项，`visibleCount: 4`，不显示展开按钮）

**验收标准**

1. `treeHeight` / `contentRef` / `useResizeObserver` 全部移除
2. placeholder 正确
3. 弹窗防重复提交生效，状态开关真实 loading
4. 表格列宽合计 ≤ 1100px
5. `pnpm typecheck` && `pnpm lint:eslint` 通过

---

## TASK-009 · config/pocket-money 整改

**优先级**：P0
**涉及文件**：`src/views/config/pocket-money/utils/hook.tsx`

**修改要求**

1. `openDialog`（`:~95-125`）改用 `useCrudDialog`
2. 删除 `contentRenderer` 里的 `formInline: null`
3. `ID` / `createdTime` 加 `hide: true`
4. 搜索区改用 `ReSearchBar`（3 项）

**验收标准**：确定按钮有 loading；失败不关窗；列宽达标。

---

## TASK-010 · config/morning-greeting 整改

**优先级**：P0
**涉及文件**

- `src/views/config/morning-greeting/index.vue`
- `src/views/config/morning-greeting/utils/hook.tsx`

**修改要求**

1. `index.vue`：删除未使用的 `deviceDetection` import（`:6`）
2. `hook.tsx`：
   - `defaultForm`（`:45`）补 `enabled: ""`
   - `onChange` 改用 `ReStatusSwitch`
   - `openDialog` 改用 `useCrudDialog`，删 `formInline: null`
   - `ID` / `createdTime` 加 `hide: true`
3. 搜索区改用 `ReSearchBar`（2 项）

**验收标准**

1. 选择「状态」筛选后请求参数含 `enabled`
2. 弹窗防重复提交；状态开关真实 loading
3. `pnpm lint:eslint` 无「未使用变量」错误

---

## TASK-011 · config/mail 整改

**优先级**：P0
**涉及文件**：`src/views/config/mail/utils/hook.tsx`

**修改要求**

1. `handleSave`（`:78-94`）包 `try/catch`，失败 `message(getErrorMessage(error, "保存失败"), { type: "error" })`
2. `onChange` 改用 `ReStatusSwitch`
3. `openDialog` 改用 `useCrudDialog`，删 `formInline: null`
4. `ID` / `createdTime` 加 `hide: true`
5. 搜索区改用 `ReSearchBar`（3 项）
6. **注意**：右侧收件人用户树面板是真实功能（`getMailRecipientUserList` / `updateMailRecipientUser`），**不要删除**

**验收标准**：收件人保存失败有提示；树面板功能完好；弹窗防重复提交。

---

## TASK-012 · config/user 整改

**优先级**：P0
**涉及文件**

- `src/views/config/user/index.vue`
- `src/views/config/user/utils/hook.tsx`
- `src/views/config/user/form.vue`
- `src/views/config/user/utils/types.ts`

**修改要求**

1. `index.vue`：
   - 删除 `treeRef` / `treeHeight` / `contentRef` / `iconClass` / `onMounted`+`useResizeObserver` 块（`:43-82`）
   - 删除 `isShow` / `curRow` / `rowStyle` / `handleMenu` / `handleSave` 的解构与全部使用
   - 删除「更多」下拉触发器上的 `@click="handleUpdate(row)"`（`:233`）
   - 搜索区改用 `ReSearchBar`（4 项）
2. `hook.tsx`：
   - 删除 `useTreePanel` import 与调用，以及 `return` 中的 `isShow / curRow / rowStyle / handleMenu / handleSave / treeData / treeProps / isLinkage / isExpandAll / isSelectAll / treeSearchValue / filterMethod / onQueryChanged`
   - 删除空函数 `handleUpdate`（`:169`）
   - `openDialog` 的 `formInline` 补 `status: row?.status ?? 1`
   - `openDialog` / `handleUpload` / `handleReset` / `handleRole` 四个弹窗**全部**加 `sureBtnLoading: true` + `closeLoading()`（或统一改用 `useCrudDialog`）
   - `onChange` 改用 `ReStatusSwitch`
   - `loadXxxOptions`（`:393-400`）的 `console.error` 改为 `message(getErrorMessage(e, "加载选项失败"), { type: "error" })`
   - `ID` / `createdTime` 加 `hide: true`
3. `form.vue`：在「生日」之后新增
   ```vue
   <el-form-item label="状态" prop="status">
     <el-radio-group v-model="newFormInline.status">
       <el-radio :value="1">启用</el-radio>
       <el-radio :value="0">停用</el-radio>
     </el-radio-group>
   </el-form-item>
   ```
4. `types.ts`：`FormItemProps` 的 `status` 类型补全为 `number`

**验收标准**

1. 页面无 `useTreePanel` 残留、无空函数 `handleUpdate`
2. 新增/修改弹窗内可设置状态，保存后列表状态列立即更新
3. 4 个弹窗确定按钮均有 loading
4. 选项加载失败有错误提示
5. `pnpm typecheck` 通过

---

## TASK-013 · config/system-config 搜索折叠 + 列收敛

**优先级**：P1
**涉及文件**

- `src/views/config/system-config/index.vue`
- `src/views/config/system-config/utils/hook.tsx`

**修改要求**

1. `index.vue`：搜索区（`:46-136`）改用 `ReSearchBar`
   ```ts
   const searchFields = [
     { prop: "configKey", label: "配置 Key", type: "input", width: "lg" },
     { prop: "configValue", label: "配置值", type: "input" },
     {
       prop: "status",
       label: "状态",
       type: "select",
       width: "sm",
       options: formOptions.statusOptions,
       optionsLoading
     },
     { prop: "description", label: "说明", type: "input" },
     {
       prop: "configGroup",
       label: "配置分组",
       type: "select",
       filterable: true,
       allowCreate: true,
       options: formOptions.groups,
       optionsLoading
     },
     {
       prop: "valueType",
       label: "值类型",
       type: "select",
       options: formOptions.valueTypes,
       optionsLoading
     },
     {
       prop: "sensitive",
       label: "敏感标识",
       type: "select",
       options: formOptions.sensitiveOptions,
       optionsLoading
     }
   ];
   // visibleCount: 3
   ```
2. `hook.tsx`：`handleDelete`（`:466-485`）在成功后补 `form.current = 1`；`ID` / `description` / `createdTime` 三列加 `hide: true`
3. **不要动**：`sureBtnLoading`（`:348`）、`closeLoading()`、真实 await 的 `onStatusChange`（`:407-452`）、`resetForm` 的 `form.current = 1`（`:307`）

**验收标准**

1. 默认 3 项 + 「展开」；展开后 7 项
2. 删除后回第 1 页
3. 列宽合计 ≤ 1100px
4. 现有的防重复提交与状态切换逻辑行为不变

---

## TASK-014 · config/holiday + config/mail-task 小修

**优先级**：P2
**涉及文件**

- `src/views/config/holiday/utils/hook.tsx`
- `src/views/config/mail-task/utils/hook.tsx`
- `src/views/config/mail-task/detail.vue`

**修改要求**

1. `holiday/hook.tsx`：`handleDelete`（`:684-703`）改为自定义实现，成功后 `form.current = 1; onSearch(); loadOptions();`（不再走 `useCrudTable.handleDelete`）
2. `mail-task/hook.tsx`：
   - `handleRetry`（`:149`）的 `.catch(() => {})` 改为 `.catch(e => message(getErrorMessage(e, "重试失败"), { type: "error" }))`
   - `loadStatusOptions`（`:156-158`）的 `console.error` 改为 `message`
   - 需 `import { getErrorMessage } from "@/utils/error"`
3. `mail-task/detail.vue`：`handleRetry`（`:101`）同上处理

**验收标准**：删除末页唯一记录后回第 1 页；重试失败有提示。

---

## TASK-015 · notice/sysNotice 整改

**优先级**：P0
**涉及文件**

- `src/views/notice/sysNotice/hook.tsx`
- `src/views/notice/sysNotice/index.vue`

**修改要求**

1. `hook.tsx` 的 `openDialog`（`:300-357`）：
   - `addDialog` 补 `sureBtnLoading: true`
   - `beforeSure` 改为：`result.code !== 200` 时 `throw new Error(result.msg || `${title}公告失败`)`，**不再先弹 message 再 `done()`**
   - 成功后 `message(result.msg || `${title}公告成功`, { type: "success" })` → `done()` → `onSearch()`
   - catch 中 `closeLoading()` + `message(getErrorMessage(...), { type: "error" })`，**不调用 `done()`**
2. `ID` / `createdTime` 列加 `hide: true`
3. `index.vue`：搜索控件 `w-[220px]!` → `ra-input-lg`，`w-[150px]!` → `ra-select-sm`（`:84/92/107/122/137`）；或整体改用 `ReSearchBar`

**验收标准**

1. 确定按钮有 loading
2. 提交失败（后端 code≠200）时弹窗不关闭，只弹一次 error message
3. 表格 1366px 无横向滚动

---

## TASK-016 · monitor 三套 health：抽公共工具函数

**优先级**：P1
**涉及文件**

- `src/views/monitor/utils.ts`（改造）
- `src/views/monitor/ai-provider-health/hook/useProviderStatus.tsx`
- `src/views/monitor/geo-provider-health/hook/useGeoProviderStatus.tsx`
- `src/views/monitor/image-provider-health/hook/useImageProviderStatus.tsx`

**修改要求**

1. `monitor/utils.ts` 追加导出（现有 `getPickerShortcuts` 保留）：
   ```ts
   export function formatTime(value?: string | number | null): string;
   export function formatRelative(value?: string | number | null): string;
   export function createReasonLabelGetter(map: Record<string, string>) {
     return (reason?: string) => map[reason] ?? reason ?? "-";
   }
   ```
2. 三个 `use*Status.tsx`：删除本地的 `formatTime` / `formatRelative` / `getStatusLabel` / `getReasonLabel`（`ai:35-74` / `geo:39-76` / `image:39-77`），改为从 `../../utils` 引入；`getReasonLabel` 用 `createReasonLabelGetter(本模块的 reasonMap)` 生成
3. 各模块自己的 reasonMap 保留在各自文件顶部

**验收标准**

1. `formatTime` 等函数全项目只保留一份实现
2. 三套页面所有时间/原因文案与改造前完全一致
3. `pnpm typecheck` 通过

---

## TASK-017 · monitor 三套 health：表格列与交互修正

**优先级**：P1
**涉及文件**

- `src/views/monitor/geo-provider-health/hook/useGeoProviderAlertRecord.tsx`
- `src/views/monitor/image-provider-health/hook/useImageProviderAlertRecord.tsx`
- 三个 `components/provider-status.vue`
- 三个 `hook/use*Status.tsx`

**修改要求**

1. 两个 alert-record hook：
   - 操作列补 `fixed: "right"`
   - 「首次告警」(firstAlertTime) 与「解决时间」(resolvedTime) 加 `hide: true`
   - 「内容」列加 `showOverflowTooltip` 与 `minWidth: 220`
2. 三个 `provider-status.vue` 的 `el-tabs` `@tab-click`：`handleTabClick` 加防抖（用 `@vueuse/core` 的 `useDebounceFn`，项目已依赖）
3. 三个 `use*Status.tsx`：卡片列表请求 `size: 100` 保持不变，但若返回的 `total > 100`，在卡片区顶部显示提示条：
   ```vue
   <el-alert
     v-if="total > list.length"
     type="info"
     :closable="false"
     :title="`共 ${total} 个供应商，当前展示前 ${list.length} 个，请使用筛选缩小范围`"
   />
   ```

**验收标准**

1. geo / image 告警表格操作列固定右侧
2. 快速连点 tab 只触发 1 次请求
3. 供应商超过 100 时有可见提示

---

## TASK-018 · daily-image/manage 第一步：抽 UploadTaskList

**优先级**：P1（零风险去重，优先于拆分）
**涉及文件**

- 新增 `src/views/daily-image/manage/components/UploadTaskList.vue`
- `src/views/daily-image/manage/index.vue`

**修改要求**

1. 对比 `index.vue:1003-1028`（`upload-dialog-list`）与 `:1058-1083`（`upload-panel__list`），二者几乎逐行一致
2. 抽成 `UploadTaskList.vue`：
   ```ts
   interface Props {
     tasks: UploadTask[];
     compact?: boolean;
   }
   // 纯展示组件，无内部状态
   ```
3. 两处替换为 `<UploadTaskList :tasks="uploadTasks" />` 与 `<UploadTaskList :tasks="uploadTasks" compact />`
4. 相关 CSS 从 `index.vue` 的 `<style>` 移入组件（`:deep()` 需要处理，改为组件内 scoped）

**验收标准**

1. 上传任务列表只有一份实现
2. 上传弹框与上传浮层的任务列表表现完全一致
3. `index.vue` 减少约 60 行

---

## TASK-019 · daily-image/manage 第二步：组件拆分

**优先级**：P1
**涉及文件**：`src/views/daily-image/manage/index.vue` + 新增 5 个组件（见 §4.12）

**修改要求**

按 §4.12 的表格逐一拆分：

1. 先拆 `DailyToolbar`（`322-371`）与 `BatchActionBar`（`374-427`）—— 二者无内部状态，最安全
2. 再拆 `ImageGrid` + `ImageCard`（`429-553`）
3. 再拆 `UploadDialog`（`971-1037`，内部复用 TASK-018 的 `UploadTaskList`）
4. 最后拆 `DetailDrawer`（`570-968`，最大且带内部状态，放在最后）
5. CSS 随组件迁移到各自 `<style scoped>`

**注意事项**

- `DetailDrawer` 内部有 `saveRemark` / `delete` / `regenerate` / 上一张下一张导航，**拆分后行为必须完全一致**
- `regenerateVision` 目前无竞态保护，可顺带补一个 `seq` 守卫（可选）

**验收标准**

1. `index.vue` ≤ 500 行
2. 六条主流程（上传 / 预览 / 编辑备注 / 删除 / 批量下载 / 全屏预览）行为不变
3. `pnpm typecheck` 通过

---

## TASK-020 · monitor/logs/operation/detail.vue 拆分

**优先级**：P1
**涉及文件**：`src/views/monitor/logs/operation/detail.vue` + 新增 3 组件 1 composable

**修改要求**

按 §4.11 表格拆分：

1. 先抽 `composables/useTaskLogDetail.ts`（`formatMs` / `percentOfTotal` / `clockAt` / `META_KEY_LABEL`，原 `:220-296`）
2. 再拆 `ExceptionBlock.vue`（`793-818`，最简单）
3. 再拆 `StepDetail.vue`（`596-789`）
4. 最后拆 `StepWaterfall.vue`（`481-593`，含键盘导航 `moveActive` `:182`）
5. CSS 迁移：`:1057-1233` → StepWaterfall，`:1235-1434` → StepDetail，`:1436-1509` → ExceptionBlock

**验收标准**

1. `detail.vue` ≤ 450 行
2. 步骤点击切换、键盘上下导航、异常区展开、复制按钮全部正常
3. `pnpm typecheck` 通过

---

## TASK-021 · welcome 首页拆分

**优先级**：P2
**涉及文件**：`src/views/welcome/index.vue` + 新增 7 个组件

**修改要求**

按 §4.13 拆 `Topbar` / `HealthStrip` / `ActionCenter` / `MetricsPanel` / `QuickEntries` / `TrendChart` / `ActivityList`。

**注意事项（重要）**

- 现有的 `ModuleState` loading（`:69`）、`errors`（`:76`）、`inline-error` 重试按钮（`:421/473/521/593/618`）、`empty-copy` 空态、`firstLoadFailed` 全局 alert（`:361-371`）**必须原样保留**
- ECharts 的 `useResizeObserver`（`:338`）、主题切换 `MutationObserver` 重绘（`:342-349`）、`onBeforeUnmount dispose`（`:354`）**必须原样保留**

**验收标准**

1. 主文件 ≤ 350 行
2. 六模块的 loading / 局部错误重试 / 空态正常
3. 窗口缩放与主题切换时图表正常重绘，离开页面时 dispose

---

## TASK-022 · 宽度 token 化全量替换

**优先级**：P2
**目标**：消除 115 处写死宽度。

**涉及文件**：所有含 `w-[NNNpx]!` 的 `views/**/index.vue`

**修改要求**

| 现状                                     | 替换           |
| ---------------------------------------- | -------------- |
| `w-[180px]!` / `w-[200px]!`（el-input）  | `ra-input`     |
| `w-[220px]!`（el-input）                 | `ra-input-lg`  |
| `w-[180px]!` / `w-[160px]!`（el-select） | `ra-select`    |
| `w-[140px]!` / `w-[150px]!`（el-select） | `ra-select-sm` |

**例外（不要改）**

- `min-w-[calc(100vw-60vw-268px)]!`（`config/mail/index.vue` 等树面板宽度，是布局计算不是控件宽度）
- `w-[60vw]!`（表格栏宽度联动）

**执行顺序**：先做 config/_（9 页），再做 notice / permission / love / monitor/_

**验收标准**

1. `grep -rn "w-\[[0-9]*px\]!" src/views/` 剩余结果仅为例外的 2 类
2. 所有筛选控件视觉宽度一致（同类控件对齐）
3. 逐页肉眼核查无错位

---

## TASK-023 · console.error 收敛

**优先级**：P2
**目标**：让异常对用户可见，消除 57 处静默吞异常。

**涉及文件**：所有含 `console.error` 的 `views/**`（29 个文件）

**修改要求**

1. 逐个判断上下文：
   - **在 `catch` 块中** → 改为 `message(getErrorMessage(error, "XXX失败"), { type: "error" })`
   - **选项加载失败**（`loadXxxOptions`）—— 已有 `message` 的，`console.error` 可保留（开发调试用）；只有 `console.error` 的必须补 `message`
   - **`useDownload.ts:handleError`**（`hooks/useDownload.ts`）—— **保留**（这是有意的设计，错误已通过 `message` 弹出，console 用于排查）
2. 优先处理没有用户提示的（如 `ai-call-record/hook.tsx:307`、`config/user/utils/hook.tsx:393-400`、`config/mail-task/utils/hook.tsx:156-158`）

**验收标准**

1. 所有 catch 块都会给用户可见提示
2. `console.error` 数量降至 ≤ 20（仅剩开发调试用途）
3. 不出现「同一错误弹两次 toast」

---

## TASK-024 · 错误页合并

**优先级**：P3
**涉及文件**

- 新增 `src/views/error/ErrorPage.vue`
- `src/views/error/403.vue` / `404.vue` / `500.vue`

**修改要求**

1. `ErrorPage.vue` props：`code`（"403"|"404"|"500"）、`title`、`desc`、`svg`（组件）
2. 三个原文件改为薄壳：
   ```vue
   <script setup lang="ts">
   import ErrorPage from "./ErrorPage.vue";
   import svg403 from "@/assets/status/403.svg?component";
   </script>
   <template>
     <ErrorPage code="403" title="无权访问" desc="..." :svg="svg403" />
   </template>
   ```
3. 保持现有 `.main-content { margin: 0 !important }` 与 `v-motion` 动画

**验收标准**：三个错误页视觉与动画完全不变；代码量减少约 130 行。

---

## TASK-025 · 确认并处理 logs/version/detail.vue 疑似死文件

**优先级**：P3
**涉及文件**：`src/views/monitor/logs/version/detail.vue`

**修改要求**

1. **先只读核查**：`grep -rn "detail" src/views/monitor/logs/version/` 与 `grep -rn "logs/version" src/router/`，确认是否被动态路由或 `addDialog` 引用
2. 若确认无引用 → **先告知用户，得到确认后再删除**，不得擅自删除
3. 若被引用 → 保持不变，在报告中注明

**验收标准**：给出明确的引用核查结论；未获用户确认前不删除任何文件。

---

## TASK-026 · （可选）三套 provider-health 配置化组件

**优先级**：P2（**建议在前 25 个 TASK 全部完成、回归测试通过后再评估**）

**目标**：把三套 95% 重复的 provider-health 收敛为 1 个配置化组件。

**风险提示**

- 涉及约 4500 行代码，是本次方案中改动最大的一项
- 三个模块虽结构相同，但**卡片指标字段、批量操作集合、检测/告警列定义、getReasonLabel 字典**均不同
- 违反「小范围重构 / 渐进式优化」原则，**如无强烈诉求建议不做**

**如确需执行**，采用配置化方案：

```ts
interface ProviderHealthConfig {
  name: string;                          // "AI" | "地理" | "图片"
  enablePoolDimension: boolean;          // 仅 geo 为 true
  statusApi / checkApi / alertApi / batchApis: ...;
  cardMetrics: Array<{ key: string; label: string; formatter?: (row:any)=>string }>;
  cardActions: Array<{ key: string; label: string; handler: (row:any)=>Promise<void> }>;
  batchActions: Array<{ key: string; label: string; type?: string }>;
  checkColumns: TableColumnList;
  alertColumns: TableColumnList;
  reasonMap: Record<string, string>;
}
```

新增 `src/views/monitor/components/ProviderHealthPanel.vue` + `useProviderHealth.ts`，三个 `index.vue` 改为传入不同 config 的薄壳。

**验收标准**：三个页面的全部功能（启用/禁用/探测/重置熔断/查余额/批量操作/告警解决/检测记录抽屉）逐项人工走查通过。

---

## TASK-027 · 最终回归与构建验证

**优先级**：P0
**涉及文件**：全项目

**修改要求**

1. `pnpm typecheck` —— 零错误
2. `pnpm lint:eslint` —— 零新增错误（`--max-warnings 0`）
3. `pnpm lint:stylelint` —— 零新增错误
4. `pnpm build` —— 构建成功
5. 按 §10 Checklist 逐项自检

**验收标准**：以上 4 条命令全部通过。

---

# 9. 推荐执行顺序

```text
第一阶段 · 基础设施（无业务风险，必须先做）
  TASK-001  useCrudTable 三个 P0 修复
  TASK-002  HTTP 错误兜底 + getErrorMessage
  TASK-003  全局样式 token
  → 完成后跑一次 typecheck + 抽查 config/subject 页

第二阶段 · 公共组件（后续页面整改依赖）
  TASK-004  ReStatusSwitch
  TASK-005  useCrudDialog
  TASK-006  ReSearchBar
  → 完成后用一个页面（建议 config/pocket-money，最简单）先验证组件可用性

第三阶段 · config 模块逐个整改（组件已就绪，可批量复制模式）
  TASK-009  pocket-money（最简单的验证场）
  TASK-007  reward（含删 mock 面板）
  TASK-008  subject
  TASK-010  morning-greeting
  TASK-011  mail
  TASK-012  config/user
  TASK-013  system-config
  TASK-014  holiday + mail-task
  → 每个 TASK 后跑 typecheck

第四阶段 · 其他列表页
  TASK-015  notice/sysNotice
  TASK-016  monitor 三套 health 公共函数
  TASK-017  monitor 三套 health 列与交互

第五阶段 · 大文件拆分（风险相对高，放在功能修复之后）
  TASK-018  daily-image 抽 UploadTaskList（零风险去重）
  TASK-019  daily-image 组件拆分
  TASK-020  operation/detail.vue 拆分
  TASK-021  welcome 拆分

第六阶段 · 全局收敛与收尾
  TASK-022  宽度 token 化全量替换
  TASK-023  console.error 收敛
  TASK-024  错误页合并
  TASK-025  死文件核查（需用户确认）
  TASK-027  最终回归与构建验证

第七阶段 · 可选（评估后再决定）
  TASK-026  三套 provider-health 配置化
```

**依赖说明**

- TASK-007 ~ TASK-012 依赖 TASK-004 / TASK-005 / TASK-006
- TASK-016 与 TASK-017 互不阻塞，但 TASK-017 建议在后（避免与 TASK-016 的 import 改动冲突）
- TASK-022 放在倒数第二步：大量文件会被前面的 TASK 改写，提前做会产生大量冲突
- TASK-026 完全独立于其他 TASK，可无限期延后

---

# 10. 最终验收 Checklist

执行 AI 完成全部 TASK 后，逐项自检：

## 交互可靠性

```
□ 所有 addDialog 调用均设置了 sureBtnLoading: true
□ 连点「确定」按钮只发出 1 次请求
□ 校验失败时：按钮 loading 消失、弹窗不关闭、字段下方显示红色错误
□ 请求失败时：按钮 loading 消失、弹窗不关闭、弹出后端返回的 msg
□ 请求成功时：弹窗关闭 + 成功 message + 列表刷新
□ 所有状态开关（el-switch）使用真实请求 loading，不再有 setTimeout 假 loading
□ 状态开关请求失败时回滚到原状态并提示
□ 所有删除操作有二次确认（行内 el-popconfirm / 批量 ElMessageBox.confirm）
□ 所有「搜索」按钮有 :loading="loading"
□ 所有「导出」按钮有 loading 且幂等（走 useDownload）
□ 所有批量操作在执行期间按钮禁用
```

## 状态完整性

```
□ 所有列表有 loading 状态
□ 所有列表请求失败时有 error 提示（不再静默）
□ 所有列表请求失败时清空数据（不残留旧数据）
□ 所有列表有空态（el-table 默认空态或 ReEmpty）
□ 所有筛选无结果时给出可理解的提示
□ 所有异步选项加载（formOptions / statusOptions 等）失败时有提示
```

## 分页与筛选

```
□ 点「重置」后回到第 1 页
□ 点「搜索」后回到第 1 页
□ 删除末页唯一记录后回退到上一页
□ 切换每页条数后回到第 1 页
□ 编辑保存后保持在当前页码
□ 所有 >4 项的搜索区有「展开 / 收起」
```

## 视觉一致性

```
□ 同类筛选控件宽度一致（输入 200 / 选择 160 / 短选择 140）
□ 所有页面搜索区与表格区间距一致（16px）
□ 所有表格操作列 fixed: right
□ 所有表格时间列格式统一 YYYY-MM-DD HH:mm:ss，空值显示 "-"
□ 所有表格表头样式统一（--el-fill-color-light 背景）
□ 弹窗宽度只有 480 / 680 / 800 三档
□ 无硬编码十六进制色值（theme.scss 除外）
□ 无失效的 <div class="main">（全局样式已定义）
```

## 响应式

```
□ 1366px 下所有列表表格无横向滚动（默认可见列宽合计 ≤ 1100px）
□ 1440px / 1920px 下布局正常
□ 1024px 下不出现布局崩坏（允许表格内部横向滚动）
□ 不做移动端适配（保持 deviceDetection() 全屏弹窗兜底即可）
```

## 代码质量

```
□ 无未使用的 import（ESLint 零警告）
□ 无空函数、无死代码（treeHeight / useTreePanel 残留已清理）
□ 无复制粘贴的假数据引用（mockLoadTreeData 等）
□ daily-image/manage/index.vue ≤ 500 行
□ monitor/logs/operation/detail.vue ≤ 450 行
□ welcome/index.vue ≤ 350 行
□ 三个 provider-health 的 formatTime 等工具函数只有一份实现
□ console.error 数量 ≤ 20（仅剩开发调试用途）
```

## 工程约束

```
□ 未修改任何后端接口
□ 未新增任何第三方依赖
□ 未修改业务逻辑语义
□ 未删除任何文件（除用户明确确认的死文件）
□ pnpm typecheck 零错误（tsc --noEmit 与 vue-tsc --noEmit 均通过）
□ pnpm lint:eslint 零新增错误
□ pnpm lint:stylelint 零新增错误
□ pnpm build 构建成功
```

---

# 附录 A · 改造前后对照速查

| 指标                        | 改造前                                                     | 改造后目标                   |
| --------------------------- | ---------------------------------------------------------- | ---------------------------- |
| `sureBtnLoading: true` 覆盖 | 8 / 26 处（31%）                                           | 26 / 26（100%）              |
| 假 loading（setTimeout）    | 5 处                                                       | 0                            |
| 失败也关窗的弹窗            | 6 处                                                       | 0                            |
| `console.error` 静默吞异常  | 57 处                                                      | ≤ 20（且均有用户提示）       |
| 写死控件宽度                | 115 处                                                     | 0（仅剩 2 类布局计算例外）   |
| 弹窗宽度档位                | 7 种                                                       | 3 种                         |
| `.main` 样式定义            | 无（23 页用了空壳类）                                      | 有                           |
| 超 700 行的文件             | 4 个（1887 / 1510 / 1460 / 860）                           | 0（拆分后均 ≤ 500）          |
| 1366px 横向滚动的列表       | reward / subject / system-config / geo-alert / image-alert | 0                            |
| 三套 health 重复代码        | ~1500 行 × 3                                               | 共享工具已抽离（组件化可选） |
| 后端接口改动                | —                                                          | **0**                        |
| 新增第三方依赖              | —                                                          | **0**                        |

---

# 附录 B · 质量标杆文件（改造时照抄这套写法）

执行 AI 在不确定「应该写成什么样」时，直接参考以下四个文件：

| 场景                       | 标杆文件                                                      | 参考点                                                                                                                                |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 列表 + 弹窗 + 状态开关全套 | `src/views/config/system-config/utils/hook.tsx`               | `:284-302` onSearch 带 catch；`:311-405` 弹窗（sureBtnLoading + closeLoading + 失败不关窗）；`:407-452` 状态切换真实 await + 失败回滚 |
| 表单校验与分组             | `src/views/config/holiday/form.vue` + `utils/rule.ts`(190 行) | 完整校验规则、日期范围、分组表单                                                                                                      |
| 复杂详情弹窗               | `src/views/monitor/logs/operation/detail.vue`（拆分前）       | 局部 loading / 空态 / 异常区 / 键盘导航                                                                                               |
| 大文件内的状态管理         | `src/views/welcome/index.vue`                                 | `ModuleState` 分模块 loading + `errors` + `inline-error` 重试 + `empty-copy` 空态                                                     |
| 导出幂等                   | `src/hooks/useDownload.ts`                                    | loading + 幂等 + 最小 loading 时长 + HTTP 200 但 body 是 JSON 错误的探测                                                              |
