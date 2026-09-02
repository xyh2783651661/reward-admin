# 图片管理详情页信息展示方案设计

> 项目：`reward-admin`（前端 Vue 3 + Element Plus）
> 模块：每日图片管理 `src/views/daily-image/manage`
> 关联后端：`we-chat` 的 `wechat-content` 模块（`DailyImageController` / `DailyImage` 实体）
> 性质：**只读取证 + 方案设计，未修改任何代码**。所有字段均以源码为据。

---

## 一、背景与目标

图片管理页当前采用「网格列表 + 右侧详情抽屉」的交互：点击卡片在 420px 抽屉中查看缩略图、少量元信息与备注。随着后端 `DailyImage` 实体字段的持续扩展（版权署名、图片技术参数、采集元数据、AI 视觉描述等），详情抽屉的信息完整度已严重滞后。

本方案目标：

1. 厘清「当前展示了什么」与「接口实际返回了什么」之间的差距；
2. 设计一套信息分组清晰、字段有优先级、布局与交互合理的详情展示方案；
3. 输出为可直接评审与开发实施的文档，并附前置缺陷修复清单。

---

## 二、现状分析（取证）

### 2.1 当前展示逻辑

详情抽屉的信息由 `src/views/daily-image/manage/index.vue` 中的 `detailFieldLabels` 配置驱动，逐字段判断「存在才渲染」：

```ts
const detailFieldLabels: Array<{ key: string; label: string }> = [
  { key: "id", label: "ID" },
  { key: "originalName", label: "文件名" },
  { key: "storedName", label: "存储名" },
  { key: "extension", label: "格式" },
  { key: "fileSize", label: "大小" },
  { key: "source", label: "来源" },
  { key: "createTime", label: "创建时间" },
  { key: "updateTime", label: "更新时间" }
];
```

另有一个独立的「备注」区块（`remarkDraft` + 保存按钮），以及「下载原图 / 删除」操作区。

### 2.2 关键缺陷：字段名与后端不一致

后端 `DailyImageController#detail` 直接返回实体 `DailyImage`（继承 `BaseEntity`），字段名为驼峰。对比前端配置，存在 **3 处命名不匹配**，导致这些字段**永远无法显示**：

| 前端配置 key | 后端真实字段  | 结果             |
| ------------ | ------------- | ---------------- |
| `storedName` | `storageName` | 不匹配，永久隐藏 |
| `createTime` | `createdTime` | 不匹配，永久隐藏 |
| `updateTime` | `updatedTime` | 不匹配，永久隐藏 |

因此，前端详情「图片信息」区**实际能正常渲染的仅 5 个字段**：`id`、`originalName`、`extension`、`fileSize`、`source`（另加备注区 1 个，共 6 个）。

### 2.3 其他一致性问题

- **来源映射不全**：后端 `source` 有 6 种取值（`unsplash / pexels / pixabay / local / upload / sync`），前端 `getSourceLabel` / `getSourceType` 仅映射 `unsplash / local / upload` 三种，其余回退为原文 + 默认色。
- **类型定义缺失**：`getDailyImageDetail` 返回 `Record<string, any>`，`DailyImageItem` 仅声明少量字段，字段名错误无法被类型系统发现。

---

## 三、接口字段全景（37 字段）

`GET /api/daily-images/{id}` 返回 `Result<DailyImage>`，其中 `DailyImage extends BaseEntity`，序列化后共 **37 个字段**：

| #   | 字段                  | 类型          | 来源       | 说明                                        |
| --- | --------------------- | ------------- | ---------- | ------------------------------------------- |
| 1   | `id`                  | long          | BaseEntity | 主键                                        |
| 2   | `createdBy`           | long          | BaseEntity | 创建人 ID                                   |
| 3   | `updatedBy`           | long          | BaseEntity | 更新人 ID                                   |
| 4   | `createdTime`         | LocalDateTime | BaseEntity | 创建时间                                    |
| 5   | `updatedTime`         | LocalDateTime | BaseEntity | 更新时间                                    |
| 6   | `deleted`             | int           | BaseEntity | 0 正常 / 1 删除（详情已过滤）               |
| 7   | `originalName`        | string        | DailyImage | 原始文件名                                  |
| 8   | `storageName`         | string        | DailyImage | 存储文件名                                  |
| 9   | `storagePath`         | string        | DailyImage | 原图绝对路径                                |
| 10  | `thumbnailPath`       | string        | DailyImage | 缩略图路径（可空）                          |
| 11  | `fileSize`            | long          | DailyImage | 字节                                        |
| 12  | `extension`           | string        | DailyImage | 扩展名                                      |
| 13  | `source`              | string        | DailyImage | `unsplash/pexels/pixabay/local/upload/sync` |
| 14  | `sourceUrl`           | string        | DailyImage | 原始下载 URL                                |
| 15  | `sourceId`            | string        | DailyImage | 来源侧图片 ID                               |
| 16  | `sourcePageUrl`       | string        | DailyImage | 来源详情页（版权署名）                      |
| 17  | `authorName`          | string        | DailyImage | 作者署名                                    |
| 18  | `authorUrl`           | string        | DailyImage | 作者主页                                    |
| 19  | `license`             | string        | DailyImage | 授权类型                                    |
| 20  | `width`               | int           | DailyImage | 宽（像素）                                  |
| 21  | `height`              | int           | DailyImage | 高（像素）                                  |
| 22  | `mimeType`            | string        | DailyImage | 真实 MIME                                   |
| 23  | `fileHash`            | string        | DailyImage | 文件 MD5                                    |
| 24  | `orientation`         | string        | DailyImage | `landscape/portrait/square`                 |
| 25  | `dominantColor`       | string        | DailyImage | 主色调 hex                                  |
| 26  | `downloadedTime`      | LocalDateTime | DailyImage | 远程下载完成时间                            |
| 27  | `downloadCostMs`      | int           | DailyImage | 下载耗时（毫秒）                            |
| 28  | `batchId`             | string        | DailyImage | 采集批次 ID                                 |
| 29  | `imageDate`           | LocalDate     | DailyImage | 业务日期                                    |
| 30  | `theme`               | string        | DailyImage | 当日主题词                                  |
| 31  | `queryKeyword`        | string        | DailyImage | 采集搜索词                                  |
| 32  | `extraJson`           | Map           | DailyImage | 扩展信息（EXIF/provider/描述）              |
| 33  | `remark`              | string        | DailyImage | 备注（手动编辑）                            |
| 34  | `visionDescriptions`  | Map           | DailyImage | 视觉模型多语言描述                          |
| 35  | `visionStatus`        | byte          | DailyImage | 0 未生成 / 1 已生成 / 2 失败                |
| 36  | `visionGeneratedTime` | LocalDateTime | DailyImage | 视觉描述首次生成时间                        |
| 37  | `status`              | byte          | DailyImage | 0 删除 / 1 正常（详情已过滤）               |

> 注：`visionDescriptions` 结构为 `{"en":"…","zh":"…","template":"…","model":"…","cost_ms":123,"errors":[…]}`；`extraJson` 结构含 `description` 及 provider 附加字段（见 `DailyImageDownloadTask#buildExtraJson`）。

---

## 四、字段对比结论

| 类别       | 字段                                                              | 说明                                   |
| ---------- | ----------------------------------------------------------------- | -------------------------------------- |
| 已正常展示 | `id`、`originalName`、`extension`、`fileSize`、`source`、`remark` | 6 个                                   |
| 配置但失效 | `storageName`、`createdTime`、`updatedTime`                       | 3 个（命名 bug）                       |
| 完全未展示 | 其余 28 个                                                        | 含版权、技术参数、采集元数据、视觉描述 |

**可补充展示的高价值字段**集中在四类：版权署名（`authorName/license/sourcePageUrl` 等）、图片技术参数（`width/height/orientation/dominantColor/fileHash/mimeType`）、采集元数据（`imageDate/theme/queryKeyword/batchId/downloadCostMs`）、AI 视觉描述（`visionDescriptions/visionStatus`）。

---

## 五、信息展示方案设计

### 5.1 信息分组（6 组）

| 组  | 组名       | 定位                 | 默认状态                    |
| --- | ---------- | -------------------- | --------------------------- |
| A   | 基本信息   | 快速识别图片身份     | 展开                        |
| B   | 图片属性   | 技术参数             | 展开                        |
| C   | 版权与来源 | 第三方图库的署名义务 | 展开（`source` 为第三方时） |
| D   | 视觉描述   | AI 生成的多语言描述  | 展开（已生成时）            |
| E   | 采集信息   | 下载任务/批次排查    | 折叠                        |
| F   | 存储与审计 | 运维排查             | 折叠                        |

### 5.2 字段优先级

- **P0 必显**：始终展示，构成详情页核心信息。
- **P1 重要**：默认展示，空间受限时可折叠。
- **P2 次要**：折叠展示，需要时展开（多为运维排查）。

### 5.3 字段分配总表

| 字段                            | 中文名        | 分组 | 优先级 | 展示形式                         |
| ------------------------------- | ------------- | ---- | ------ | -------------------------------- |
| `id`                            | ID            | A    | P0     | 文本                             |
| `originalName`                  | 文件名        | A    | P0     | 文本（超长省略 + title）         |
| `extension`                     | 格式          | A    | P0     | 大写标签                         |
| `fileSize`                      | 大小          | A    | P0     | 格式化（KB/MB）                  |
| `source`                        | 来源          | A    | P0     | 标签（6 种全映射）               |
| `remark`                        | 备注          | A    | P0     | textarea 可编辑（沿用）          |
| `width` / `height`              | 尺寸          | B    | P0     | 合并「1920 × 1080」              |
| `orientation`                   | 方向          | B    | P1     | 标签（横向/竖向/方形）           |
| `mimeType`                      | MIME          | B    | P1     | 文本                             |
| `dominantColor`                 | 主色调        | B    | P1     | 色块 + hex                       |
| `fileHash`                      | MD5           | B    | P2     | 文本 + 复制                      |
| `storageName`                   | 存储名        | B    | P2     | 文本                             |
| `authorName`                    | 作者          | C    | P0     | 文本，可点击跳 `authorUrl`       |
| `license`                       | 授权          | C    | P1     | 标签                             |
| `sourcePageUrl`                 | 来源页        | C    | P1     | 「查看来源页」外链               |
| `sourceId`                      | 来源 ID       | C    | P2     | 文本                             |
| `sourceUrl`                     | 原始 URL      | C    | P2     | 外链                             |
| `visionStatus`                  | 视觉状态      | D    | P1     | 状态标签（未生成/已生成/失败）   |
| `visionDescriptions`            | 多语言描述    | D    | P1     | 分语言卡片列表 + 元数据          |
| `visionGeneratedTime`           | 生成时间      | D    | P2     | 时间                             |
| `imageDate`                     | 业务日期      | E    | P1     | 日期                             |
| `theme`                         | 主题词        | E    | P1     | 标签                             |
| `queryKeyword`                  | 搜索词        | E    | P2     | 文本                             |
| `batchId`                       | 批次          | E    | P2     | 文本                             |
| `downloadedTime`                | 下载完成      | E    | P2     | 时间                             |
| `downloadCostMs`                | 下载耗时      | E    | P2     | 「123 ms」                       |
| `createdTime`                   | 创建时间      | F    | P0     | 时间                             |
| `updatedTime`                   | 更新时间      | F    | P1     | 时间                             |
| `createdBy` / `updatedBy`       | 创建人/更新人 | F    | P2     | ID 文本                          |
| `extraJson`                     | 扩展信息      | F    | P2     | 折叠 JSON                        |
| `storagePath` / `thumbnailPath` | 存储路径      | F    | P2     | 折叠展示（建议后端脱敏，见 7.2） |

### 5.4 展示布局

**主推方案：保留抽屉，升级宽度 + 分组折叠。**

- 抽屉宽度由 `420px` 调整为 `600px`（信息量大时更从容，兼顾快速浏览）。
- 抽屉顶部保留「缩略图 + 点击查看原图 + 上一张/下一张」不变。
- 信息区由「单一 dl 列表」改为 **`el-collapse` 分组折叠**：
  - A「基本信息」、B「图片属性」、C「版权与来源」、D「视觉描述」默认展开（C、D 依数据有无自动展开/隐藏）；
  - E「采集信息」、F「存储与审计」默认折叠。
- 每组内采用「标签 72px + 值」的两列网格（沿用现有 `drawer-body__fields` 样式）。

**备选方案**（供评审二选一）：

- **抽屉内 Tabs**：顶部预览区下方用 `el-tabs` 切换「信息 / 视觉描述 / 采集 / 审计」四个标签页。适合字段较多、不想一次性堆叠的场景，但增加一次点击成本。
- **独立全屏详情**：新增 `detail` 路由，网格卡片点击进入独立页，抽屉仅保留快速预览。信息承载能力最强，但改动最大、丢失「左右快速切换」体验。

> 建议评审时优先采用**主推方案**，成本低、信息完整、不破坏既有浏览心智。

### 5.5 交互形式要点

- **尺寸合并**：`width × height` 合并为一行，紧跟 `orientation` 标签。
- **主色调**：`dominantColor` 用 16×16 色块（背景色 + 边框）+ hex 文本，可直接复制。
- **版权署名**：`authorName` 非空且 `authorUrl` 非空时渲染为可点击外链；`sourcePageUrl` 渲染为「查看来源页」链接，`target="_blank" rel="noopener"`。第三方图库（`unsplash/pexels/pixabay`）时 C 组置顶强调，满足署名义务。
- **MD5 复制**：`fileHash` 提供复制按钮，复用项目现有 `useClipboard` 或 `navigator.clipboard`。
- **视觉描述**：`visionDescriptions` 按语言 key 渲染为卡片列表（语言标签 + 描述文本），底部附 `model / cost_ms` 元数据；`errors` 非空时以警告样式展示。`visionStatus=2` 时可提供「重跑」按钮（调用既有 `POST /{id}/vision/regenerate`）。
- **长文本/JSON**：`storagePath`、`extraJson` 等用折叠或省略 + 点击展开，避免撑破抽屉。
- **空值处理**：字段为 `null` / 空串时整行隐藏（沿用现状）；整组无有效字段时隐藏该分组标题。

---

## 六、前置修复项（开发实施第一步）

| #   | 修复         | 文件                              | 说明                                                                                                    |
| --- | ------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 字段名修正   | `index.vue`                       | `storedName`→`storageName`、`createTime`→`createdTime`、`updateTime`→`updatedTime`                      |
| 2   | 来源映射补齐 | `index.vue`                       | `getSourceLabel`/`getSourceType` 补 `pexels/pixabay/sync`                                               |
| 3   | 类型定义     | `api/daily-image.ts` + `hook.tsx` | 新增 `DailyImageDetail` 类型（对应 37 字段），替换 `Record<string, any>` 与 `DailyImageItem` 的宽松字段 |

---

## 七、后端配合项（需另行评审，非本次前端范围）

### 7.1 新增「使用记录」展示（可选增强）

后端已有 `DailyImageUsage` 实体与 Service，记录该图被哪个渠道（`wechat/youtube/manual`）在何时用到了什么外部资源，但**暂无对外查询接口**。若需在详情页展示「使用记录」，需新增 `GET /api/daily-images/{id}/usage` 接口，前端可增设为第 G 组。

### 7.2 详情接口脱敏（安全建议）

当前 `detail` 直接序列化实体，将 `storagePath` / `thumbnailPath`（服务器绝对路径）暴露给前端，存在信息泄露风险。建议后端为详情接口提供专用 VO，隐藏或只返回文件名，而非完整绝对路径。

---

## 八、实施建议（分阶段）

1. **阶段 0（修复）**：落地第六节 3 项前置修复，先让 `storageName/createdTime/updatedTime` 正确显示——零风险、可立即提交。
2. **阶段 1（分组重构）**：按 5.1–5.5 实现 6 组折叠布局与字段渲染，抽屉加宽至 600px。
3. **阶段 2（交互增强）**：主色调色块、版权外链、MD5 复制、视觉描述多语言卡片、失败重跑。
4. **阶段 3（后端协同）**：视评审结论决定是否新增使用记录接口、详情 VO 脱敏。

---

## 九、附：字段完整对照速查

| 后端字段                                                         | 现前端状态              | 方案归属 |
| ---------------------------------------------------------------- | ----------------------- | -------- |
| `id`                                                             | ✅ 显示                 | A·P0     |
| `originalName`                                                   | ✅ 显示                 | A·P0     |
| `extension`                                                      | ✅ 显示                 | A·P0     |
| `fileSize`                                                       | ✅ 显示                 | A·P0     |
| `source`                                                         | ✅ 显示（映射不全）     | A·P0     |
| `remark`                                                         | ✅ 显示                 | A·P0     |
| `storageName`                                                    | ⚠️ 失效（`storedName`） | B·P2     |
| `createdTime`                                                    | ⚠️ 失效（`createTime`） | F·P0     |
| `updatedTime`                                                    | ⚠️ 失效（`updateTime`） | F·P1     |
| `width` / `height`                                               | ❌ 未展示               | B·P0     |
| `orientation`                                                    | ❌ 未展示               | B·P1     |
| `mimeType`                                                       | ❌ 未展示               | B·P1     |
| `dominantColor`                                                  | ❌ 未展示               | B·P1     |
| `fileHash`                                                       | ❌ 未展示               | B·P2     |
| `authorName` / `authorUrl`                                       | ❌ 未展示               | C·P0     |
| `license`                                                        | ❌ 未展示               | C·P1     |
| `sourcePageUrl`                                                  | ❌ 未展示               | C·P1     |
| `sourceId` / `sourceUrl`                                         | ❌ 未展示               | C·P2     |
| `visionStatus` / `visionDescriptions`                            | ❌ 未展示               | D·P1     |
| `visionGeneratedTime`                                            | ❌ 未展示               | D·P2     |
| `imageDate` / `theme`                                            | ❌ 未展示               | E·P1     |
| `queryKeyword` / `batchId` / `downloadedTime` / `downloadCostMs` | ❌ 未展示               | E·P2     |
| `createdBy` / `updatedBy`                                        | ❌ 未展示               | F·P2     |
| `extraJson`                                                      | ❌ 未展示               | F·P2     |
| `storagePath` / `thumbnailPath`                                  | ❌ 未展示（建议脱敏）   | F·P2     |
| `deleted` / `status`                                             | ❌ 未展示（详情已过滤） | 不展示   |
