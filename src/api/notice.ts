import { http } from "@/utils/http";
import { storageLocal } from "@pureadmin/utils";
import { userKey } from "@/utils/auth";
import type { NoticeTabItem } from "@/layout/components/lay-notice/data";
import type { ApiResult, ApiPageResult } from "./types";

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

// ==================== 通知面板 ====================

const getNoticePanel = (options?: NoticePanelOptions) => {
  return http.request<ApiResult<NoticePanelData>>(
    "get",
    "/api/notifications/panel",
    {
      headers: buildNoticeHeaders(options)
    }
  );
};

const markNotificationRead = (
  id: string | number,
  options?: NoticePanelOptions
) => {
  return http.request<ApiResult>("post", `/api/notifications/${id}/read`, {
    headers: buildNoticeHeaders(options)
  });
};

const markAllNotificationsRead = (options?: NoticePanelOptions) => {
  return http.request<ApiResult<number>>(
    "post",
    "/api/notifications/read-all",
    { headers: buildNoticeHeaders(options) }
  );
};

// ==================== 公告 CRUD ====================

/** 公告分页 */
export const getSysNoticePage = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/notice/sysNotice/page", {
    data
  });
};

/** 公告详情 */
export const getSysNoticeDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/notice/sysNotice/${id}`
  );
};

/** 新增公告 */
export const addSysNotice = (data?: object) => {
  return http.request<ApiResult>("post", "/api/notice/sysNotice", { data });
};

/** 修改公告 */
export const updateSysNotice = (data?: object) => {
  return http.request<ApiResult>("put", "/api/notice/sysNotice", { data });
};

/** 删除公告 */
export const deleteSysNotice = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/notice/sysNotice/${id}`);
};

/** 发布公告 */
export const publishSysNotice = (id: string | number, operator?: string) => {
  return http.request<ApiResult>(
    "post",
    `/api/notice/sysNotice/${id}/publish`,
    { params: operator ? { operator } : undefined }
  );
};

/** 撤回公告 */
export const withdrawSysNotice = (id: string | number, operator?: string) => {
  return http.request<ApiResult>(
    "post",
    `/api/notice/sysNotice/${id}/withdraw`,
    { params: operator ? { operator } : undefined }
  );
};

// ==================== 用户已读状态 ====================

/** 标记单个公告已读 */
export const markNoticeRead = (noticeId: string | number) => {
  return http.request<ApiResult>(
    "post",
    `/api/notice/userNoticeRead/${noticeId}/mark`,
    { headers: buildNoticeHeaders() }
  );
};

/** 批量标记已读 */
export const batchMarkNoticeRead = (ids?: Array<string | number>) => {
  return http.request<ApiResult>(
    "post",
    "/api/notice/userNoticeRead/batch-mark",
    { data: ids, headers: buildNoticeHeaders() }
  );
};

/** 一键全部已读 */
export const markAllNoticeRead = () => {
  return http.request<ApiResult<number>>(
    "post",
    "/api/notice/userNoticeRead/mark-all",
    { headers: buildNoticeHeaders() }
  );
};

/** 获取未读数 */
export const getUnreadCount = () => {
  return http.request<ApiResult<number>>(
    "get",
    "/api/notice/userNoticeRead/unread-count",
    { headers: buildNoticeHeaders() }
  );
};

export { getNoticePanel, markNotificationRead, markAllNotificationsRead };
export type { NoticeClientType, NoticePanelData, NoticePanelOptions };
