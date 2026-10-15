export type DetailTagType = "primary" | "success" | "warning" | "danger" | "info";

/** DetailFields 中的单个字段 */
export interface DetailFieldItem {
  /** 唯一标识；同时作为自定义插槽名（#[key]="{ item }"） */
  key?: string;
  label: string;
  value?: string | number | null;
  /** 以标签形式展示 value */
  tagType?: DetailTagType;
  /** 显示复制按钮 */
  copy?: boolean;
  /** 等宽字体（ID / 编码 / 路径等） */
  mono?: boolean;
  /** 独占整行 */
  full?: boolean;
  /** 为 true 时不渲染（用于按条件显隐） */
  hidden?: boolean;
}

/** DetailSummary 中的指标卡片 */
export interface DetailSummaryItem {
  label: string;
  value?: string | number | null;
  tagType?: DetailTagType;
  hint?: string;
}
