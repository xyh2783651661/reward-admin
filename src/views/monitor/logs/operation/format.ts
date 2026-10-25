import dayjs from "dayjs";
import { message } from "@/utils/message";
import type { TaskLogTone } from "./status";

/** 毫秒 -> 人类可读耗时 */
export function formatMs(ms?: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatTime(
  time?: string | null,
  pattern = "YYYY-MM-DD HH:mm:ss"
): string {
  if (!time) return "-";
  const value = dayjs(time);
  return value.isValid() ? value.format(pattern) : "-";
}

/** 语义色 -> Element Plus 主题变量，保证深浅色模式都跟随主题 */
export function toneColor(tone: TaskLogTone): string {
  return `var(--el-color-${tone})`;
}

/** 复制文本，便于把调用方法 / 堆栈 / 步骤数据贴进工单 */
export async function copyText(text?: string | null, label = "内容") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message(`${label}已复制`, { type: "success" });
  } catch {
    message("复制失败，请手动选择文本", { type: "error" });
  }
}
