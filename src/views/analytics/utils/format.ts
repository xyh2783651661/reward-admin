/**
 * 数据分析中心统一的数值格式化。
 * 约定：后端百分比字段均为 0–100 的数值（例如 12.5 表示 12.5%），不要再乘 100。
 */

export type ValueKind = "number" | "percent" | "duration" | "tokens" | "money";

export interface ValueParts {
  main: string;
  unit: string;
}

export const EMPTY_TEXT = "—";

const formatterCache = new Map<number, Intl.NumberFormat>();

function getFormatter(maxDigits: number) {
  let fmt = formatterCache.get(maxDigits);
  if (!fmt) {
    fmt = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: maxDigits });
    formatterCache.set(maxDigits, fmt);
  }
  return fmt;
}

function isValid(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 千分位数字，默认取整 */
export function formatNumber(value: number | null | undefined, digits = 0) {
  return isValid(value) ? getFormatter(digits).format(value) : EMPTY_TEXT;
}

/** 百分比（输入已是 0–100） */
export function formatPercent(value: number | null | undefined, digits = 1) {
  return isValid(value) ? `${getFormatter(digits).format(value)}%` : EMPTY_TEXT;
}

/** Token：万 / 亿 为单位，小数值保留千分位 */
export function tokenParts(value: number | null | undefined): ValueParts {
  if (!isValid(value)) return { main: EMPTY_TEXT, unit: "" };
  const abs = Math.abs(value);
  if (abs >= 1e8)
    return { main: getFormatter(2).format(value / 1e8), unit: "亿" };
  if (abs >= 1e4)
    return { main: getFormatter(2).format(value / 1e4), unit: "万" };
  return { main: getFormatter(0).format(value), unit: "" };
}

/** 耗时：ms → s → min */
export function durationParts(ms: number | null | undefined): ValueParts {
  if (!isValid(ms)) return { main: EMPTY_TEXT, unit: "" };
  const abs = Math.abs(ms);
  if (abs >= 60_000)
    return { main: getFormatter(1).format(ms / 60_000), unit: "min" };
  if (abs >= 1_000)
    return { main: getFormatter(2).format(ms / 1_000), unit: "s" };
  return { main: getFormatter(0).format(ms), unit: "ms" };
}

/**
 * 金额：小于 0.01 时保留 4 位小数。
 *
 * 因为单次调用成本常在 0.001 元量级，按 2 位取整会全变成 0，
 * 面板上就会出现「有 token 消耗但成本为 0」的误解。
 * 单位单独返回，调用方自己拼币种符号（可能是 CNY 也可能是 USD）。
 */
export function moneyParts(value: number | null | undefined): ValueParts {
  if (!isValid(value)) return { main: EMPTY_TEXT, unit: "" };
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : 2;
  return { main: getFormatter(digits).format(value), unit: "" };
}

export function formatParts(
  value: number | null | undefined,
  kind: ValueKind = "number",
  digits?: number
): ValueParts {
  switch (kind) {
    case "percent":
      return isValid(value)
        ? { main: getFormatter(digits ?? 1).format(value), unit: "%" }
        : { main: EMPTY_TEXT, unit: "" };
    case "duration":
      return durationParts(value);
    case "tokens":
      return tokenParts(value);
    case "money":
      return moneyParts(value);
    default:
      return { main: formatNumber(value, digits ?? 0), unit: "" };
  }
}

/** 拼接成单行文本，用于 Tooltip / 表格 */
export function formatText(
  value: number | null | undefined,
  kind: ValueKind = "number",
  digits?: number
) {
  const { main, unit } = formatParts(value, kind, digits);
  if (!unit) return main;
  return unit === "%" ? `${main}${unit}` : `${main} ${unit}`;
}

export function formatDuration(ms: number | null | undefined) {
  return formatText(ms, "duration");
}

export function formatTokens(value: number | null | undefined) {
  return formatText(value, "tokens");
}

/** 相对变化（%）。基数为 0 或缺失时返回 null，调用方应当不展示对比 */
export function relativeChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (!isValid(current) || !isValid(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type Tone = "positive" | "warning" | "negative" | "neutral";

/** 失败率着色：越低越好 */
export function failRateTone(rate: number | null | undefined): Tone {
  if (!isValid(rate)) return "neutral";
  if (rate > 30) return "negative";
  if (rate > 15) return "warning";
  return "positive";
}

/** 成功率着色：越高越好 */
export function successRateTone(rate: number | null | undefined): Tone {
  if (!isValid(rate)) return "neutral";
  if (rate >= 80) return "positive";
  if (rate >= 50) return "warning";
  return "negative";
}
