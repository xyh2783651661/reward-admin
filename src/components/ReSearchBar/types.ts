export type SearchFieldType =
  | "input"
  | "select"
  | "date"
  | "daterange"
  | "datetimerange"
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
  /** type=daterange / datetimerange 时启用 monitor/utils 的快捷选项 */
  shortcuts?: boolean;
  /**
   * date / daterange / datetimerange 的 value-format。
   * date / daterange 默认 YYYY-MM-DD；
   * datetimerange 不传则保持 Element 默认的 Date 对象（避免改变既有接口传参格式）。
   */
  valueFormat?: string;
  /** input-number 的范围 */
  min?: number;
  max?: number;
  /**
   * 控件宽度档位，默认 md。注意 select 只区分 sm/md：
   * sm → ra-select-sm(160px)，md/lg → ra-select(180px)；
   * input/date 类：sm → ra-input-sm(160px)，md → ra-input(200px)，lg → ra-input-lg(220px)。
   * 具体像素由 src/style/index.scss 的 --ra-search-width token 定义。
   */
  width?: SearchFieldWidth;
}
