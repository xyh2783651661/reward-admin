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
}
