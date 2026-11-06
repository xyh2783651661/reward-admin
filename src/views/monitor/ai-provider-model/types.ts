import type { AiModelCapability } from "@/constants/ai-provider";

/** 模型来源：SYNC=列表同步，MANUAL=手工维护 */
export type ModelSource = "SYNC" | "MANUAL";

/** 单供应商同步结果状态 */
export type ModelSyncStatus = "SUCCESS" | "SKIPPED" | "FAILED";

/** 模型目录行 */
export interface ProviderModelItem {
  id: number;
  provider: string;
  modelName: string;
  displayName: string;
  capabilities: AiModelCapability[];
  source: ModelSource;
  available: boolean;
  lastSeenTime: string;
  updatedTime: string;
}

/** 模型目录分页请求 */
export interface ProviderModelPageReq {
  current: number;
  size: number;
  provider: string;
  capability: AiModelCapability | "";
  keyword: string;
  available: boolean | "";
}

/** 单供应商同步结果 */
export interface ModelSyncResult {
  provider: string;
  modelsUrl: string;
  status: ModelSyncStatus;
  fetched: number;
  inserted: number;
  updated: number;
  unavailable: number;
  costTimeMs: number;
  errorMessage: string;
}

/** 手工补录表单 */
export interface ManualModelForm {
  provider: string;
  modelName: string;
  displayName: string;
  capabilities: AiModelCapability[];
}

/** 修正能力表单 */
export interface CapabilityForm {
  id: number;
  provider: string;
  modelName: string;
  capabilities: AiModelCapability[];
}
