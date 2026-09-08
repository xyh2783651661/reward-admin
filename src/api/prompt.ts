import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/** AI 提示词模板 */
export interface AiPromptTemplate {
  id: number;
  code: string;
  name: string;
  category: string;
  scene: string | null;
  content: string;
  contentFormat: string;
  language: string;
  modelHint: string | null;
  variablesSchema: string | null;
  outputSchema: string | null;
  version: number;
  status: number;
  builtin: number;
  sortOrder: number;
  tags: string | null;
  remark: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

/** 列表查询 */
export interface AiPromptQuery {
  current?: number;
  size?: number;
  category?: string;
  status?: number;
  keyword?: string;
}

/** 新增/编辑请求 */
export interface AiPromptReq {
  id?: number;
  code: string;
  name: string;
  category?: string;
  scene?: string;
  content: string;
  contentFormat?: string;
  language?: string;
  modelHint?: string;
  variablesSchema?: string;
  outputSchema?: string;
  status?: number;
  sortOrder?: number;
  tags?: string;
  remark?: string;
}

/** 测试渲染请求 */
export interface AiPromptTestRenderReq {
  code?: string;
  content?: string;
  variables?: Record<string, unknown>;
}

export const getAiPromptPage = (data?: AiPromptQuery) => {
  return http.request<ApiPageResult<AiPromptTemplate>>(
    "post",
    "/ai/prompts/page",
    { data }
  );
};

export const getAiPromptDetail = (id: number | string) => {
  return http.request<ApiResult<AiPromptTemplate>>(
    "get",
    `/ai/prompts/detail/${id}`
  );
};

export const addAiPrompt = (data?: AiPromptReq) => {
  return http.request<ApiResult<AiPromptTemplate>>("post", "/ai/prompts/add", {
    data
  });
};

export const updateAiPrompt = (data?: AiPromptReq) => {
  return http.request<ApiResult<AiPromptTemplate>>(
    "post",
    "/ai/prompts/update",
    { data }
  );
};

export const deleteAiPrompt = (id: number | string) => {
  return http.request<ApiResult>("delete", `/ai/prompts/${id}`);
};

export const refreshAiPromptCache = (code?: string) => {
  return http.request<ApiResult>("post", "/ai/prompts/refresh", {
    params: code ? { code } : undefined
  });
};

export const testRenderAiPrompt = (data?: AiPromptTestRenderReq) => {
  return http.request<ApiResult<string>>("post", "/ai/prompts/test-render", {
    data
  });
};

/** 导出 — 后端返回 JSON 文件下载流（application/json） */
export const exportAiPromptList = (ids?: Array<number | string>) => {
  const params = ids && ids.length > 0 ? { ids: ids.join(",") } : undefined;
  return http.request<Blob>("get", "/ai/prompts/export", {
    params,
    responseType: "blob"
  });
};
