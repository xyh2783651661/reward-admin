import { http } from "@/utils/http";
import type { NoticeTabItem } from "@/layout/components/lay-notice/data";
import type { ApiResult, ApiPageResult } from "./types";

type NoticeClientType = "web" | "android" | "ios" | "mini";

interface NoticePanelData {
  generatedAt: string;
  tabs: NoticeTabItem[];
}

interface NoticePanelOptions {
  clientType?: NoticeClientType;
}

// ==================== 通知面板 ====================
// 用户 ID 由后端 Sa-Token 登录态解析，前端不再透传 X-User-Id。
// X-Client-Type 已在 http 全局拦截器设置，这里仅在需要覆盖时传入。

const getNoticePanel = (options?: NoticePanelOptions) => {
  return http.request<ApiResult<NoticePanelData>>(
    "get",
    "/api/notifications/panel",
    {
      headers: options?.clientType
        ? { "X-Client-Type": options.clientType }
        : undefined
    }
  );
};

const markNotificationRead = (
  id: string | number,
  options?: NoticePanelOptions
) => {
  return http.request<ApiResult>("post", `/api/notifications/${id}/read`, {
    headers: options?.clientType
      ? { "X-Client-Type": options.clientType }
      : undefined
  });
};

const markAllNotificationsRead = (options?: NoticePanelOptions) => {
  return http.request<ApiResult<number>>(
    "post",
    "/api/notifications/read-all",
    {
      headers: options?.clientType
        ? { "X-Client-Type": options.clientType }
        : undefined
    }
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

// ==================== 用户已读状态（admin 后台，走 Sa-Token 登录态） ====================

/** 标记单个公告已读 */
export const markNoticeRead = (noticeId: string | number) => {
  return http.request<ApiResult>(
    "post",
    `/api/admin/notice/read/${noticeId}/mark`
  );
};

/** 批量标记已读 */
export const batchMarkNoticeRead = (ids?: Array<string | number>) => {
  return http.request<ApiResult>("post", "/api/admin/notice/read/batch-mark", {
    data: ids
  });
};

/** 一键全部已读 */
export const markAllNoticeRead = () => {
  return http.request<ApiResult<number>>(
    "post",
    "/api/admin/notice/read/mark-all"
  );
};

/** 获取未读数 */
export const getUnreadCount = () => {
  return http.request<ApiResult<number>>(
    "get",
    "/api/admin/notice/read/unread-count"
  );
};

export { getNoticePanel, markNotificationRead, markAllNotificationsRead };
export type { NoticeClientType, NoticePanelData, NoticePanelOptions };
