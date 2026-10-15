import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

export const getAiCallRecordPage = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiPageResult<T>>("post", "/api/ai/aiCallRecord/page", {
    data
  });
};

export const getAiCallRecordDetail = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("get", `/api/ai/aiCallRecord/${id}`);
};

/** 导出 AI 调用记录（筛选条件与列表一致） */
export const exportAiCallRecords = (data?: object) => {
  return http.request<Blob>("post", "/api/ai/aiCallRecord/export-excel", {
    data,
    responseType: "blob"
  });
};

/** AI 调用记录筛选选项（状态等） */
export const getAiCallRecordOptions = () => {
  return http.request<ApiResult<Record<string, any[]>>>(
    "get",
    "/api/ai/aiCallRecord/options"
  );
};
