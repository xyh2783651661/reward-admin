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
