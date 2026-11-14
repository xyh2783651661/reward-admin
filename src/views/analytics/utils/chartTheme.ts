import type { Tone } from "./format";

/** 分类色板：克制、可在白/暗底上区分，数量不超过 6 */
export const PALETTE = [
  "#2563eb",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#64748b",
  "#ec4899"
];

export const SEMANTIC = {
  primary: "#2563eb",
  positive: "#10b981",
  warning: "#f59e0b",
  negative: "#ef4444",
  neutral: "#94a3b8",
  muted: "#cbd5e1"
} as const;

export function toneColor(tone: Tone) {
  return SEMANTIC[tone];
}

interface ThemeColors {
  primary: string;
  regular: string;
  secondary: string;
  border: string;
  split: string;
  overlay: string;
}

function readColors(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    primary: get("--el-text-color-primary", "#303133"),
    regular: get("--el-text-color-regular", "#606266"),
    secondary: get("--el-text-color-secondary", "#909399"),
    border: get("--el-border-color", "#dcdfe6"),
    split: get("--el-border-color-lighter", "#ebeef5"),
    overlay: get("--el-bg-color-overlay", "#ffffff")
  };
}

type AnyOption = Record<string, any>;

/** Canvas 无法解析 CSS 变量，业务层用 "@text-primary" 这类令牌，渲染前统一替换 */
function resolveTokens(node: any, c: ThemeColors): any {
  if (typeof node === "string") {
    if (node === "@text-primary") return c.primary;
    if (node === "@text-secondary") return c.secondary;
    return node;
  }
  if (Array.isArray(node)) return node.map(n => resolveTokens(n, c));
  if (
    node &&
    typeof node === "object" &&
    Object.getPrototypeOf(node) === Object.prototype
  ) {
    const out: AnyOption = {};
    for (const key of Object.keys(node)) out[key] = resolveTokens(node[key], c);
    return out;
  }
  return node;
}

function decorateAxis(axis: AnyOption, c: ThemeColors): AnyOption {
  const isValue = axis.type === "value";
  return {
    axisTick: { show: false },
    axisLine: isValue ? { show: false } : { lineStyle: { color: c.border } },
    splitLine: isValue
      ? { lineStyle: { color: c.split, type: "dashed" } }
      : { show: false },
    nameTextStyle: { color: c.secondary, fontSize: 11 },
    ...axis,
    axisLabel: { color: c.secondary, fontSize: 11, ...axis.axisLabel }
  };
}

function decorateAxes(
  axes: AnyOption | AnyOption[] | undefined,
  c: ThemeColors
) {
  if (!axes) return axes;
  return Array.isArray(axes)
    ? axes.map((a, i) =>
        // 多 Y 轴时只让第一根轴绘制网格线，避免两套刻度的网格互相干扰
        decorateAxis(i > 0 ? { ...a, splitLine: { show: false } } : a, c)
      )
    : decorateAxis(axes, c);
}

/**
 * 给业务层传入的 option 补齐统一的视觉：文字色、坐标轴、网格线、Tooltip、图例。
 * 业务层只描述数据与语义，不再关心视觉细节；亮暗色切换时由图表组件重新调用。
 */
export function applyTheme(rawOption: AnyOption): AnyOption {
  const c = readColors();
  const option = resolveTokens(rawOption, c);
  const hasLegend = !!option.legend;
  return {
    color: PALETTE,
    animationDuration: 360,
    textStyle: { color: c.regular },
    grid: {
      left: 4,
      right: 12,
      top: hasLegend ? 40 : 12,
      bottom: 4,
      containLabel: true,
      ...option.grid
    },
    ...option,
    legend: option.legend && {
      top: 0,
      left: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: c.regular, fontSize: 12 },
      ...option.legend
    },
    tooltip: option.tooltip && {
      backgroundColor: c.overlay,
      borderColor: c.split,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: c.primary, fontSize: 12 },
      extraCssText:
        "box-shadow:0 6px 20px rgb(0 0 0 / 10%);border-radius:8px;max-width:360px;white-space:normal;",
      confine: true,
      ...option.tooltip
    },
    xAxis: decorateAxes(option.xAxis, c),
    yAxis: decorateAxes(option.yAxis, c)
  };
}

// ==================== Tooltip 构造 ====================

export function escapeHtml(text: unknown) {
  return String(text ?? "").replace(
    /[&<>"']/g,
    ch =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ] as string
  );
}

export interface TooltipRow {
  color?: string;
  label: string;
  value: string;
}

/** 统一 Tooltip 外观：标题 + 若干「色点 名称 数值」行 + 可选的业务解释 */
export function tooltipHtml(title: string, rows: TooltipRow[], note?: string) {
  const body = rows
    .map(
      r => `<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
<span style="width:8px;height:8px;border-radius:2px;background:${r.color ?? SEMANTIC.neutral};flex:none"></span>
<span style="flex:1;color:var(--el-text-color-secondary)">${escapeHtml(r.label)}</span>
<b style="font-variant-numeric:tabular-nums">${escapeHtml(r.value)}</b></div>`
    )
    .join("");
  const foot = note
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--el-border-color-lighter);color:var(--el-text-color-secondary);line-height:1.5">${escapeHtml(note)}</div>`
    : "";
  return `<div style="min-width:160px"><div style="font-weight:600">${escapeHtml(title)}</div>${body}${foot}</div>`;
}

/** 轴触发 Tooltip：按系列名映射数值格式化函数 */
export function axisTooltip(
  formatters: Record<string, (value: number) => string>,
  note?: (dataIndex: number) => string | undefined
) {
  return {
    trigger: "axis",
    axisPointer: {
      type: "shadow",
      shadowStyle: { color: "rgb(100 116 139 / 8%)" }
    },
    formatter: (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      const rows = list.map((p: any) => ({
        color: p.color?.colorStops ? p.color.colorStops[0].color : p.color,
        label: p.seriesName,
        value: (formatters[p.seriesName] ?? String)(Number(p.value))
      }));
      return tooltipHtml(
        list[0]?.axisValueLabel ?? "",
        rows,
        note?.(list[0]?.dataIndex)
      );
    }
  };
}

// ==================== 常用 option 构造器 ====================

export interface CartesianSeries {
  name: string;
  data: Array<number | null>;
  type?: "bar" | "line";
  /** 同 stack 的柱子堆叠 */
  stack?: string;
  color?: string;
  /** 折线下方填充面积 */
  area?: boolean;
  dashed?: boolean;
  /** 使用右侧 Y 轴 */
  rightAxis?: boolean;
}

export interface CartesianInput {
  categories: string[];
  series: CartesianSeries[];
  leftAxis?: {
    name?: string;
    formatter?: (v: number) => string;
    max?: number;
    min?: number;
  };
  rightAxis?: {
    name?: string;
    formatter?: (v: number) => string;
    max?: number;
    min?: number;
  };
  tooltipFormatters?: Record<string, (value: number) => string>;
  tooltipNote?: (dataIndex: number) => string | undefined;
  barMaxWidth?: number;
  /** x 轴标签旋转 / 间隔 */
  xLabel?: Record<string, any>;
}

/** 时间序列 / 分类对比的通用构造：支持堆叠柱、折线、面积、双 Y 轴 */
export function cartesianOption(input: CartesianInput): AnyOption {
  const hasRight = input.series.some(s => s.rightAxis);
  const stackedBarTop = new Map<string, number>();
  input.series.forEach((s, i) => {
    if (s.type !== "line" && s.stack) stackedBarTop.set(s.stack, i);
  });

  const axisFmt = (axis?: CartesianInput["leftAxis"]) =>
    axis?.formatter ? { formatter: axis.formatter } : undefined;

  return {
    legend:
      input.series.length > 1
        ? { data: input.series.map(s => s.name) }
        : undefined,
    tooltip: axisTooltip(
      {
        ...Object.fromEntries(
          input.series.map(s => [s.name, (v: number) => String(v)])
        ),
        ...input.tooltipFormatters
      },
      input.tooltipNote
    ),
    xAxis: {
      type: "category",
      data: input.categories,
      boundaryGap: input.series.every(s => s.type === "line") ? false : true,
      axisLabel: input.xLabel
    },
    yAxis: [
      {
        type: "value",
        name: input.leftAxis?.name,
        max: input.leftAxis?.max,
        min: input.leftAxis?.min,
        axisLabel: axisFmt(input.leftAxis)
      },
      ...(hasRight
        ? [
            {
              type: "value",
              name: input.rightAxis?.name,
              max: input.rightAxis?.max,
              min: input.rightAxis?.min,
              axisLabel: axisFmt(input.rightAxis)
            }
          ]
        : [])
    ],
    series: input.series.map((s, i) => {
      const isLine = s.type === "line";
      const base: AnyOption = {
        name: s.name,
        type: s.type ?? "bar",
        data: s.data,
        yAxisIndex: s.rightAxis ? 1 : 0,
        color: s.color
      };
      if (isLine) {
        return {
          ...base,
          smooth: 0.2,
          symbol: "circle",
          symbolSize: 5,
          showSymbol: s.data.length <= 31,
          lineStyle: { width: 2, type: s.dashed ? "dashed" : "solid" },
          areaStyle: s.area ? { opacity: 0.1 } : undefined,
          emphasis: { focus: "series" }
        };
      }
      const isTop = !s.stack || stackedBarTop.get(s.stack) === i;
      return {
        ...base,
        stack: s.stack,
        barMaxWidth: input.barMaxWidth ?? 28,
        itemStyle: { borderRadius: isTop ? [3, 3, 0, 0] : 0 },
        emphasis: { focus: "series" }
      };
    })
  };
}

export interface RankingItem {
  name: string;
  value: number;
  color?: string;
  /** Tooltip 里的业务解释 */
  note?: string;
  /** 标签文本，默认使用格式化后的 value */
  label?: string;
}

export interface RankingInput {
  items: RankingItem[];
  valueName: string;
  format: (v: number) => string;
  max?: number;
  min?: number;
  /** 已按值升序排好（ECharts 的类目轴从下往上排），默认自动按 value 降序展示 */
  keepOrder?: boolean;
  barMaxWidth?: number;
  /** 类目标签最大宽度，超出省略 */
  labelWidth?: number;
}

/** 横向条形排行：用于「分类排名 / 占比 / 失败率」 */
export function rankingOption(input: RankingInput): AnyOption {
  const items = input.keepOrder
    ? input.items
    : [...input.items].sort((a, b) => a.value - b.value);
  const hasNegative = items.some(i => i.value < 0);
  return {
    grid: { left: 4, right: 56, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: "rgb(100 116 139 / 8%)" }
      },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const item = items[p.dataIndex];
        return tooltipHtml(
          item.name,
          [
            {
              color: item.color ?? PALETTE[0],
              label: input.valueName,
              value: input.format(item.value)
            }
          ],
          item.note
        );
      }
    },
    xAxis: {
      type: "value",
      max: input.max,
      min: input.min ?? (hasNegative ? undefined : 0),
      axisLabel: { formatter: (v: number) => input.format(v) }
    },
    yAxis: {
      type: "category",
      data: items.map(i => i.name),
      axisLabel: {
        width: input.labelWidth ?? 120,
        overflow: "truncate"
      }
    },
    series: [
      {
        type: "bar",
        barMaxWidth: input.barMaxWidth ?? 16,
        data: items.map(i => ({
          value: i.value,
          itemStyle: {
            color: i.color ?? PALETTE[0],
            borderRadius: i.value >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]
          }
        })),
        label: {
          show: true,
          position: hasNegative ? undefined : "right",
          fontSize: 11,
          color: "@text-secondary",
          formatter: (p: any) =>
            items[p.dataIndex].label ?? input.format(p.value)
        }
      }
    ]
  };
}

export interface DonutItem {
  name: string;
  value: number;
  color?: string;
}

export interface DonutInput {
  items: DonutItem[];
  valueName: string;
  format?: (v: number) => string;
  centerTitle?: string;
  centerValue?: string;
}

/** 环形构成图：仅用于 ≤ 6 个类目的占比；中心展示合计 */
export function donutOption(input: DonutInput): AnyOption {
  const fmt = input.format ?? ((v: number) => String(v));
  return {
    color: input.items.map(
      (i, idx) => i.color ?? PALETTE[idx % PALETTE.length]
    ),
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        tooltipHtml(p.name, [
          {
            color: p.color,
            label: input.valueName,
            value: `${fmt(p.value)}（${p.percent}%）`
          }
        ])
    },
    legend: { orient: "vertical", right: 0, top: "middle", left: undefined },
    graphic: input.centerValue
      ? [
          {
            type: "text",
            left: "28%",
            top: "42%",
            style: {
              text: input.centerValue,
              textAlign: "center",
              fontSize: 22,
              fontWeight: 600,
              fill: "@text-primary"
            }
          },
          {
            type: "text",
            left: "28%",
            top: "56%",
            style: {
              text: input.centerTitle ?? "",
              textAlign: "center",
              fontSize: 11,
              fill: "@text-secondary"
            }
          }
        ]
      : undefined,
    series: [
      {
        type: "pie",
        radius: ["52%", "72%"],
        center: ["32%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: "transparent",
          borderWidth: 2,
          borderRadius: 3
        },
        label: { show: false },
        emphasis: { scaleSize: 4 },
        data: input.items.map(i => ({ name: i.name, value: i.value }))
      }
    ]
  };
}
