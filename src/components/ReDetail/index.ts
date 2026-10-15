/**
 * 详情页统一展示规范：
 *   DetailPage > DetailHeader（身份 + 操作）
 *             > DetailSummary（关键指标）
 *             > DetailLayout（主内容 + 侧栏）/ DetailSection（分组） > DetailFields（字段）
 * 原始内容（JSON / HTML / 文本）用 DetailCodeBlock 或 ReJsonField 展示。
 */
export { default as DetailPage } from "./DetailPage.vue";
export { default as DetailHeader } from "./DetailHeader.vue";
export { default as DetailSummary } from "./DetailSummary.vue";
export { default as DetailSection } from "./DetailSection.vue";
export { default as DetailFields } from "./DetailFields.vue";
export { default as DetailLayout } from "./DetailLayout.vue";
export { default as DetailCodeBlock } from "./DetailCodeBlock.vue";
export { useDetailCopy } from "./useDetailCopy";
export type {
  DetailFieldItem,
  DetailSummaryItem,
  DetailTagType
} from "./types";
