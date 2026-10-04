/**
 * 农历生日展示格式化。
 *
 * 存储格式为「月-日」，负月代表闰月（如 `8-15` = 八月十五，`-8-15` = 闰八月十五）。
 * 解析规则与后端 `LunarBirthdayUtil` 保持一致：月绝对值 1~12、日 1~30。
 */

const LUNAR_PATTERN = /^(-?[1-9]|1[0-2])-([1-9]|[12]\d|30)$/;

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

/**
 * 把存储格式的农历生日转为中文可读文本。
 *
 * @param raw 形如 `8-15` / `-8-15` 的字符串
 * @returns 如「八月十五」「闰八月十五」；未维护或非法时返回 `-`
 */
export function formatLunarBirthday(raw?: string | null): string {
  if (!raw || !LUNAR_PATTERN.test(raw.trim())) return "-";
  const [m, d] = raw.trim().split("-");
  const monthNum = Number(m);
  const month = MONTH_NAMES[Math.abs(monthNum)] ?? String(Math.abs(monthNum));
  const day = DAY_NAMES[Number(d)] ?? d;
  return `${monthNum < 0 ? "闰" : ""}${month}月${day}`;
}
