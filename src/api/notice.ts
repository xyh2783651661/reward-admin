import { http } from "@/utils/http";
import { storageLocal } from "@pureadmin/utils";
import { userKey } from "@/utils/auth";
import type { NoticeTabItem } from "@/layout/components/lay-notice/data";

type ApiResult<T> = {
  code: number;
  msg: string;
  success?: boolean;
  data: T;
};

type NoticeClientType = "web" | "android" | "ios" | "mini";

interface NoticePanelData {
  generatedAt: string;
  tabs: NoticeTabItem[];
}

interface NoticePanelOptions {
  userId?: string | number;
  clientType?: NoticeClientType;
}

function buildNoticeHeaders(options?: NoticePanelOptions) {
  const userInfo = storageLocal().getItem<Record<string, any>>(userKey) ?? {};
  const userId = options?.userId ?? userInfo.userId ?? userInfo.id;
  const headers: Record<string, string> = {
    "X-Client-Type": options?.clientType ?? "web"
  };

  if (userId !== undefined && userId !== null && `${userId}`.trim() !== "") {
    headers["X-User-Id"] = String(userId);
  }

  return headers;
}

const getNoticePanel = (options?: NoticePanelOptions) => {
  return http.request<ApiResult<NoticePanelData>>(
    "get",
    "/api/notifications/panel",
    {
      headers: buildNoticeHeaders(options)
    }
  );
};

export { getNoticePanel };
export type { NoticeClientType, NoticePanelData, NoticePanelOptions };
