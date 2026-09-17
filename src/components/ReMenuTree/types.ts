/**
 * 菜单权限树类型定义。
 *
 * 设计取向：组件只依赖「树 + 已授权 id 集合」这一最小契约，
 * 字段名（nodeKey / labelKey / childrenKey / typeKey / permsKey）全部可配，
 * 因此任何树形数据的勾选场景都能复用，不必再复制一份树交互。
 */

/** 节点类型标签配置 */
export interface MenuTreeNodeType {
  /** 标签文案 */
  label: string;
  /** Element Plus tag 类型 */
  tag?: "primary" | "success" | "info" | "warning" | "danger";
}
