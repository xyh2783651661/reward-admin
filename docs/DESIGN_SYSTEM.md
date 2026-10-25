# 设计规范（Design System）

本项目基于 Element Plus + pure-admin，在其主题变量之上补充一层 `--ra-*` 项目级 Token（定义于 `src/style/index.scss`）。新增 / 修改页面时一律使用 Token，不再写裸数值或裸色值。

## 1. 颜色

| 用途                             | 使用                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| 主色 / 成功 / 警告 / 危险 / 信息 | `var(--el-color-primary \| success \| warning \| danger \| info)` |
| 浅底（提示块、选中态）           | `var(--el-color-primary-light-9)` 等 `-light-*` 变量              |
| 正文 / 次要 / 辅助文字           | `--el-text-color-primary / regular / secondary / placeholder`     |
| 页面底 / 卡片底 / 填充           | `--el-bg-color-page / --el-bg-color / --el-fill-color-light`      |
| 边框                             | `--el-border-color / -light / -lighter`                           |
| 代码块、JSON、日志预览（深底）   | `--ra-code-bg / --ra-code-text / --ra-code-border`                |

- 禁止在页面中写 `#fff`、`#999` 等裸色值，否则暗色模式会失效。
- 业务语义色（如心情、密码强度）只允许集中定义在常量中，不散落在模板里。

## 2. 字号

`--ra-font-2xs 11` 角标 · `--ra-font-xs 12` 辅助说明 / 表格次要信息 · `--ra-font-sm 13` 次要正文 · `--ra-font-base 14` 正文 · `--ra-font-md 16` 卡片标题 · `--ra-font-lg 18` 区块标题 · `--ra-font-xl 20` 页面标题 · `--ra-font-2xl 24` 指标数值 · `--ra-font-display 28` 大屏指标。

ID、编号、JSON、代码统一使用 `font-family: var(--ra-font-mono)`。

## 3. 间距与圆角

- 间距：`--ra-space-2xs 4 / xs 8 / sm 12 / md 16 / lg 24 / xl 32`。页面内容区间距 `md`，卡片内边距 `md`，表单项间距 `sm`。
- 圆角：`--ra-radius-sm 4`（标签、小按钮、输入框内元素）· `--ra-radius-md 8`（卡片、面板、弹窗内分区）· `--ra-radius-lg 12`（大面板、媒体卡片）· `--ra-radius-pill 999px`（胶囊、徽标）。

## 4. 弹窗宽度

统一使用 `RA_DIALOG_WIDTH`（`src/constants/index.ts`）：

| 尺寸 | 宽度  | 场景                                             |
| ---- | ----- | ------------------------------------------------ |
| `sm` | 520px | 确认类、少量字段（重置密码、分配角色、发布策略） |
| `md` | 680px | 标准新增 / 编辑表单                              |
| `lg` | 960px | 复杂表单、树形分配、富内容查看                   |

小屏通过 `fullscreen: deviceDetection()` 自动全屏。

## 5. 页面骨架

- 列表页：`ReSearchBar`（搜索区）+ `PureTableBar`（工具栏 + 列设置）+ `pure-table`，分页使用 `RA_PAGINATION`，数据由 `useCrudTable` 或页面 hook 管理。
- 搜索字段宽度统一用 `SearchField.width`（`sm / md / lg`），不要在页面内覆盖 EP 宽度。
- 状态开关统一 `ReStatusSwitch`，确认 / 失败回滚由组件处理。
- 卡片统一 `PanelCard`。

## 6. 状态反馈

- 加载：表格用 `loading` 属性；卡片区用 `v-loading` 或 `el-skeleton`。不要用 `setTimeout` 伪造加载时长。
- 空态：使用 `el-empty`，描述写清楚“暂无 xx”及下一步操作。
- 失败：请求失败必须给出提示 `message(getErrorMessage(error, "xx失败"), { type: "error" })`，不允许只 `console.error` 静默吞掉。
