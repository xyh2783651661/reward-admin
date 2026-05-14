type AiCallRecordStatus =
  | "SUCCESS"
  | "FAILED"
  | "ERROR"
  | "RUNNING"
  | "PENDING"
  | string;

interface AiCallRecordPageReq {
  current: number;
  size: number;
  id?: number;
  bizType?: string;
  bizId?: string;
  model?: string;
  templateName?: string;
  status?: AiCallRecordStatus | "";
  operator?: string;
  traceId?: string;
  requestTime?: [string, string] | string[];
}

interface AiCallRecordPageItem {
  id: number;
  bizType: string;
  bizId: string;
  model: string;
  templateName: string;
  status: AiCallRecordStatus;
  operator: string;
  traceId: string;
  errorMessage: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  promptLength: number;
  responseLength: number;
  promptPreview: string;
  responsePreview: string;
  createdTime: string;
  updatedTime: string;
}

interface AiCallRecordDetail {
  id: number;
  bizType: string;
  bizId: string;
  model: string;
  templateName: string;
  prompt: string;
  response: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  status: AiCallRecordStatus;
  errorMessage: string;
  operator: string;
  traceId: string;
  createdTime: string;
  updatedTime: string;
}

export type {
  AiCallRecordStatus,
  AiCallRecordPageReq,
  AiCallRecordPageItem,
  AiCallRecordDetail
};
