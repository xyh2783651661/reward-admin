# 页面级功能逆向工程报告（reward-admin）

> 阶段：在「系统级 / 模块级 / 产品 UX / 技术审计」之后，下钻到**页面内部**的逆向工程。
> 方式：全部基于实际 Read/Grep 代码取证，只读、未修改任何文件。
> 范围：本系统 18 个核心业务页面，逐页建立「页面功能档案」，并向上溯源到具体代码位置。
> 关联报告：`reward-admin-AUDIT-MASTER.md`（技术审计）、`reward-admin-PRODUCT-UX-TECH-AUDIT.md`（产品/UX/业务）、`reward-admin-UX-DESIGN.md`（交互设计方案）、`reward-admin-AUDIT-REPORT.md`（逐条代码证据）。

---

## 〇、页面功能矩阵（全量 18 页）

| #   | 页面                            | 核心任务               | 操作数 | API数 | 复杂度 | 体验风险 | 技术风险 | 优先级 |
| --- | ------------------------------- | ---------------------- | -----: | ----: | ------ | -------- | -------- | ------ |
| 1   | `permission/user` 系统用户      | 后台账号/角色/重置密码 |      6 |     7 | 中     | B        | B        | B      |
| 2   | `permission/role` 角色权限      | 角色 + 菜单权限树      |      6 |     7 | **高** | **A**    | **A**    | A      |
| 3   | `permission/menu` 菜单管理      | 菜单树维护             |      3 |     4 | 中     | B        | B        | B      |
| 4   | `monitor/ai-provider-health`    | AI供应商健康/启停      |    10+ |   10+ | **高** | **A**    | **A**    | A      |
| 5   | `monitor/geo-provider-health`   | 地理供应商健康(镜像)   |    10+ |   10+ | 高     | A        | A        | A      |
| 6   | `monitor/image-provider-health` | 图片供应商健康(镜像)   |    10+ |   10+ | 高     | A        | A        | A      |
| 7   | `monitor/ai-call-record`        | AI调用流水(只读)       |      3 |     3 | 中     | C        | C        | C      |
| 8   | `config/user` 奖励用户          | C端用户主数据          |      9 |     7 | 中     | **S**    | **S**    | **S**  |
| 9   | `config/reward` 奖励配置        | 奖励规则字典           |      6 |     5 | 中     | A        | A        | A      |
| 10  | `config/pocket-money` 零花钱    | 零花钱规则             |      5 |     6 | 低     | C        | C        | C      |
| 11  | `love/records` 恋爱记录         | 记录 CRUD + 多图       |      6 |     7 | 中     | **S**    | **S**    | **S**  |
| 12  | `love/anniversaries` 纪念日     | 纪念日 CRUD            |      4 |     4 | 低     | B        | B        | B      |
| 13  | `love/media` 媒体库             | 画廊 + 上传/删除       |      3 |     4 | 低     | **S**    | **S**    | **S**  |
| 14  | `notice/sysNotice` 公告         | 公告发布/撤回          |      7 |     7 | 中     | A        | A        | A      |
| 15  | `daily-image/manage` 每日图     | 网格 + 批量            |     12 |     8 | 高     | A        | A        | A      |
| 16  | `welcome` 工作台                | 大盘聚合               |      6 |     5 | **高** | A        | A        | A      |
| 17  | `login` 登录                    | 登录                   |      3 |     2 | 低     | C        | C        | C      |
| 18  | `monitor/cache-monitor` 缓存    | 缓存监控(ECharts)      |      4 |     4 | 中     | B        | B        | B      |

> 复杂度/风险评级已交叉核验。优先级沿用前序审计的 S/A/B/C 与 P0–P3 体系（本项目无 P0/P1）。

---

## 一、Top 10 优先优化页面（按用户收益 × 风险暴露排序）

1. **`config/user` 奖励用户** — S 级：失败弹"成功"假提示、重置密码/上传头像/分配角色缺权限守卫且为假实现、编辑空密码提交。直接影响数据可信度与账号安全。
2. **`love/media` 媒体库** — S 级：删除/上传 **0 处 v-perms**，删除失败静默、确认文案无文件名、跨页破坏 records 引用。
3. **`love/records` 恋爱记录** — S 级：日期控件 `type="recordDate"` 非法 + 必填校验键名错配（可空提交）+ 编辑内删图不可撤销。
4. **`monitor/*-provider-health` ×3** — A 级：批量启停/批量重置熔断 **无 v-perms 守卫**，误点可中断 C 端 AI/地理/图片能力；三套镜像重复约 2800 行。
5. **`permission/role` 角色权限** — A 级：权限树 `check-strictly` 无父子联动 + 无工具条 + 删除无守卫；勾父不带孩子，依赖后端语义（未确认）。
6. **`config/reward` 奖励配置** — A 级：62 行「菜单权限」树面板为**不可达死代码**（mock 数据，`isShow` 恒 false），且提交失败即关弹窗。
7. **`notice/sysNotice` 公告** — A 级：统计卡仅统计**当前页**（`dataList.length`），后端 `total` 被弃用，误导运营判断。
8. **`daily-image/manage` 每日图** — A 级：搜索框为**前端 filter 当前页**（后端分页接口不支持 keyword），用户搜不到其他页数据被强误导。
9. **`welcome` 工作台** — A 级：1460 行单文件 overload，建议低风险渐进拆分为 6 个区块组件。
10. **`useCrudTable` 公共 composable** — A 级（跨页）：删除失败**静默无提示**，被 6 个页面共用，一处修复全局受益。

---

## 二、完整页面功能档案（Top 10 重点页）

> 格式：目的 / 用户 / 核心任务 / 结构 / 初始化 / 数据 / 查询 / 展示 / 操作 / 操作逻辑 / 权限隐藏 / 状态 / 关联 / 任务流 / 体验问题 / 技术问题 / 优化 / 方案 / 代码改动 / 优先级。

### 2.1 `config/user` 奖励用户【S】

1. **目的**：管理 C 端「奖励用户」主数据（昵称/手机/生日/头像/状态/密码）。落 `/api/reward-users/*`。
2. **用户**：运营/客服（`config:user:*`）。
3. **核心任务**：查询 → 启停 → 编辑 → 重置密码 → 删除。
4. **结构**：内联搜索(85-131) + PureTableBar(137-257) + 操作列（修改/删除/`el-dropdown`：上传头像、重置密码、分配角色）。
5. **初始化**：`onMounted→onSearch()`；另 `useTreePanel.onMounted→mockLoadTreeData()`（**无谓请求**，页面无树 DOM）；`onMounted` 注册 `useResizeObserver` 算 `treeHeight`（**死逻辑**，模板未使用）。
6. **数据**：`getRewardUserPage/addRewardUser/updateRewardUser/deleteRewardUser/resetPwdRewardUser`；角色回填 `getRoleIds`；菜单树 **mock**。
7. **查询**：`nickName`(input) / `birthday`(**el-input 纯文本，应为日期控件**) / `status`(select 字符串 `"1"`，与开关 number 混用)。无回车搜索。
8. **展示**：9 列；`birthday/dayjs().format()` **无空值保护** → 空值显示 `Invalid Date`；状态 `el-switch` number。
9. **操作**：搜索/重置/新增/修改/删除/启停/上传头像/重置密码/分配角色/`handleUpdate`(空函数)。
10. **操作逻辑**：

- 新增：`openDialog()→form.vue`（仅 3 字段）→ `addRewardUser`；**缺陷**：`chores()` 放在 `.finally`（`hook.tsx:233-249`）→ **接口失败仍弹绿色"成功"并关窗、刷新**，用户误判已保存。
- 重置密码：`hook.tsx:278-358`，**无 v-perms 守卫**；`curScore` 声明但**从未赋值** → 强度条永灭。
- 上传头像：`onCropper` 采集后 `beforeSure: done=>{done();onSearch()}`（`hook.tsx:257-275`）→ **无任何保存 API，头像不变且无提示（假实现）**；`avatarInfo` 永不被读取。
- 分配角色：`roleOptions` **恒为 `[]`**（未引入角色列表接口），`beforeSure: done=>{done()}` **无保存 API（假实现）**。
- 删除：popconfirm，但 `useCrudTable.ts:70-77` **失败静默**。
- 启停：`ElMessageBox` 二次确认 ✓，失败时**不回滚、无提示**（UI 显示已启用实际未生效）。

11. **权限隐藏**：新增/修改/删除有 `v-perms`；**上传头像/重置密码/分配角色/启停开关 4 处无守卫**（覆盖率 3/6+0/1）。
12. **状态**：`loading/avatarInfo(永不读)/isShow(恒false)/curRow(恒undefined)`。
13. **关联**：`permission/user`（同名割裂，见 §3）、`permission/role`（未打通）。
14. **任务流**：查（生日手输）→ 启停/编辑可用 → 头像/角色流程中断静默失败 → 重置密码可用但无反馈。
15. **体验问题**：失败提示成功、密码强度条永灭、头像/角色点了没反应、删除失败无提示、可连点。
16. **技术问题**：编辑 `password:""` 随包提交（`hook.tsx:132`+`rbac.ts:181`）可能清空密码；`useTreePanel` 死码；`treeHeight`+ResizeObserver 死逻辑；`formInline:null` 脆弱写法（5 页同病）；`status` string/number 混用；`dayjs` 三处无保护；文件带 BOM。
17. **优化**：抽 `submitDialog`（成功才关+`sureBtnLoading`）；补 3 个下拉 `v-perms`；头像/角色二选一接后端或下线；移除死码；生日改日期控件。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-1/B-2。
19. **代码改动**：`hook.tsx:233-250`(假成功) / `:213`(补 loading) / `:269-271`(头像提交) / `:41,361-382`(角色) / `:97`(强度) / `:196-204`(启停回滚) / `:68-86`(去树) / `index.vue:216,228,240`(补 v-perms) / `:43-47,71-80`(去死码) / `:99-106`(生日控件) / `:114-115`(:value="1") / `rule.ts:17-18`(phone 必填+birthday trigger) / `useCrudTable.ts:70-77`(失败提示)。
20. **优先级**：**S**。

### 2.2 `love/media` 媒体库【S】

1. **目的**：画廊浏览全部媒体 + 批量上传/单删。落 `/api/statistics/memory-gallery`（语义错位：统计接口）。
2. **用户**：App 用户/运营（`love:media:*`）。
3. **核心任务**：浏览 → 预览 → 上传 → 删除。
4. **结构**：单文件 260 行，无 hook/form/rule；`PureTableBar :columns="[]"`（借壳不用表）+ 自绘 `media-grid` + 独立 `el-pagination`。
5. **初始化**：`onMounted→onSearch()`；无 hook。
6. **数据**：`getMemoryGallery/uploadMedia/deleteMedia/` URL 拼接。**无视频分支**，但 `accept="image/*,video/*"` 允许视频。
7. **查询**：**无搜索/筛选**。仅 current/size。
8. **展示**：卡片缩略图(仅自身预览列表，无法左右切换) / `fileName` 兜底 `媒体 #id` / `recordDate` 无格式化 / 空态 `el-empty` ✓。
9. **操作**：上传/刷新/删除/预览/分页。
10. **操作逻辑**：

- **删除（重点）**：`handleDelete(item)`(`index.vue:95-110`) → `ElMessageBox.confirm("是否确认删除该媒体文件？")`(**文案无文件名/ID**) → `deleteMedia(item.id)` → **失败无 else 分支静默**；`catch` 把网络异常当"cancelled"；**无 loading 防连点**；`v-perms` **0 处**。
- 上传：`handleFileChange`→`uploadMedia` 批量，**无类型/大小校验**（对照 records 有 10MB）；`uploadLoading` 防重 ✓。

11. **权限隐藏**：**全文件 `v-perms` = 0**（grep 确认）。上传/删除均裸奔。
12. **状态**：`loading/uploadLoading/dataList/pagination/current/size`（分散、分页双状态冗余）。
13. **关联**：`love/records`（强耦合，共享 `deleteMedia`；删图使记录图片失效，**无引用提示**）。
14. **任务流**：浏览(无筛选) → 预览(不可切) → 上传(无校验) → hover 删(无守卫、文案模糊、失败静默)。
15. **体验问题**：确认文案不具体、失败无反馈、预览不可切、视频不显示、上传无大小限制、删除 hover 显形触屏难触达。
16. **技术问题**：未遵循 CRUD 模式(260 行全内联)；`v-perms` 全缺；`catch` 混淆取消与异常；分页双状态；`PureTableBar :columns=[]` 滥用；列表用 statistics 接口；无视频分支。
17. **优化**：抽 `utils/hook.ts`；删除前提示"被 N 条记录引用"；多选批量删 + 类型/日期筛选。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §A-3。
19. **代码改动**：`index.vue:166-173`(补 `v-perms="'love:media:delete'"`) / `:121-128`(补 `upload`) / `:97-101`(确认文案) / `:103-109`(失败提示) / `:153`(预览全量) / `:73-93`(上传校验) / `:151`(视频分支) / `:29-37,178-188`(分页收敛) / 新增 `utils/hook.ts`。
20. **优先级**：**S**。

### 2.3 `love/records` 恋爱记录【S】

1. **目的**：管理恋爱记录（日期/文字/心情/地点/多图）。
2. **用户**：App 用户/运营（`love:records:*`）。
3. **核心任务**：按日期查 → 详情 → 新增/编辑(多图) → 删除。
4. **结构**：搜索(仅 1 字段) + 表格 + `DetailDialog`(detail.vue 246 行)。**未复用 `useCrudTable`**，分页/搜索/删除手写重复。
5. **初始化**：`onMounted→onSearch()`(`hook.tsx:170-172`)。
6. **数据**：`getLoveRecordPage/Detail/add/update/delete` + `uploadMedia/deleteMedia`。
7. **查询**：仅 `date`(el-date-picker type="date" ✓ 正确写法)；无心情/地点/内容筛选；单日精确无区间。
8. **展示**：8 列；`recordDate/mood/location/createdAt` 有空值保护 ✓（对照 config 域）；`mood` **列表英文码、详情中文**（同数据两种展示）；字段命名 `createdAt` 与 config 域 `createdTime` 割裂。
9. **操作**：搜索/重置/新增/详情/修改/删除；表单内图片上传/删除。
10. **操作逻辑**：

- **★日期控件非法**：`form.vue:144` `type="recordDate"`（合法枚举无此项，全项目 24 处仅此 1 处异常；同文件 index.vue:50 与姐妹页 anniversaries:47 均为 `type="date"`）→ 笔误（字段名误填 type），静默降级。
- **★必填校验失效**：`rule.ts:5` 键名 `date`，但 `form.vue:141` `prop="recordDate"` → **永远匹配不到，日期可空提交**（规则从搜索表单复制而来）。
- 提交：无 `sureBtnLoading`；`.finally` 关窗；`updateLoveRecord` 闭包忽略入参。
- **★图片删除不可撤销**：`form.vue:82-105` 编辑弹窗内删图→**立即调服务端删除**，点弹窗"取消"图片已永久删；上传同理即时产生孤儿媒体。
- 详情：失败时 `console.error`+`detail=null`→**弹窗空白无错误态**。
- 删除记录：popconfirm 含日期（同日多条无法区分）；`useCrudTable` 失败静默。

11. **权限隐藏**：新增/修改/删除有 `v-perms`；**表单内图片上传/删除无守卫**。
12. **状态**：`form.date/loading/dataList/pagination/detailVisible/currentDetailId/uploadLoading/mediaList`。
13. **关联**：`love/media`（共享删除，双向破坏无提示）；`detail.vue` 子组件。
14. **任务流**：选日期查 → 看详情 → 编辑(**日期异常→可空提交→删图不可撤销**) → 保存(失败即关)。
15. **体验问题**：日期控件异常、可空提交、删图不可撤销、心情列表英文、确认文案不唯一、详情失败空白、搜索仅单日。
16. **技术问题**：未复用 `useCrudTable`；`rule` 与 `form` prop 不对齐；`location/media` 引用共享污染列表；`_tableRef` 无用；`getLoveRecordByDate` 死接口。
17. **优化**：图片改"暂存+保存统一提交"；`moodMap` 提共享常量；日期搜索改区间；复用 `useCrudTable`。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-6。
19. **代码改动**：**`form.vue:144`(type→"date"，1 行)** / **`rule.ts:5`(键名→recordDate)** / `form.vue:82-105`(删图延迟) / `:60-79`(上传暂存) / `hook.tsx:123`(loading) / `:155-163`(成功才 done) / `:131,136`(深拷贝) / `:94-104`(删除提示) / `:49`(mood 中文) / `index.vue:127`(确认补 ID) / `detail.vue:79-83`(失败空态)。
20. **优先级**：**S**。

### 2.4 `monitor/ai-provider-health`【A】（geo/image 同构镜像）

1. **目的**：监控 AI 供应商健康（UP/WARN/DOWN/SUSPENDED）、检测流水、告警，支持探测/启停/查余额。
2. **用户**：运维/SRE（`monitor:*`）。
3. **核心任务**：看板扫异常 → 探测/启停/查余额 → 下钻流水/告警并解决。
4. **结构**：`index.vue`(hero+alert+tabs) + `provider-status.vue`(统计条+批量条+卡片网格) + `check-record.vue`/`alert-record.vue`(表格+抽屉)。
5. **初始化**：`provider-status.vue onMounted→onSearch()` 拉健康分页(size=100)+统计；流水/告警 Tab 各自 onMounted。
6. **数据**：`ai-provider-health.ts`：健康分页/统计/启停/批量/探测/解决告警。
7. **查询**：状态看板 chip 点击前端 `statusFilter`（非 API）；流水/告警有多字段筛选。
8. **展示**：卡片状态色带+圆点(DOWN 脉冲)；指标余额/配额；异常优先排序。
9. **操作**：探测/查余额/启停 switch/流水跳转/告警跳转/批量启用/批量禁用/批量查余额/解决告警/批量解决/导出。
10. **操作逻辑**：

- **批量启用/禁用（重点）**：`provider-status.vue:135-152`（仅选中时显），**无 v-perms 包裹**（grep 确认 monitor 下 `v-perms` 仅 `cache/index.vue` 3 处）；`runBatch→ElMessageBox.confirm`(**有二次确认\*)→`batchEnableProviders`→`clearSelection+onSearch`。失败 catch 提示。**误操作风险高\*\*：禁用即让 provider 退出 C 端 AI 路由。
- 批量查余额：`if(action!=="balance")` → **无二次确认**（一致性缺陷）。
- 单卡启停：`onToggleEnable→confirm→enable/disableProvider`→就地更新+`loadStats`。
- 解决告警：均有 confirm，**无 v-perms**。

11. **权限隐藏**：**本页及 geo/image provider-health、ai-call-record、logs、welcome 全域 `v-perms` = 0**；批量启停仅靠二次确认（非授权）。
12. **状态**：`loading/statusFilter/selectedProviders/batchWorking/statsOverview`。
13. **关联**：geo/image（镜像）；`monitor/welcome`（上下文）；ai-call-record（同域只读）。
14. **任务流**：看板发现 DOWN → 告警下钻 → 解决 → 回状态 Tab 探测/启用 → 批量修复。
15. **体验问题**：批量查余额无确认；无权限隔离；`size:100` 假分页（供应商多会超量）；批量后全量刷新丢滚动。
16. **技术问题**：卡片一次拉 100；统计与列表两次请求未合并；批量成功全量刷新。
17. **优化**：批量启停补 `v-perms`+后端鉴权；批量查余额加确认；抽参数化 `ProviderHealthBoard`（见下）；局部更新替代全量刷新。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §S-1/A-1。
19. **代码改动**：`provider-status.vue:135-161`(补 v-perms) / `useProviderStatus.tsx:245`(查余额确认) / `api/ai-provider-health.ts:54-77`(后端权限) / 三套合并为 `ProviderHealthBoard` 组件。
20. **优先级**：**A**。

> **geo/image provider-health 说明**：结构与 ai 同构（行数 api 203/196/209，provider-status 650/538/535，hooks ~293/296/312，同构度 >85%）。差异仅：主键维度(ai/image=`provider`，geo=`provider|poolName`)、第三项批操作(ai=查余额，geo/image=重置熔断)、卡片指标(ai 有余额/配额，image 有今日图片，geo 有池子)。**结论：三套镜像重复，建议抽参数化 `ProviderHealthBoard`**，入参 `{ apiAdaptor, keyBy, actions:{reset?,balance?}, metricSchema, reasonMap, showPool }`，**仅抽象"类型"一个维度，不把 check/alert-record 强塞进同一组件**（避免万能组件）。优先级 B。

### 2.5 `permission/role` 角色权限【A】

1. **目的**：维护角色 + 分配菜单权限树（RBAC 角色侧）。
2. **用户**：超管（`permission:role:*`）。
3. **核心任务**：新增/修改角色 → 勾选菜单权限树 → 删除。
4. **结构**：查询 + 表格 + 弹窗(form) + 分配权限弹窗(perm-form)。
5. **初始化**：`onSearch()`=`getRolePage`；`menuTree` 首次点"权限"才拉并缓存。
6. **数据**：`getRolePage/getMenuTree/getRoleDetail/addRole/updateRole/deleteRole/assignRoleMenus`。
7. **查询**：角色名/编码/状态；无回车搜索。
8. **展示**：编码/名称/状态/备注/创建时间/操作(220px)。
9. **操作**：新增/修改/权限/删除（均 `v-perms`）。
10. **操作逻辑**：

- **权限（重点）**：`openPerm→loadMenuTree+getRoleDetail(menuIds)→perm-form(el-tree)→beforeSure: checked=getCheckedKeys(), half=getHalfCheckedKeys()→assignRoleMenus({menuIds:[...checked,...half]})`。
- **★`check-strictly` 开启**(`perm-form.vue:45`)→ **父子不联动**，勾父不连带勾子；`getHalfCheckedKeys()` **恒返回 `[]`**（Element Plus 不维护半勾选）→ `half` 为冗余空数组，`menuIds`=用户显式勾选集合。**是否覆盖子节点取决于后端 `assign-menus` 语义【无法从当前代码确认】**（若后端按精确 id 授权，只勾父会导致子菜单全部不可见，高危隐性行为）。
- **★无工具条**：`perm-form.vue` 仅 `<el-tree>`，**无全选/反选/清空/过滤**（菜单多时勾选极繁琐）；`default-expand-all` 整树展开难定位。
- 删除：`el-popconfirm`→`deleteRole`，**无"是否超管/有用户绑定"守卫**（误删超管角色→全员失权）。

11. **权限隐藏**：全部 `v-perms`（无权限 DOM 移除）；`roleCode` 编辑 disabled。
12. **状态**：`loading/checkedKeys/menuTree`。
13. **关联**：role→menu（权限树即 menu 数据）；user（角色下拉）。无页面跳转。
14. **任务流**：进列表→点"权限"→等树+详情→勾选 N 次→保存→`assignRoleMenus`→toast。
15. **体验问题**：权限树无工具条、无父子联动、整树展开、保存后不刷新列表。
16. **技术问题**：`check-strictly` 下保存仅发显式勾选；删除无守卫；保存无二次确认。
17. **优化**：加工具条；与后端对齐 `check-strictly` 语义（保留则 UI 提示"勾父须单独勾子"，关闭则父带子）；删除守卫。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-3。
19. **代码改动**：`perm-form.vue:39-48`(树无工具条/check-strictly/默认展开) / `role/hook.tsx:189-195`(ID 组装) / `:225`(删除守卫) / `:83`(树缓存)。
20. **优先级**：**A**。

### 2.6 `config/reward` 奖励配置【A】

1. **目的**：维护奖励规则字典（rewardKey/类型/数值/JSON 条件/启停）。
2. **用户**：业务配置（`config:reward:*`）。
3. **核心任务**：查询 → 新增/修改 → 启停 → 导出。
4. **结构**：搜索(5 字段) + 表格 + **右侧「菜单权限」树面板(246-307)**。
5. **初始化**：`onSearch()` + `useTreePanel.onMounted→mockLoadTreeData()`（3 组 mock）+ ResizeObserver。
6. **数据**：`getRewardConfigList/.../exportRewardConfigList`（经 `@/api/system`）；菜单树 **mock**。
7. **查询**：rewardKey/rewardType(select 硬编码 BASE/EXTRA/SPECIAL，与 form 重复)/rewardValue(input 但表单是 input-number，类型不一致)/description(标签"说明"但表单叫"标签"，同字段两名称)/status(字符串 vs 开关 number)。
8. **展示**：10 列；`condition` 用 `ReJsonField` 紧凑渲染 ✓；时间 `dayjs` 无保护。
9. **操作**：搜索/重置/新增/修改/删除(popconfirm+v-perms)/启停/导出(v-perms+防重)。
10. **操作逻辑**：

- 新增/修改：校验 5 字段全必填；**仍在 `.finally` 关窗**（失败红色提示闪现但弹窗已关、数据丢失）；无 `sureBtnLoading`。
- 启停：有二次确认 ✓、取消回滚 ✓；成功后**不调 `onSearch`**（updatedTime 不刷新）；失败无提示；**开关无 v-perms**。
- **★菜单权限面板死代码**：`index.vue:247 v-if="isShow"`，而唯一调用点 `handleMenu(row?)` 无参时恒 `isShow=false`（`useTreePanel.ts:34-46`），**全项目无 `@row-click` 触发带参**→ `isShow` 永恒 false，62 行 UI + `handleSave` 等全不可达；且树数据是 mock、`getCheckedIds` 恒 `[]`、保存只弹假成功。**「奖励配置」页放「菜单权限」树本身概念错位**（属 permission/role）。

11. **权限隐藏**：按钮 4/4 守卫；开关/树面板保存无守卫（树不可达）。
12. **状态**：`isShow(恒false)/curRow(恒空)/treeData(mock)`。
13. **关联**：config/user/mail/subject（共享 composables）；permission/role（树正确归属）。
14. **任务流**：搜索→新增(校验完整)→启停→导出。主流程可用。
15. **体验问题**：失败弹窗即关数据丢失；说明/标签同名；启停后时间不刷。
16. **技术问题**：62 行不可达 UI + mock 依赖（最大技术债）；类型两处硬编码；`status` 混用；`formInline:null` 脆弱；BOM。
17. **优化**：删树面板+`useTreePanel`+死码；类型抽常量；提交改"成功才关+loading"；启停成功局部更新。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §A-2。
19. **代码改动**：`index.vue:246-307`(删树面板) / `:26-41,43-47,79-88`(删配套死码) / `hook.tsx:54-72,219-234`(去树) / `:199-212`(成功才 done+loading) / `:162-169`(启停提示) / `index.vue:142-143`(:value="1") / `useTableExport.ts:23-24`(revokeObjectURL 延迟)。
20. **优先级**：**A**。

### 2.7 `notice/sysNotice` 公告【A】

1. **目的**：统一公告发布/撤回/平台可见性/展示周期管理。
2. **用户**：运营（`notice:sysNotice:*`）。
3. **核心任务**：列表查询 → 新增/编辑 → 发布/撤回 → 删除。
4. **结构**：Hero(4 统计卡) + 搜索(5 字段，走后端) + 表格(发布/撤回按 status 显隐) + form 弹窗。
5. **初始化**：`useCrudTable→onSearch()`（默认 size:10）。
6. **数据**：`getSysNoticePage/delete/add/update/publish/withdraw`。
7. **查询**：keyword/类型/优先级/平台/status **均下后端**（区别于 daily-image）；分页走后端。
8. **展示**：列含内容/优先级/平台/状态/周期/操作人。
9. **操作**：新增/编辑/发布(confirm)/撤回(confirm)/删除(popconfirm)/搜索/重置，均 `v-perms`；发布撤回按 `row.status` 显隐。
10. **操作逻辑**：

- **★统计卡仅当前页**：`hook.tsx:149` `total: dataList.value.length`，`dataList.value.reduce(...)` 遍历**当前页**累加 published/draft/urgent；后端返回 `pagination.total` **被弃用**。首卡标"当前页公告"但其余三卡无标注 → 翻页/筛选后数字突变误导。
- 发布/撤回：`ElMessageBox.confirm`→`publish/withdrawSysNotice`→`onSearch`。失败 `catch` 静默（非 cancel）。

11. **权限隐藏**：按钮级 `v-perms` 齐全。
12. **状态**：index(417)+hook(414)+form(248) **已合理拆分**，无 overload。
13. **关联**：form 弹窗；前端通知中心（不在此页）。
14. **任务流**：进页(看卡)→筛选→新增/编辑→发布/撤回→删过期。
15. **体验问题**：统计卡随翻页剧烈变化，无全局总数参照。
16. **技术问题**：**数据口径错误**（当前页做统计，弃用后端 total）。
17. **优化**：统计卡改后端口径（用 `total` 或新增 `/stats`）；保留前端统计则四卡统一标"本页"并另显"全部 N"。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-4。
19. **代码改动**：`hook.tsx:147-167`(统计计算) / `index.vue:50-66`(卡片标签)。
20. **优先级**：**A**。

### 2.8 `daily-image/manage` 每日图【A】

1. **目的**：每日图片网格管理（浏览/上传/下载/删除/备注/预览）。
2. **用户**：运营（`dailyImage:manage:*`）。
3. **核心任务**：网格浏览 + 多选批量 + 上传 + 详情备注。
4. **结构**：工具栏(搜索/来源/密度/刷新/上传) + 浮动批量条 + 网格(骨架/空态/卡片) + 分页 + 详情抽屉 + 上传弹框 + 后台上传浮层。
5. **初始化**：`onMounted` 注册键盘 + `onSearch()`（size:30）；骨架 12 张。
6. **数据**：`getDailyImagePage/Detail/upload/delete/batchDelete/batchDownload/getBatchDownloadLinks/updateRemark` + URL helper。
7. **查询（★重点）**：
   - `hook.tsx:53` 注释明示"后端分页接口暂不支持 keyword，仅筛选当前页"。
   - `filteredList`(`64-72`) 对 **当前页 `dataList`** 做 `.filter`（keyword 不入参）。
   - `onSearch`(`75-96`) `getDailyImagePage(toRaw(form))`，`form` 仅 `{source,current,size}`，**不含 keyword**。
   - **对比**：来源筛选 `handleSourceChange`(`98-101`) 改 `form.source` 走后端 → 同页"来源=后端、关键词=前端"口径不一致。
   - UI 已诚实提示"搜索仅当前页"，但交互本质仍是缺陷（搜不到其他页数据强误导）。
8. **展示**：网格渲染 `filteredList`；来源标签；详情 `detailRows` 动态渲染。
9. **操作**：搜索/来源/密度/刷新/上传(拖拽多选，后台队列)/批量下载(zip/逐个)/批量删除/单张下载删/详情/全屏预览/备注保存/勾选(Shift/Ctrl+A)。
10. **操作逻辑**：搜索=纯前端 filter；上传=串行队列+进度浮层；批量删=`confirm`→`batchDelete`→`clearSelection+onSearch`；备注=`updateRemark` 同步三处。防误：删除均 confirm；批量前置 `hasSelection` 校验。
11. **权限隐藏**：`v-perms` 包裹 upload/export/delete。
12. **状态**：index(1299)+hook(688) 已分离，hook 按"列表/选中/抽屉/预览/备注/上传/删除/下载"清晰分区。
13. **关联**：`ReImageViewer`、上传下载 API。
14. **任务流**：进页→搜索/筛选→批量下载删→或详情改备注→上传新图。
15. **体验问题**：搜索"仅当前页"强误导（即使文案提示，本质缺陷）。
16. **技术问题**：keyword 前端过滤；后端 `/api/daily-images/page` 接受 `params` 但未接 keyword。
17. **优化**：后端 page 增 keyword；前端 keyword 并入 form 走后端（与来源一致）；过渡期前端过滤仅作"本页高亮"。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-4。
19. **代码改动**：`hook.tsx:47-51`(form 增 keyword) / `:53,64-72`(filteredList 改高亮或移除) / `:75-96`(onSearch 带 keyword) / `index.vue:207,333,338`(提示文案)。
20. **优先级**：**A**。

### 2.9 `welcome` 工作台【A】

1. **目的**：运营/管理员首页大盘，聚合健康/指标/待办/趋势/动态。
2. **用户**：登录用户。
3. **核心任务**：一眼掌握系统状态 + 快速跳对应模块。
4. **结构（逐区块）**：topbar(373-408) / health-strip(410-462) / action-panel(465-512) / metrics-panel(514-553) / tool-section(556-580) / trend-panel(583-609, ECharts) / activity-panel(611-647)。
5. **初始化**：`onMounted→loadWorkbench()` → `Promise.allSettled` **并发 5 请求**(319-325)；**无全页骨架屏**，逐区块 `v-loading`。
6. **数据**：`@/api/workbench` 5 接口。
7. **查询**：趋势范围 7d/30d 切换仅重跑 `loadTrend`（局部刷新）。
8. **展示**：指标卡(值+delta+trend)；健康灯按 down>warn>up 排序；待办按 danger>warning 排序；ECharts 柱状+折线(奖励发放/AI调用/任务执行)。
9. **操作**：刷新(防重)/趋势切换/各区块重试/卡片灯待办动态点击跳转(`navigateTo`)/首次失败重新加载。
10. **操作逻辑**：刷新=`loadWorkbench(true)` 5 并发 + 成功提示 + `refreshing` 防重；跳转仅当 `path` 存在才可点；趋势 `trendRequestId` 防竞态。
11. **权限隐藏**：页面级无（仪表盘对登录用户开放），目标页自控。
12. **状态**：**1460 行单文件**（script 1-357 / template 359-650 / style 652-1460，style 占 ~808 行）；无子组件；逻辑按 computed 分区清晰。
13. **关联**：`navigateTo` 跳各业务模块页。
14. **任务流**：看状态药丸→看需关注灯→处理待办→看指标/趋势→点卡跳详情。
15. **体验问题**：无全页骨架屏（补丁式出现）；趋势空数据占 350px 空白；单文件过大。
16. **技术问题**：**职责过载**（7 区块 + ECharts 管理 + MutationObserver + resize 全在一个文件），但逻辑分区清晰、稳定可运行。
17. **优化**：**渐进拆分** 6 个区块组件 + `useTrendChart`，index 仅编排，不动 API 契约（稳定优先、低风险）。
18. **方案**：见 `reward-admin-UX-DESIGN.md` §B-7。
19. **代码改动**：`welcome/index.vue:1-357`(拆 composable) / `:359-650`(拆 6 组件) / 新增 `components/workbench/*`。
20. **优先级**：**A**。

### 2.10 `useCrudTable` 公共 composable【A，跨页】

- **作用**：被 config/mail、pocket-money、reward、subject、user + notice/sysNotice 共 6 页复用，封装列表/分页/删除骨架（良性抽象）。
- **★缺陷**：删除失败**静默无提示**（`useCrudTable.ts:70-77` 仅 `code===200` 分支 `message`，`.finally` 仍 `onSearch()`）→ 6 页删除失败表现为"列表没变化、无提示"。
- **优化**：`code!==200` 分支补 `message(result.msg,{type:"error"})`，且失败不强制 `onSearch`（或仍刷新但给提示）。一处修复，6 页受益。
- **优先级**：**A**。

---

## 三、其余页面（condensed 档案）

### 3.1 `permission/user` 系统用户【B】

- 结构清、有详情预加载/`sureBtnLoading`/失败保留弹窗/删除有危险色——是质量标杆。
- 问题：无回车搜索；查询失败无错误横幅；**重置密码无 `popconfirm` 二次确认**（高危仅靠 Dialog 确定）；手机号明文无脱敏；`avatar` 字段死字段；删除无"是否本人/超管"守卫；`getRoleAll` 每次 onSearch 重拉未缓存。
- 关键：`user/utils/hook.tsx:132` 编辑时 `password:""` 随包提交（与 config/user 同源隐患）；`permission/user/index.vue:134` 重置密码有 `v-perms`（对照 config/user 无，割裂）。
- 代码改动：`index.vue:34`(回车) / `hook.tsx:100-104`(失败提示) / `:228`(重置密码确认) / `:132`(编辑不传密码)。

### 3.2 `permission/menu` 菜单管理【B】

- 无查询区（树全量）；图标列仅文本未渲染；行内无"加子菜单"；`menuType` 切按钮时旧字段未清空。
- **删除/编辑守卫缺失**：编辑父菜单下拉含自身（`form.vue:56-67` + `hook.tsx:119`）**无环校验**→可自挂造成树环/悬挂；删除无"是否有子/被角色引用"守卫。
- 代码改动：`form.vue:56-67`(排除自身子树) / `hook.tsx:174`(删除守卫) / `index.vue:62`(行内加子菜单)。

### 3.3 `monitor/ai-call-record`【C，XSS 已合规】

- 纯只读。详情 `detail.vue:32-37` `new MarkdownIt({html:false,...})` → 原始 HTML 已禁，**XSS 已缓解**；`v-html` 仅渲染 `renderMarkdown` 结果；链接 `noopener` ✓；JSON 走 `ReJsonField`。
- 体验：无显式 `el-empty`（依赖纯表默认空行）；`bizType` 为**明文 input**（应下拉/枚举 Tab），`status` select 可 `allow-create` 手填；API 来自 `@/api/system` 而非专属文件（归属不一致）。
- 代码改动：`index.vue:53-60`(bizType 改下拉) / 补 `el-empty` / API 下沉专属文件。

### 3.4 `config/pocket-money` 零花钱【C，本域最健康】

- 结构最干净（无树/无 mock/无 ResizeObserver）；**唯一正确传 props**（`contentRenderer` 显式传 `formInlineData` 非 null）；`ruleKey` 自动转大写（前后端双保险）；编辑锁 key；成功后 `fetchOptions` 刷新下拉。
- 问题：表格 `ruleType` 显示英文码未映射中文 label；`fetchOptions` 无 try/catch（未捕获 rejection）；`handleSelectionChange` 空实现；权限码 camelCase `config:pocketMoney:*` 与全局全小写风格不一致。
- 代码改动：`hook.tsx:51`(formatter) / `:71-75`(try/catch) / `:85-121`(loading+成功才 done) / 权限码风格统一。

### 3.5 `love/anniversaries` 纪念日【B】

- **无搜索、无分页**（列表接口无分页参数，全量拉）→ 数据多时不可用。
- **★`repeatType` 大小写错配**：`hook.tsx:41,117` 默认 `"yearly"`(小写)，但 `form.vue:72-75` 选项 value `"YEARLY"`(大写) + `form.vue:12` 默认 `"YEARLY"` → 新增时下拉空白、提交小写枚举；`anniversaryType` 兜底值矛盾(`"DATE"` vs `"OTHER"`)。
- 类型/重复列英文码未映射；`status` 在 types 有但表单无控件（编辑透传原值无法改）；删除失败静默。
- 代码改动：`hook.tsx:41,117`("YEARLY") / `:40`("DATE") / `:61-62`(中文 formatter) / `index.vue:24`(补搜索+分页)。

### 3.6 `login` 登录【C】

- 标准登录 + `immediateDebounce` 防重 + `disabled/loading` 双闸；密码正则 8-18 两类组合。
- **安全加固**：默认硬编码 `username:"admin",password:"admin123"`（`login/index.vue:46-49`），建议按 dev 标志注入；无验证码/防爆破（视业务规范）。
- 代码改动：`index.vue:46-49`(默认凭据) / 按需加验证码。

### 3.7 `monitor/cache-monitor` 缓存【B】

- **全量 `import * as echarts`(`hook.tsx:13`)** 抵消 `plugins/echarts.ts` 按需引入 → 包体膨胀。改按需即可（低成本）。
- 与上轮审计 F21 一致，优先级 B（性能/依赖）。

---

## 四、问题 → 代码 完整溯源（用户问题 → 页面 → 操作 → 组件 → 方法 → API → 位置）

| 用户问题                             | 页面                               | 操作      | 代码位置                                                | 本质                         |
| ------------------------------------ | ---------------------------------- | --------- | ------------------------------------------------------- | ---------------------------- |
| 删 C 端用户后无反馈、误以为成功      | `config/user`                      | 删除/新增 | `useCrudTable.ts:70-77` + `hook.tsx:233-249`            | 失败静默 + `.finally` 假成功 |
| 任意进页面者能重置 C 端用户密码      | `config/user`                      | 重置密码  | `index.vue:228`(无 v-perms)                             | 权限缺守卫                   |
| 点了"上传头像/分配角色"没反应        | `config/user`                      | 头像/角色 | `hook.tsx:257-275,361-382`                              | 假实现(无保存 API)           |
| 编辑用户后密码可能被清空             | `config/user`                      | 编辑      | `hook.tsx:132`+`rbac.ts:181`                            | 空密码随包提交               |
| 媒体库任意人可删任意文件且删了没提示 | `love/media`                       | 删除/上传 | `index.vue:166,121`(无 v-perms) + `:102-109`(静默)      | 权限缺守卫 + 失败静默        |
| 删图后记录图片失效无提示             | `love/media`↔`love/records`        | 删图      | `api/love.ts:92`(共享 deleteMedia)                      | 跨页强耦合无联动             |
| 纪念日日期控件异常、可空提交         | `love/records`                     | 新增/编辑 | `form.vue:144`(type 非法) + `rule.ts:5`(键名错)         | 控件笔误 + 校验键名错配      |
| 编辑记录时删图不可撤销               | `love/records`                     | 表单删图  | `form.vue:82-105`                                       | 弹窗内即时真删               |
| 误点批量启停中断 C 端 AI             | `monitor/*-provider-health`        | 批量启停  | `provider-status.vue:135-152`(无 v-perms)               | 权限缺守卫                   |
| 勾父菜单子菜单不生效                 | `permission/role`                  | 分配权限  | `perm-form.vue:45`(check-strictly) + `hook.tsx:189-195` | 无父子联动 + 仅发显式勾选    |
| 奖励配置页有一块树面板永远打不开     | `config/reward`                    | 菜单权限  | `index.vue:246-307`+`useTreePanel.ts:34-46`             | 不可达死代码(mock)           |
| 公告统计数翻页就变                   | `notice/sysNotice`                 | 看统计卡  | `hook.tsx:149`(dataList.length)                         | 当前页统计弃用 total         |
| 搜图搜不到其他页                     | `daily-image/manage`               | 搜索      | `hook.tsx:53,64-72`(前端 filter)                        | 后端未接 keyword             |
| 大盘首屏一块块蹦出来                 | `welcome`                          | 进入      | `index.vue:319-325`(无骨架屏) + 1460 行单文件           | 缺骨架屏 + 职责过载          |
| 6 页删除失败都没提示                 | 6 页                               | 删除      | `useCrudTable.ts:70-77`                                 | 公共 composable 缺陷         |
| 两个"用户"页易误操作                 | `config/user` vs `permission/user` | 全局      | 同名 + 质量代差                                         | 命名割裂                     |

---

## 五、无法从当前代码确认的事项（如实标注）

1. Element Plus 对非法 `type="recordDate"` 的**具体渲染降级形态**（面板是否仍渲染、显示文本）—— `node_modules` 未安装，需运行时验证。
2. 侧边栏**菜单标题**是否同名 —— 路由由后端 `getAsyncRoutes()` 下发（本地 `src/router/modules` 仅 error/home/remaining），前端无本地菜单配置。
3. 后端是否已定义 `love:media:*`、`monitor:*:*` 等权限码 —— 前端零消费，无法反推；**前端 `v-perms` 仅 DOM 移除（`directives/perms/index.ts:8`），不能作唯一防线，必须后端接口鉴权兜底**。
4. `assignRoleMenus` 是否按"父含子"展开 —— 决定 `check-strictly` 下的实际授权结果。
5. 后端接口层是否对各写操作独立鉴权 —— 前端不可见。

---

## 六、结论

- 本轮在 18 个核心页面完成**逐页逆向**，全部带文件:行号证据，未修改任何文件。
- **S 级（用户/数据可信度/安全）**：`config/user`（假成功+假实现+缺守卫）、`love/media`（无守卫不可逆删除）、`love/records`（日期双缺陷+删图不可撤销）。
- **A 级（架构/功能正确性）**：三套 provider-health 权限+镜像、role 权限树、reward 死代码、notice/daily-image 统计与搜索口径、welcome 巨型页、useCrudTable 静默删除。
- 已确认前轮"XSS"实为**已缓解**（`html:false`），本轮不再视为漏洞。
- 下阶段进入**代码实现**时，建议严格按「稳定优先、第一阶段低风险高收益」落地：先补守卫（`v-perms` + 后端鉴权）、修日期 BUG（1 行）、清理假实现与死代码、修正统计/搜索口径、统一提交模式（抽 `useFormDialog` + `sureBtnLoading`），最后再对 welcome/provider-health 做局部重构。

> 全部结论基于实际 Read/Grep，未修改任何文件。
