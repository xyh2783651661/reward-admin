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

// ==================== AI 模型单价（成本监控依赖） ====================

/** 单价行：价格单位是「每百万 token」 */
export type AiModelPrice = {
  id?: number;
  /** 供应商槽位（如 QIAN_WEN）；空串 = 全局默认价 */
  provider: string;
  model: string;
  currency: string;
  inputPrice: number;
  outputPrice: number;
  enabled: boolean;
  remark?: string;
};

/** 查询全部单价（含停用，便于维护） */
export const getAiModelPrices = () => {
  return http.request<ApiResult<AiModelPrice[]>>(
    "get",
    "/api/ai/model-price/list"
  );
};

/** 批量保存单价（后端按 model upsert） */
export const saveAiModelPrices = (list: AiModelPrice[]) => {
  return http.request<ApiResult<number>>(
    "post",
    "/api/ai/model-price/batch-save",
    { data: list }
  );
};

/** 实际调用过但未配单价的组合（用于一键导入待填行） */
export type AiModelPriceMissing = {
  provider: string;
  model: string;
  calls: number;
  promptTokens: number;
  responseTokens: number;
};

export const getAiModelPriceMissing = (days = 90) => {
  return http.request<ApiResult<AiModelPriceMissing[]>>(
    "get",
    `/api/ai/model-price/missing?days=${days}`
  );
};
