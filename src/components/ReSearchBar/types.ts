export type SearchFieldType =
  | "input"
  | "select"
  | "date"
  | "daterange"
  | "input-number";

export type SearchFieldWidth = "sm" | "md" | "lg";

export interface SearchFieldOption {
  label: string;
  value: any;
}

export interface SearchField {
  prop: string;
  /** 不带冒号，组件自动补 */
  label: string;
  type: SearchFieldType;
  /** 不传时按 type 自动生成 */
  placeholder?: string;
  /** type=select 时使用 */
  options?: SearchFieldOption[];
  optionsLoading?: boolean;
  filterable?: boolean;
  allowCreate?: boolean;
  /** type=daterange 时启用 monitor/utils 的快捷选项 */
  shortcuts?: boolean;
  /** date / daterange 的 value-format，默认 YYYY-MM-DD */
  valueFormat?: string;
  /** input-number 的范围 */
  min?: number;
  max?: number;
  /** sm → ra-select-sm / md → ra-input | ra-select / lg → ra-input-lg，默认 md */
  width?: SearchFieldWidth;
}
