import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/**
 * 每日图片完整实体。
 *
 * 后端 `DailyImageController` 的列表（page）与详情（/{id}）接口均直接返回
 * `DailyImage` 实体（继承 BaseEntity），因此列表与详情共用本类型。
 * 字段名与后端序列化（驼峰）一一对应。
 */
export type DailyImage = {
  // —— BaseEntity 审计字段 ——
  id: number;
  createdBy?: number;
  updatedBy?: number;
  createdTime?: string;
  updatedTime?: string;
  deleted?: number;
  // —— 基本信息 ——
  originalName?: string;
  storageName?: string;
  extension?: string;
  fileSize?: number;
  source?: string;
  remark?: string;
  // —— 版权与来源 ——
  sourceUrl?: string;
  sourceId?: string;
  sourcePageUrl?: string;
  authorName?: string;
  authorUrl?: string;
  license?: string;
  // —— 图片属性 ——
  width?: number;
  height?: number;
  mimeType?: string;
  fileHash?: string;
  orientation?: string;
  dominantColor?: string;
  // —— 采集信息 ——
  downloadedTime?: string;
  downloadCostMs?: number;
  batchId?: string;
  imageDate?: string;
  theme?: string;
  queryKeyword?: string;
  extraJson?: Record<string, any>;
  // —— 视觉描述 ——
  visionDescriptions?: Record<string, any>;
  visionStatus?: number;
  visionGeneratedTime?: string;
  // —— 状态 ——
  status?: number;
  // —— 存储（敏感，运维排查用） ——
  storagePath?: string;
  thumbnailPath?: string;
};

/** 分页查询图片列表 */
export const getDailyImagePage = <T = DailyImage>(params?: object) => {
  return http.request<ApiPageResult<T>>("get", "/api/daily-images/page", {
    params
  });
};

/** 图片筛选选项（来源等） */
export const getDailyImageOptions = () => {
  return http.request<ApiResult<Record<string, any[]>>>(
    "get",
    "/api/daily-images/options"
  );
};

/** 获取图片详情 */
export const getDailyImageDetail = (id: number) => {
  return http.request<ApiResult<DailyImage>>("get", `/api/daily-images/${id}`);
};

/** 上传图片 */
export const uploadDailyImage = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/daily-images/upload",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

/** 删除图片 */
export const deleteDailyImage = (id: number) => {
  return http.request<ApiResult>("delete", `/api/daily-images/${id}`);
};

/** 批量删除图片 */
export const batchDeleteDailyImage = (ids: number[]) => {
  return http.request<ApiResult<number>>("delete", "/api/daily-images/batch", {
    data: ids,
    headers: { "Content-Type": "application/json" }
  });
};

/** 更新图片备注 */
export const updateDailyImageRemark = (id: number, remark: string) => {
  return http.request<ApiResult>("put", `/api/daily-images/${id}/remark`, {
    params: { remark }
  });
};

/** 重跑单张图片视觉描述（将 vision_status 重置为待生成，由视觉任务自动重跑） */
export const regenerateDailyImageVision = (id: number) => {
  return http.request<ApiResult>(
    "post",
    `/api/daily-images/${id}/vision/regenerate`
  );
};

/** 获取缩略图 URL（直接用作 img src） */
export const getDailyImageThumbnailUrl = (id: number) => {
  return `/api/daily-images/${id}/thumbnail`;
};

/** 获取预览链接（原图预览） */
export const getDailyImagePreviewUrl = (id: number) => {
  return `/api/daily-images/${id}/preview`;
};

/** 获取下载链接 */
export const getDailyImageDownloadUrl = (id: number) => {
  return `/api/daily-images/${id}/download`;
};

/** 批量下载图片（ZIP打包） */
export const batchDownloadDailyImages = (ids: number[]) => {
  return http.request("post", "/api/daily-images/batch-download", {
    data: ids,
    headers: { "Content-Type": "application/json" },
    responseType: "blob"
  });
};

/** 批量获取下载链接 */
export const getBatchDownloadLinks = (ids: number[]) => {
  return http.request<
    ApiResult<Array<{ id: number; name: string; size: number; url: string }>>
  >("post", "/api/daily-images/batch-download-links", {
    data: ids,
    headers: { "Content-Type": "application/json" }
  });
};
