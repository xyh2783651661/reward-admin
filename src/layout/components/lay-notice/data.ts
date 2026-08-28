export type NoticeTabKey = "notify" | "message" | "todo";

export interface NoticeListItem {
  id: string | number;
  noticeId?: string | number;
  avatar?: string;
  title: string;
  datetime: string;
  type: NoticeTabKey;
  description: string;
  status?: "primary" | "success" | "warning" | "info" | "danger";
  extra?: string;
  path?: string;
  read?: boolean;
  actionText?: string;
}

export interface NoticeTabItem {
  key: NoticeTabKey;
  name: string;
  list: NoticeListItem[];
  emptyText: string;
  /** 分组数据总量（过滤后口径），用于「共 N 条」展示 */
  total?: number;
  /** 分组未读数，用于角标统计（notify 为全部可见公告未读，不过滤） */
  unread?: number;
  /** 是否还有更多可加载（notify 超过首页时为 true） */
  hasMore?: boolean;
}
