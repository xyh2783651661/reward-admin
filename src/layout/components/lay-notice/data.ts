export type NoticeTabKey = "notify" | "message" | "todo";

export interface NoticeListItem {
  id: string;
  avatar?: string;
  title: string;
  datetime: string;
  type: NoticeTabKey;
  description: string;
  status?: "primary" | "success" | "warning" | "info" | "danger";
  extra?: string;
  path?: string;
  read?: boolean;
}

export interface NoticeTabItem {
  key: NoticeTabKey;
  name: string;
  list: NoticeListItem[];
  emptyText: string;
}
