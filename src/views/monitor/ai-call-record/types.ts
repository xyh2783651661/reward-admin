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
  /** 兼容旧字段（后端已统一为 provider），列表仍可用 */
  model: string;
  /** 调用供应商（后端新字段，列表/详情权威字段） */
  provider?: string;
  templateName: string;
  status: AiCallRecordStatus;
  operator: string;
  traceId: string;
  errorMessage: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  /** 总 Token 数（后端新字段） */
  totalTokens?: number;
  /** 结束原因，如 stop / length / content_filter（后端新字段） */
  finishReason?: string;
  /** 实际调用的远程模型 ID（后端新字段） */
  remoteModel?: string;
  /** 调用模式：0=同步，1=流式（后端新字段） */
  streamMode?: number;
  /** 配置的 max_tokens 上限（后端新字段） */
  maxTokens?: number;
  /** 故障转移重试次数（后端新字段） */
  retryCount?: number;
  /** 故障转移尝试过的供应商链路，逗号分隔（后端新字段） */
  fallbackTried?: string;
  /** 失败时的 Java 异常类全名（后端新字段） */
  exceptionClass?: string;
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
  /** 兼容旧字段（后端已统一为 provider），详情优先取 provider */
  model: string;
  /** 调用供应商（后端新字段，详情权威字段） */
  provider?: string;
  templateName: string;
  prompt: string;
  response: string;
  costTimeMs: number;
  promptTokens: number;
  responseTokens: number;
  /** 总 Token 数（后端新字段） */
  totalTokens?: number;
  /** 结束原因，如 stop / length / content_filter（后端新字段） */
  finishReason?: string;
  status: AiCallRecordStatus;
  errorMessage: string;
  operator: string;
  traceId: string;
  /** 实际调用的远程模型 ID（后端新字段） */
  remoteModel?: string;
  /** 调用模式：0=同步，1=流式（后端新字段） */
  streamMode?: number;
  /** 配置的 max_tokens 上限（后端新字段） */
  maxTokens?: number;
  /** 故障转移重试次数（后端新字段） */
  retryCount?: number;
  /** 故障转移尝试过的供应商链路，逗号分隔（后端新字段） */
  fallbackTried?: string;
  /** 失败时的 Java 异常类全名（后端新字段） */
  exceptionClass?: string;
  /** 失败时的异常堆栈摘要（后端新字段） */
  stackTrace?: string;
  createdTime: string;
  updatedTime: string;
}

export type {
  AiCallRecordStatus,
  AiCallRecordPageReq,
  AiCallRecordPageItem,
  AiCallRecordDetail
};
