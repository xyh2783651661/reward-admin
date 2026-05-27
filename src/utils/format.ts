import dayjs from "dayjs";

/** 空值显示占位符，null/undefined/空字符串统一返回 "-" */
export function emptyText(value: unknown): string {
  if (!value || value === "") return "-";
  return String(value);
}

/** 安全格式化日期，空值返回 "-" */
export function formatDate(
  value: string | null | undefined,
  format = "YYYY-MM-DD HH:mm:ss"
): string {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format(format) : "-";
}
