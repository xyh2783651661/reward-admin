/**
 * 趋势序列的纯函数分析。只做可复现的算术（极值、均值、前后半段对比），
 * 不做预测或"智能"推断；每个结论都能在页面上写出规则与证据。
 */

export function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>(
    (s, v) => s + (Number.isFinite(v) ? (v as number) : 0),
    0
  );
}

export function mean(values: Array<number | null | undefined>) {
  const valid = values.filter((v): v is number => Number.isFinite(v));
  return valid.length ? sum(valid) / valid.length : null;
}

/** 最大值所在下标；可通过 eligible 排除样本过小的点。没有符合条件的点返回 -1 */
export function peakIndex(
  values: Array<number | null | undefined>,
  eligible: (index: number) => boolean = () => true
) {
  let best = -1;
  values.forEach((v, i) => {
    if (!Number.isFinite(v) || !eligible(i)) return;
    if (best < 0 || (v as number) > (values[best] as number)) best = i;
  });
  return best;
}

export function troughIndex(
  values: Array<number | null | undefined>,
  eligible: (index: number) => boolean = () => true
) {
  let best = -1;
  values.forEach((v, i) => {
    if (!Number.isFinite(v) || !eligible(i)) return;
    if (best < 0 || (v as number) < (values[best] as number)) best = i;
  });
  return best;
}

export interface HalfComparison {
  first: number;
  second: number;
  /** 绝对差（后半段 − 前半段） */
  diff: number;
  /** 相对变化（%）；前半段为 0 时为 null */
  relative: number | null;
}

/**
 * 将序列按时间平分为前后两段，比较各段均值。
 * 少于 4 个点时不具备对比意义，返回 null。
 */
export function compareHalves(
  values: Array<number | null | undefined>
): HalfComparison | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const first = mean(values.slice(0, mid));
  const second = mean(values.slice(values.length - mid));
  if (first === null || second === null) return null;
  return {
    first,
    second,
    diff: second - first,
    relative: first === 0 ? null : ((second - first) / Math.abs(first)) * 100
  };
}

/** 成功数 / 总数 → 百分比，总数为 0 时返回 null（不要补 0） */
export function ratioPercent(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : null;
}
