import type { TaskLogBatchItem, TaskLogStep } from "@/api/logs";

/** 步骤在瀑布图中的布局信息 */
export interface StepEntry {
  step: TaskLogStep;
  index: number;
  cost: number;
  offset: number;
  offsetPct: number;
  widthPct: number;
}

type ActionTagType = "primary" | "success" | "warning" | "info";

const ACTION_TAG_TYPES: Record<string, ActionTagType> = {
  QUERY: "info",
  PROCESS: "primary",
  NOTIFY: "success",
  AI: "warning"
};

export function actionType(action?: string): ActionTagType {
  if (!action) return "info";
  return ACTION_TAG_TYPES[action.toUpperCase()] || "info";
}

const META_KEY_LABEL: Record<string, string> = {
  total: "总数",
  success: "成功",
  failed: "失败",
  skipped: "跳过",
  successCount: "成功",
  failedCount: "失败",
  skippedCount: "跳过",
  recipientCount: "收件人数",
  imageCount: "图片数",
  uploaded: "上传数",
  attempted: "尝试数",
  candidateCount: "候选数",
  hasResult: "有结果",
  provider: "供应商",
  forceRewrite: "强制覆盖",
  daysLeft: "剩余天数",
  memoryCount: "回忆条数",
  holidayName: "节日",
  termName: "节气",
  vacationName: "假期",
  amount: "金额",
  downloadedBytes: "下载字节",
  sizeBytes: "文件大小",
  reloaded: "已热重载",
  hit: "命中",
  bySource: "按来源分布"
};

export function metaKeyLabel(key: string): string {
  return META_KEY_LABEL[key] || key;
}

export function formatMetaValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isLongValue(value: unknown): boolean {
  if (typeof value === "object" && value != null) return true;
  return formatMetaValue(value).length > 48;
}

export function batchItemLabel(item: TaskLogBatchItem): string {
  if (item.note) return item.note;
  const idPart = item.id != null && item.id !== "" ? `[${item.id}] ` : "";
  return `${idPart}${item.reason ?? ""}`;
}

/** 步骤是否携带批处理 / 指标等结构化信息 */
export function hasStructured(step: TaskLogStep): boolean {
  return !!(
    step.total != null ||
    step.successCount != null ||
    step.failedCount != null ||
    step.skippedCount != null ||
    (step.metadata && Object.keys(step.metadata).length > 0) ||
    (step.failures && step.failures.length > 0) ||
    (step.skips && step.skips.length > 0)
  );
}

/** 除了耗时与结果外，步骤是否还有额外信息可展示 */
export function hasExtraInfo(step: TaskLogStep): boolean {
  return !!(
    step.errorMessage ||
    step.total != null ||
    step.failures?.length ||
    step.skips?.length ||
    (step.metadata && Object.keys(step.metadata).length > 0)
  );
}

export function stepSuccessRate(step: TaskLogStep): number {
  const total = step.total ?? 0;
  if (total <= 0) return 0;
  return Math.round(((step.successCount ?? 0) / total) * 100);
}
