import type { PaginationProps } from "@pureadmin/table";

/**
 * 项目级统一分页配置（仅用于用户可见的业务列表分页）。
 *
 * 组件内部数据选择（如 ReFriendPicker、ReIcon Select）不引用此配置，
 * 它们属于组件内部行为，不应与业务列表分页混用。
 */
export const RA_PAGINATION: Pick<
  PaginationProps,
  "pageSize" | "pageSizes" | "layout" | "background"
> = {
  pageSize: 10,
  pageSizes: [10, 20, 50, 100],
  layout: "total, sizes, prev, pager, next, jumper",
  background: true
};

/**
 * 项目级统一弹窗宽度。
 *
 * - sm：确认类 / 少量字段（重置密码、发布策略、分配角色、触发补偿）
 * - md：标准新增 / 编辑表单（绝大多数 CRUD 弹窗）
 * - lg：复杂表单、树形分配、富内容查看（菜单权限、版本历史、缓存值、含媒体的记录）
 *
 * 小屏下各弹窗仍通过 `fullscreen: deviceDetection()` 自动全屏。
 */
export const RA_DIALOG_WIDTH = {
  sm: "520px",
  md: "680px",
  lg: "960px"
} as const;
