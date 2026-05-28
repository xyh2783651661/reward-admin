import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/** 分页查询图片列表 */
export const getDailyImagePage = (params?: object) => {
  return http.request<ApiPageResult>("get", "/api/daily-images/page", {
    params
  });
};

/** 获取图片详情 */
export const getDailyImageDetail = (id: number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/daily-images/${id}`
  );
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

/** 更新图片备注 */
export const updateDailyImageRemark = (id: number, remark: string) => {
  return http.request<ApiResult>("put", `/api/daily-images/${id}/remark`, {
    params: { remark }
  });
};

/** 获取缩略图 URL（直接用作 img src） */
export const getDailyImageThumbnailUrl = (id: number) => {
  return `/api/daily-images/${id}/thumbnail`;
};

/** 获取下载链接 */
export const getDailyImageDownloadUrl = (id: number) => {
  return `/api/daily-images/${id}/download`;
};
