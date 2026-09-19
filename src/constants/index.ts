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
