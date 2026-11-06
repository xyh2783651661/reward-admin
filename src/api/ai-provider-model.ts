import { http } from "@/utils/http";
import type { SelectOption } from "@/components/ReSelect/types";
import type { ApiResult, ApiPageResult } from "./types";

// ==================== 模型目录 ====================

/** 模型目录分页查询 */
export const getProviderModelPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/ai/provider-models/page",
    { data }
  );
};

/**
 * 配置页模型下拉。
 *
 * 只返回最近一次同步仍存在的模型；返回空数组时说明该供应商尚未同步或
 * 没有对应能力的模型，调用方应回退为「可手填」输入。
 */
export const getProviderModelOptions = (
  provider: string,
  capability?: string
) => {
  return http.request<ApiResult<SelectOption[]>>(
    "get",
    "/api/ai/provider-models/options",
    {
      params: capability ? { provider, capability } : { provider }
    }
  );
};

/** 触发同步；不传 provider 时同步全部已配置供应商 */
export const syncProviderModels = <T = Record<string, any>>(
  provider?: string
) => {
  return http.request<ApiResult<T[]>>("post", "/api/ai/provider-models/sync", {
    params: provider ? { provider } : {}
  });
};

/** 手工补录模型（供应商没有模型列表接口时兜底） */
export const saveProviderModelManual = <T = Record<string, any>>(
  data: object
) => {
  return http.request<ApiResult<T>>("post", "/api/ai/provider-models/manual", {
    data
  });
};

/** 修正模型能力标签（修正后同步不再覆盖） */
export const updateProviderModelCapabilities = <T = Record<string, any>>(
  id: string | number,
  capabilities: string[]
) => {
  return http.request<ApiResult<T>>(
    "post",
    `/api/ai/provider-models/${id}/capabilities`,
    { data: { capabilities } }
  );
};
