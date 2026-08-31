/**
 * 通用下拉选项类型，与后端 org.xyh.modules.shared.vo.SelectOption 字段一一对应。
 * 后端 value 为 Object（JSON 序列化后为 number / string / boolean），此处 union 覆盖常见取值。
 */
export interface SelectOption {
  value: string | number | boolean;
  label: string;
  /** 可选：Element Plus Tag 类型，用于彩色标签渲染（success/info/warning/danger/primary） */
  tagType?: "success" | "info" | "warning" | "danger" | "primary" | "";
  disabled?: boolean;
}

/** options 接口通用返回结构：字段名 -> 选项列表 */
export type OptionsResponse = Record<string, SelectOption[]>;
