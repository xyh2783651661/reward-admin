/**
 * 关联分配（用户-角色、角色-菜单等）统一规范：
 *   AssignPanel（被操作对象 + 已选计数） > AssignOptionList（平铺选项）或 ReMenuTree（树形）
 */
export { default as AssignPanel } from "./AssignPanel.vue";
export { default as AssignOptionList } from "./AssignOptionList.vue";
export type { AssignOption } from "./types";
