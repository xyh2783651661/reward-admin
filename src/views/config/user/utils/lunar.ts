/**
 * 农历生日展示格式化。
 *
 * 存储格式为「月-日」，负月代表闰月（如 `8-15` = 八月十五，`-8-15` = 闰八月十五）。
 * 解析规则与后端 `LunarBirthdayUtil` 保持一致：月绝对值 1~12、日 1~30。
 */

/**
 * 合法格式：可选负号 + 1~12 月 + '-' + 1~30 日。
 *
 * 负号必须同时覆盖两位月的分支（写成 `(-?[1-9]|1[0-2])` 会漏掉
 * 闰冬月 `-11` 与闰腊月 `-12`），这里用 `-?(?:[1-9]|1[0-2])` 修正。
 * 规则与后端 `LunarBirthdayUtil` 保持一致：月绝对值 1~12、日 1~30。
 */
const LUNAR_PATTERN = /^-?(?:[1-9]|1[0-2])-(?:[1-9]|[12]\d|30)$/;

const MONTH_NAMES = [
  "",
  "正",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "冬",
  "腊"
];

const DAY_NAMES = [
  "",
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十"
];

/** 月份下拉选项：文案用农历专名（正月/冬月/腊月），与列表展示一致。 */
export const LUNAR_MONTH_OPTIONS = [
  { label: "正月", value: 1 },
  { label: "二月", value: 2 },
  { label: "三月", value: 3 },
  { label: "四月", value: 4 },
  { label: "五月", value: 5 },
  { label: "六月", value: 6 },
  { label: "七月", value: 7 },
  { label: "八月", value: 8 },
  { label: "九月", value: 9 },
  { label: "十月", value: 10 },
  { label: "冬月(十一月)", value: 11 },
  { label: "腊月(十二月)", value: 12 }
];

/** 日下拉选项：直接复用农历日名（初一~三十），避免表单与列表两套文案。 */
export const LUNAR_DAY_OPTIONS = DAY_NAMES.slice(1).map((label, i) => ({
  label,
  value: i + 1
}));

/** 解析后的农历生日，月份为绝对值 1~12，闰月由 leap 标记。 */
export interface ParsedLunarBirthday {
  month?: number;
  day?: number;
  leap: boolean;
}

/**
 * 把存储格式的农历生日拆成「月 / 日 / 是否闰月」三个控件值。
 *
 * 注意不能直接 `split("-")`：闰月带负号（`-8-15`）会拆成 `["", "8", "15"]`，
 * 解构后月变成空串、日错位成 8。必须按分隔符位置解析。
 */
export function parseLunarBirthday(raw?: string | null): ParsedLunarBirthday {
  const empty: ParsedLunarBirthday = {
    month: undefined,
    day: undefined,
    leap: false
  };
  if (!raw) return empty;
  const text = raw.trim();
  if (!LUNAR_PATTERN.test(text)) return empty;

  const dash = text.indexOf("-", text.startsWith("-") ? 1 : 0);
  const monthNum = Number(text.slice(0, dash));
  return {
    month: Math.abs(monthNum),
    day: Number(text.slice(dash + 1)),
    leap: monthNum < 0
  };
}

/** 三个控件值 → 存储格式；月或日缺失时返回空串（= 未维护）。 */
export function stringifyLunarBirthday(
  month?: number,
  day?: number,
  leap = false
): string {
  if (!month || !day) return "";
  return `${leap ? "-" : ""}${month}-${day}`;
}

/**
 * 把存储格式的农历生日转为中文可读文本。
 *
 * @param raw 形如 `8-15` / `-8-15` 的字符串
 * @returns 如「八月十五」「闰八月十五」；未维护或非法时返回 `-`
 */
export function formatLunarBirthday(raw?: string | null): string {
  const { month, day, leap } = parseLunarBirthday(raw);
  if (!month || !day) return "-";
  const monthName = MONTH_NAMES[month] ?? String(month);
  const dayName = DAY_NAMES[day] ?? String(day);
  return `${leap ? "闰" : ""}${monthName}月${dayName}`;
}
