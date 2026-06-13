import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 用户 ====================

/** 初始化或获取 Love 用户 */
export const initLoveUser = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/love-users/init",
    { data }
  );
};

// ==================== 恋爱记录 ====================

/** 记录分页查询 */
export const getLoveRecordPage = (params?: object) => {
  return http.request<ApiPageResult>("get", "/api/records", { params });
};

/** 按日期分页查询 */
export const getLoveRecordByDate = (params?: object) => {
  return http.request<ApiPageResult>("get", "/api/records/by-date", { params });
};

/** 记录详情 */
export const getLoveRecordDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/records/${id}`
  );
};

/** 新增记录 */
export const addLoveRecord = (data?: object) => {
  return http.request<ApiResult>("post", "/api/records", { data });
};

/** 更新记录 */
export const updateLoveRecord = (id: string | number, data?: object) => {
  return http.request<ApiResult>("put", `/api/records/${id}`, { data });
};

/** 删除记录 */
export const deleteLoveRecord = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/records/${id}`);
};

// ==================== 纪念日 ====================

/** 纪念日列表 */
export const getAnniversaryList = (params?: object) => {
  return http.request<
    ApiResult<Record<string, any>[] | { anniversaries?: Record<string, any>[] }>
  >("get", "/api/anniversaries", { params });
};

/** 新增纪念日 */
export const addAnniversary = (data?: object) => {
  return http.request<ApiResult>("post", "/api/anniversaries", { data });
};

/** 修改纪念日 */
export const updateAnniversary = (id: string | number, data?: object) => {
  return http.request<ApiResult>("put", `/api/anniversaries/${id}`, { data });
};

/** 删除纪念日 */
export const deleteAnniversary = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/anniversaries/${id}`);
};

// ==================== 媒体文件 ====================

/** 上传媒体文件 */
export const uploadMedia = (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));
  return http.request<ApiResult<Record<string, any>[]>>(
    "post",
    "/api/media/uploads",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

/** 删除媒体 */
export const deleteMedia = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/media/${id}`);
};

/** 获取媒体查看 URL */
export const getMediaViewUrl = (id: string | number) => {
  return `/api/media/${id}/view`;
};

/** 获取媒体缩略图 URL */
export const getMediaThumbnailUrl = (id: string | number) => {
  return `/api/media/${id}/thumbnail`;
};

// ==================== 位置 ====================

/** 逆地址解析 */
export const reverseGeocode = (params: {
  latitude: number;
  longitude: number;
}) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/locations/reverse-geocode",
    { params }
  );
};

/** 地点搜索 */
export const searchLocations = (params: {
  keyword: string;
  latitude: number;
  longitude: number;
}) => {
  return http.request<ApiResult<Record<string, any>[]>>(
    "get",
    "/api/locations/search",
    { params }
  );
};

// ==================== 统计 ====================

/** 统计概览 */
export const getLoveStatistics = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/statistics/memories"
  );
};

/** 日历视图统计 */
export const getLoveCalendarStats = (year: number, month: number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/statistics/calendar",
    { params: { year, month } }
  );
};

/** 回忆画廊分页 */
export const getMemoryGallery = (params?: object) => {
  return http.request<ApiPageResult>("get", "/api/statistics/memory-gallery", {
    params
  });
};

/** 导出回忆 PDF */
export const exportMemoriesPdf = (params?: object) => {
  return http.request<Blob>("get", "/api/exports/memories/pdf", {
    params,
    responseType: "blob"
  });
};

/** 导出回忆图片 */
export const exportMemoriesImage = (params?: object) => {
  return http.request<Blob>("get", "/api/exports/memories/image", {
    params,
    responseType: "blob"
  });
};

// ==================== 事件与同步 ====================

/** 上报用户行为 */
export const reportLoveEvent = (data?: object) => {
  return http.request<ApiResult<{ success: boolean }>>("post", "/api/events", {
    data
  });
};

/** 首次全量同步 */
export const getSyncBootstrap = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/sync/bootstrap"
  );
};

/** 增量同步 */
export const getSyncChanges = (params?: {
  afterVersion?: number;
  size?: number;
}) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/sync/changes",
    { params }
  );
};

/** App 离线上传变更 */
export const pushSyncChanges = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/sync/push",
    { data }
  );
};

// ==================== 字典选项 ====================

/** 获取记录表单选项 */
export const getLoveOptions = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/options/records"
  );
};

/** 获取当前草稿 */
export const getCurrentRecordDraft = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/record-drafts/current"
  );
};

/** 保存草稿 */
export const saveRecordDraft = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/record-drafts",
    { data }
  );
};

/** 删除草稿 */
export const deleteRecordDraft = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/record-drafts/${id}`);
};

/** 获取自定义心情 */
export const getCustomMoods = () => {
  return http.request<ApiResult<Record<string, any>[]>>(
    "get",
    "/api/options/custom-moods"
  );
};

/** 新增自定义心情 */
export const addCustomMood = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/options/custom-moods",
    { data }
  );
};

/** 删除自定义心情 */
export const deleteCustomMood = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/options/custom-moods/${id}`);
};
