<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getAnalyticsAccessOverview,
  getAnalyticsAiOverview,
  getAnalyticsMailOverview,
  getAnalyticsPublishOverview,
  getAnalyticsTaskExecution,
  type AnalyticsAccessOverview,
  type AnalyticsAiOverview,
  type AnalyticsMailOverview,
  type AnalyticsPublishOverview,
  type AnalyticsTaskOverview
} from "@/api/analytics";
import AnalyticsChart from "../components/AnalyticsChart.vue";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import DataTable from "../components/DataTable.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { PALETTE, cartesianOption, rankingOption } from "../utils/chartTheme";
import {
  formatNumber,
  formatPercent,
  formatText,
  type ValueKind
} from "../utils/format";
import {
  compareHalves,
  mean,
  peakIndex,
  ratioPercent,
  sum
} from "../utils/series";

defineOptions({ name: "AnalyticsExplore" });

type Row = Record<string, any>;

interface MetricDef {
  key: string;
  label: string;
  kind: ValueKind;
}

interface DimensionDef {
  key: string;
  label: string;
  /** 时间维度：按时间顺序展示趋势；否则为分类维度：排名对比 */
  time?: boolean;
  labelOf: (row: Row) => string;
  metrics: MetricDef[];
  rows: Row[];
  /** 比率类指标对应的样本量字段，用于过滤小样本 */
  sampleKey?: string;
}

const m = (
  key: string,
  label: string,
  kind: ValueKind = "number"
): MetricDef => ({ key, label, kind });

function withRate(rows: Row[], failKey: string, totalKey: string): Row[] {
  return rows.map(r => ({
    ...r,
    failRate: ratioPercent(r[failKey], r[totalKey])
  }));
}

// ==================== 各模块可探索的维度（仅使用现有接口字段） ====================

function buildAi(d: AnalyticsAiOverview): DimensionDef[] {
  return [
    {
      key: "time",
      label: "按月份",
      time: true,
      labelOf: r => r.month,
      rows: d.monthlyTrend,
      metrics: [
        m("total", "调用次数"),
        m("success", "成功次数"),
        m("fail", "失败次数"),
        m("failRate", "失败率", "percent"),
        m("avgCostMs", "平均耗时", "duration"),
        m("totalTokens", "Token 消耗", "tokens"),
        m("fallbackCount", "Fallback 次数"),
        m("fallbackRate", "Fallback 触发率", "percent")
      ]
    },
    {
      key: "model",
      label: "按模型",
      labelOf: r => r.model,
      rows: d.modelStats,
      sampleKey: "total",
      metrics: [
        m("total", "调用次数"),
        m("fail", "失败次数"),
        m("failRate", "失败率", "percent"),
        m("avgCostMs", "平均耗时", "duration"),
        m("totalTokens", "Token 消耗", "tokens"),
        m("fallbackUsed", "使用 Fallback 次数")
      ]
    },
    {
      key: "biz",
      label: "按业务类型",
      labelOf: r => r.bizType,
      rows: withRate(d.bizTypeStats, "failCount", "count"),
      sampleKey: "count",
      metrics: [
        m("count", "调用次数"),
        m("failCount", "失败次数"),
        m("failRate", "失败率", "percent"),
        m("percentage", "占比", "percent"),
        m("avgCostMs", "平均耗时", "duration"),
        m("totalTokens", "Token 消耗", "tokens")
      ]
    },
    {
      key: "provider",
      label: "按供应商",
      labelOf: r => r.provider,
      rows: d.providerHealthCompare.map(r => ({
        ...r,
        total: r.actualSuccess + r.actualFail
      })),
      sampleKey: "total",
      metrics: [
        m("actualSuccess", "实际成功"),
        m("actualFail", "实际失败"),
        m("actualFailRate", "实际失败率", "percent")
      ]
    }
  ];
}

function buildAccess(d: AnalyticsAccessOverview): DimensionDef[] {
  return [
    {
      key: "time",
      label: "按日期",
      time: true,
      labelOf: r => r.date,
      rows: d.dailyTrend,
      metrics: [m("effective", "有效请求"), m("polling", "轮询请求")]
    },
    {
      key: "failUri",
      label: "按接口（失败）",
      labelOf: r => r.uri,
      rows: d.failApis,
      sampleKey: "total",
      metrics: [
        m("total", "请求次数"),
        m("failCount", "失败次数"),
        m("failRate", "失败率", "percent")
      ]
    },
    {
      key: "latency",
      label: "按接口（耗时）",
      labelOf: r => r.uri,
      rows: d.apiLatency,
      metrics: [
        m("count", "请求次数"),
        m("avgMs", "平均耗时", "duration"),
        m("p50", "P50", "duration"),
        m("p95", "P95", "duration"),
        m("p99", "P99", "duration"),
        m("maxMs", "最大耗时", "duration")
      ]
    },
    {
      key: "client",
      label: "按客户端",
      labelOf: r => r.browserType,
      rows: d.clientTypes,
      metrics: [m("count", "请求次数"), m("percentage", "占比", "percent")]
    },
    {
      key: "ip",
      label: "按来源 IP",
      labelOf: r => r.ip,
      rows: d.topIps,
      metrics: [m("requestCount", "请求次数"), m("distinctUris", "访问接口数")]
    }
  ];
}

function buildTask(d: AnalyticsTaskOverview): DimensionDef[] {
  return [
    {
      key: "time",
      label: "按月份",
      time: true,
      labelOf: r => r.month,
      rows: d.monthlyTrend.map(r => ({
        ...r,
        failRate: r.total > 0 ? 100 - r.successRate : null
      })),
      metrics: [
        m("total", "执行次数"),
        m("success", "成功次数"),
        m("successRate", "成功率", "percent"),
        m("failRate", "失败率（含部分成功）", "percent"),
        m("avgCostMs", "平均耗时", "duration")
      ]
    },
    {
      key: "task",
      label: "按任务",
      labelOf: r => r.taskName,
      rows: withRate(d.taskStats, "fail", "total"),
      sampleKey: "total",
      metrics: [
        m("total", "执行次数"),
        m("success", "成功次数"),
        m("fail", "失败次数"),
        m("partial", "部分成功次数"),
        m("successRate", "成功率", "percent"),
        m("failRate", "失败率", "percent"),
        m("avgCostMs", "平均耗时", "duration")
      ]
    }
  ];
}

function buildPublish(d: AnalyticsPublishOverview): DimensionDef[] {
  const daily = (d.packageDailyTrend ?? []).map(r => ({
    ...r,
    total: r.published + r.failed,
    failRate: ratioPercent(r.failed, r.published + r.failed)
  }));
  return [
    {
      key: "time",
      label: "按日期",
      time: true,
      labelOf: r => r.date,
      rows: daily,
      metrics: [
        m("total", "内容包数量"),
        m("published", "发布成功"),
        m("failed", "发布失败"),
        m("failRate", "失败率", "percent")
      ]
    },
    {
      key: "platform",
      label: "按平台",
      labelOf: r => r.platformCode,
      rows: withRate(d.uploadStats, "failed", "total"),
      sampleKey: "total",
      metrics: [
        m("total", "上传次数"),
        m("success", "成功次数"),
        m("failed", "失败次数"),
        m("successRate", "成功率", "percent"),
        m("failRate", "失败率", "percent"),
        m("avgDurationMs", "平均耗时", "duration")
      ]
    },
    {
      key: "reason",
      label: "按失败原因",
      labelOf: r => r.errorType,
      rows: d.failReasons,
      metrics: [
        m("count", "出现次数"),
        m("avgDurationMs", "平均耗时", "duration")
      ]
    }
  ];
}

function buildMail(d: AnalyticsMailOverview): DimensionDef[] {
  return [
    {
      key: "time",
      label: "按月份",
      time: true,
      labelOf: r => r.month,
      rows: withRate(d.monthlyTrend, "fail", "total"),
      metrics: [
        m("total", "发送量"),
        m("success", "成功"),
        m("fail", "失败"),
        m("successRate", "成功率", "percent"),
        m("failRate", "失败率", "percent")
      ]
    },
    {
      key: "type",
      label: "按邮件类型",
      labelOf: r => r.type,
      rows: d.typeStats,
      metrics: [m("count", "发送量"), m("percentage", "占比", "percent")]
    },
    {
      key: "reason",
      label: "按失败原因",
      labelOf: r => r.reason,
      rows: d.failReasons,
      metrics: [m("count", "出现次数")]
    }
  ];
}

interface ModuleDef {
  key: string;
  label: string;
  load: (days: number) => Promise<any>;
  build: (data: any) => DimensionDef[];
}

const MODULES: ModuleDef[] = [
  { key: "ai", label: "AI 调用", load: getAnalyticsAiOverview, build: buildAi },
  {
    key: "access",
    label: "访问行为",
    load: getAnalyticsAccessOverview,
    build: buildAccess
  },
  {
    key: "task",
    label: "任务执行",
    load: getAnalyticsTaskExecution,
    build: buildTask
  },
  {
    key: "publish",
    label: "发布链路",
    load: getAnalyticsPublishOverview,
    build: buildPublish
  },
  {
    key: "mail",
    label: "邮件运营",
    load: getAnalyticsMailOverview,
    build: buildMail
  }
];

// ==================== 状态 ====================

const route = useRoute();
const router = useRouter();

const queryString = (key: string) =>
  typeof route.query[key] === "string" ? (route.query[key] as string) : "";

const range = ref(30);
const moduleKey = ref(
  MODULES.some(i => i.key === queryString("module"))
    ? queryString("module")
    : "ai"
);
const dimKey = ref(queryString("dim"));
const metricKey = ref(queryString("metric"));
const overlayKey = ref("");
const sortDir = ref<"desc" | "asc">("desc");
const topN = ref(10);
const minSample = ref(10);
const showCompare = ref(true);

const currentModule = computed(
  () => MODULES.find(i => i.key === moduleKey.value) ?? MODULES[0]
);

const { data, meta, loading, error, load } = useAnalyticsQuery<any>(
  days => currentModule.value.load(days),
  { range, errorLabel: "加载探索数据失败" }
);

watch(moduleKey, () => {
  data.value = null;
  meta.value = null;
  dimKey.value = "";
  metricKey.value = "";
  overlayKey.value = "";
  load();
});

const dims = computed<DimensionDef[]>(() =>
  data.value ? currentModule.value.build(data.value) : []
);

watch(dims, list => {
  if (list.length && !list.some(d => d.key === dimKey.value))
    dimKey.value = list[0].key;
});

const dim = computed(
  () => dims.value.find(d => d.key === dimKey.value) ?? dims.value[0] ?? null
);

watch(dim, d => {
  if (!d) return;
  if (!d.metrics.some(i => i.key === metricKey.value))
    metricKey.value = d.metrics[0].key;
  if (!d.time || !d.metrics.some(i => i.key === overlayKey.value))
    overlayKey.value = "";
});

const metric = computed(
  () => dim.value?.metrics.find(i => i.key === metricKey.value) ?? null
);
const overlay = computed(() =>
  dim.value?.time
    ? (dim.value.metrics.find(i => i.key === overlayKey.value) ?? null)
    : null
);

watch([moduleKey, dimKey, metricKey], () => {
  const next = {
    ...route.query,
    module: moduleKey.value,
    dim: dimKey.value,
    metric: metricKey.value
  };
  if (JSON.stringify(next) !== JSON.stringify(route.query))
    router.replace({ query: next });
});

const fmt = (value: number | null | undefined, kind: ValueKind) =>
  formatText(value, kind);

// ==================== 视图数据 ====================

const view = computed(() => {
  const d = dim.value;
  const mt = metric.value;
  if (!d || !mt) return { rows: [] as Row[], excluded: 0 };
  if (d.time) return { rows: d.rows, excluded: 0 };
  let rows = d.rows;
  let excluded = 0;
  if (mt.kind === "percent" && d.sampleKey) {
    const key = d.sampleKey;
    const kept = rows.filter(r => (r[key] ?? 0) >= minSample.value);
    excluded = rows.length - kept.length;
    rows = kept;
  }
  rows = rows.filter(r => Number.isFinite(r[mt.key]));
  const dir = sortDir.value === "desc" ? -1 : 1;
  return {
    rows: [...rows].sort((a, b) => dir * (a[mt.key] - b[mt.key])),
    excluded
  };
});

const showSampleFilter = computed(
  () =>
    !!dim.value &&
    !dim.value.time &&
    !!dim.value.sampleKey &&
    metric.value?.kind === "percent"
);

// ==================== 图表 ====================

const chartOption = computed(() => {
  const d = dim.value;
  const mt = metric.value;
  if (!d || !mt || !view.value.rows.length) return null;

  if (!d.time) {
    const shown = view.value.rows.slice(0, topN.value);
    // 条形图类目轴自下而上排列：期望第一名在最上方，因此需要反向传入
    const ordered = [...shown].reverse();
    return rankingOption({
      items: ordered.map(r => ({
        name: d.labelOf(r),
        value: r[mt.key],
        color: PALETTE[0]
      })),
      valueName: mt.label,
      format: v => fmt(v, mt.kind),
      keepOrder: true,
      labelWidth: 160
    });
  }

  const rows = view.value.rows;
  const asBar = mt.kind === "number" || mt.kind === "tokens";
  const series: any[] = [
    {
      name: mt.label,
      data: rows.map(r => r[mt.key] ?? null),
      type: asBar ? "bar" : "line",
      color: PALETTE[0]
    }
  ];
  const tooltipFormatters: Record<string, (v: number) => string> = {
    [mt.label]: v => fmt(v, mt.kind)
  };
  if (overlay.value) {
    series.push({
      name: overlay.value.label,
      data: rows.map(r => r[overlay.value!.key] ?? null),
      type: "line",
      rightAxis: true,
      color: PALETTE[2]
    });
    tooltipFormatters[overlay.value.label] = v => fmt(v, overlay.value!.kind);
  }
  const option = cartesianOption({
    categories: rows.map(r => d.labelOf(r)),
    series,
    leftAxis: {
      formatter: v => fmt(v, mt.kind),
      min: mt.kind === "percent" ? 0 : undefined
    },
    rightAxis: overlay.value
      ? {
          formatter: v => fmt(v, overlay.value!.kind),
          min: overlay.value.kind === "percent" ? 0 : undefined
        }
      : undefined,
    tooltipFormatters
  });

  const cmp = compareHalves(rows.map(r => r[mt.key]));
  if (showCompare.value && cmp) {
    const half = Math.floor(rows.length / 2);
    const lineStyle = { type: "dashed", color: "@text-secondary", width: 1 };
    const label = (text: string) => ({
      position: "insideEndTop",
      color: "@text-secondary",
      fontSize: 11,
      formatter: text
    });
    option.series[0].markLine = {
      silent: true,
      symbol: "none",
      data: [
        [
          {
            coord: [0, cmp.first],
            lineStyle,
            label: label(`前半段均值 ${fmt(cmp.first, mt.kind)}`)
          },
          { coord: [half - 1, cmp.first] }
        ],
        [
          {
            coord: [rows.length - half, cmp.second],
            lineStyle,
            label: label(`后半段均值 ${fmt(cmp.second, mt.kind)}`)
          },
          { coord: [rows.length - 1, cmp.second] }
        ]
      ]
    };
  }
  return option;
});

const chartHeight = computed(() =>
  dim.value?.time
    ? 340
    : Math.max(220, Math.min(topN.value, view.value.rows.length) * 30 + 24)
);

// ==================== 事实摘要（只陈述数据，不做推断） ====================

const facts = computed<string[]>(() => {
  const d = dim.value;
  const mt = metric.value;
  const rows = view.value.rows;
  if (!d || !mt || !rows.length) return [];
  const out: string[] = [];
  const values = rows.map(r => r[mt.key] as number | null);

  if (d.time) {
    const pk = peakIndex(values);
    if (pk >= 0)
      out.push(
        `${mt.label}最高为 ${fmt(values[pk], mt.kind)}，出现在 ${d.labelOf(rows[pk])}`
      );
    const cmp = compareHalves(values);
    if (cmp) {
      const change =
        mt.kind === "percent"
          ? `${cmp.diff > 0 ? "+" : ""}${cmp.diff.toFixed(1)} 个百分点`
          : cmp.relative === null
            ? ""
            : `${cmp.relative > 0 ? "+" : ""}${cmp.relative.toFixed(1)}%`;
      out.push(
        `前半段均值 ${fmt(cmp.first, mt.kind)}，后半段均值 ${fmt(cmp.second, mt.kind)}${change ? `（${change}）` : ""}`
      );
    } else out.push("数据点少于 4 个，不做前后半段对比");
    const avg = mean(values);
    if (avg !== null && mt.kind !== "percent")
      out.push(`区间均值 ${fmt(avg, mt.kind)}，共 ${rows.length} 个数据点`);
    return out;
  }

  const first = rows[0];
  out.push(
    `${sortDir.value === "desc" ? "最高" : "最低"}的是 ${d.labelOf(first)}，${mt.label} ${fmt(first[mt.key], mt.kind)}`
  );
  if (mt.kind === "number" || mt.kind === "tokens") {
    const total = sum(values);
    if (total > 0)
      out.push(
        `${d.labelOf(first)}占全部 ${d.label.replace("按", "")} 合计的 ${formatPercent((first[mt.key] / total) * 100)}（合计 ${fmt(total, mt.kind)}）`
      );
  }
  out.push(
    `共 ${rows.length} 项，图中展示前 ${Math.min(topN.value, rows.length)} 项`
  );
  if (view.value.excluded)
    out.push(
      `已排除 ${view.value.excluded} 项样本量不足 ${minSample.value} 的数据`
    );
  return out;
});

// ==================== 导出 ====================

function exportCsv() {
  const d = dim.value;
  if (!d) return;
  const header = [d.label.replace("按", ""), ...d.metrics.map(i => i.label)];
  const lines = view.value.rows.map(r =>
    [d.labelOf(r), ...d.metrics.map(i => r[i.key] ?? "")]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob(["\ufeff" + [header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${moduleKey.value}-${dim.value?.key}-${range.value}d.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const questionText = computed(() =>
  dim.value && metric.value
    ? `${currentModule.value.label} · ${dim.value.label} · ${metric.value.label}`
    : ""
);
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="数据探索"
      description="选择分析对象、维度与指标，直接基于现有统计接口查看数据"
      :loading="loading"
      @refresh="load"
    />
    <StatsMetaLine :meta="meta" />

    <div class="explore">
      <aside class="rail" aria-label="分析条件">
        <section>
          <h2>分析对象</h2>
          <ul class="rail__modules">
            <li v-for="mod in MODULES" :key="mod.key">
              <button
                type="button"
                :class="{ 'is-active': mod.key === moduleKey }"
                :aria-pressed="mod.key === moduleKey"
                @click="moduleKey = mod.key"
              >
                {{ mod.label }}
              </button>
            </li>
          </ul>
        </section>

        <template v-if="dim">
          <section>
            <h2>分组维度</h2>
            <el-select v-model="dimKey" aria-label="分组维度">
              <el-option
                v-for="d in dims"
                :key="d.key"
                :label="d.label"
                :value="d.key"
              />
            </el-select>
          </section>

          <section>
            <h2>分析指标</h2>
            <el-select v-model="metricKey" aria-label="分析指标">
              <el-option
                v-for="i in dim.metrics"
                :key="i.key"
                :label="i.label"
                :value="i.key"
              />
            </el-select>
          </section>

          <section v-if="dim.time">
            <h2>叠加指标</h2>
            <el-select
              v-model="overlayKey"
              clearable
              placeholder="不叠加"
              aria-label="叠加指标"
            >
              <el-option
                v-for="i in dim.metrics.filter(x => x.key !== metricKey)"
                :key="i.key"
                :label="i.label"
                :value="i.key"
              />
            </el-select>
            <p class="rail__hint">
              以折线绘制在右轴，用于观察两个指标是否同步变化
            </p>
            <el-checkbox v-model="showCompare" class="rail__check">
              标注前后半段均值
            </el-checkbox>
          </section>

          <template v-else>
            <section>
              <h2>排序与数量</h2>
              <el-radio-group
                v-model="sortDir"
                size="small"
                aria-label="排序方式"
              >
                <el-radio-button value="desc">从高到低</el-radio-button>
                <el-radio-button value="asc">从低到高</el-radio-button>
              </el-radio-group>
              <el-select v-model="topN" class="rail__gap" aria-label="展示数量">
                <el-option :value="5" label="前 5 项" />
                <el-option :value="10" label="前 10 项" />
                <el-option :value="20" label="前 20 项" />
                <el-option :value="100" label="全部" />
              </el-select>
            </section>
            <section v-if="showSampleFilter">
              <h2>最小样本量</h2>
              <el-input-number
                v-model="minSample"
                :min="1"
                :max="1000"
                size="small"
                aria-label="最小样本量"
              />
              <p class="rail__hint">
                比率类指标会排除样本量低于该值的项，避免小样本占据榜首
              </p>
            </section>
          </template>
        </template>
      </aside>

      <main class="stage">
        <AnalyticsState
          :loading="loading"
          :error="error"
          :has-data="!!data"
          @retry="load"
        />

        <template v-if="data && dim && metric">
          <header class="stage__head">
            <div>
              <span class="stage__eyebrow">当前分析 · 近 {{ range }} 天</span>
              <h2>{{ questionText }}</h2>
            </div>
            <el-button
              size="small"
              :disabled="!view.rows.length"
              @click="exportCsv"
            >
              <IconifyIconOnline icon="ri:download-2-line" />
              导出 CSV
            </el-button>
          </header>

          <ul v-if="facts.length" class="facts">
            <li v-for="f in facts" :key="f">{{ f }}</li>
          </ul>

          <AnalyticsChart
            v-if="chartOption"
            :option="chartOption"
            :height="chartHeight"
            :label="questionText"
          />
          <el-empty v-else description="当前条件下没有可展示的数据" />

          <section
            v-if="view.rows.length"
            class="stage__table"
            aria-label="数据明细"
          >
            <h3>数据明细 · {{ view.rows.length }} 行</h3>
            <DataTable :data="view.rows">
              <el-table-column
                :label="dim.label.replace('按', '')"
                min-width="180"
                show-overflow-tooltip
              >
                <template #default="{ row }">{{ dim.labelOf(row) }}</template>
              </el-table-column>
              <el-table-column
                v-for="i in dim.metrics"
                :key="i.key"
                :label="i.label"
                min-width="110"
                align="right"
                :class-name="i.key === metricKey ? 'is-primary-col' : ''"
              >
                <template #default="{ row }">{{
                  fmt(row[i.key], i.kind)
                }}</template>
              </el-table-column>
            </DataTable>
          </section>
        </template>

        <details class="scope">
          <summary>当前探索能力的范围</summary>
          <p>
            维度与指标均来自现有分析接口返回的字段，筛选、排序与对比都在前端完成。以下能力需要后端新增接口后才能提供：
          </p>
          <ul>
            <li>自定义起止日期（目前只支持近 7 / 30 / 90 天）</li>
            <li>按小时等更细的时间粒度</li>
            <li>跨模块联合分析，例如按供应商关联 AI 调用与任务失败</li>
            <li>任意维度的组合分组与下钻，例如模型 × 业务类型</li>
          </ul>
        </details>
      </main>
    </div>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.explore {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--ra-space-xl);
  align-items: start;
}

.rail {
  position: sticky;
  top: var(--ra-space-md);
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-lg);
  padding-right: var(--ra-space-lg);
  border-right: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0 0 var(--ra-space-xs);
    font-size: var(--ra-font-xs);
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.04em;
  }
}

.rail__modules {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  margin: 0;
  list-style: none;

  button {
    width: 100%;
    padding: 7px 10px;
    font-size: var(--ra-font-sm);
    color: var(--el-text-color-regular);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 0 6px 6px 0;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &.is-active {
      font-weight: 600;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-left-color: var(--el-color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: -2px;
    }
  }
}

.rail__hint {
  margin: var(--ra-space-xs) 0 0;
  font-size: var(--ra-font-2xs);
  line-height: 1.6;
  color: var(--el-text-color-placeholder);
}

.rail__gap {
  margin-top: var(--ra-space-xs);
}

.rail__check {
  margin-top: var(--ra-space-xs);
}

.stage {
  min-width: 0;
}

.stage__head {
  display: flex;
  gap: var(--ra-space-md);
  align-items: flex-end;
  justify-content: space-between;

  h2 {
    margin: 2px 0 0;
    font-size: var(--ra-font-xl);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.stage__eyebrow {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--ra-space-lg);
  padding: var(--ra-space-sm) 0 var(--ra-space-md);
  margin: 0;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-regular);
  list-style: none;
  border-bottom: 1px solid var(--el-border-color-lighter);

  li::before {
    margin-right: 6px;
    color: var(--el-color-primary);
    content: "•";
  }
}

.stage__table {
  margin-top: var(--ra-space-lg);

  h3 {
    margin: 0 0 var(--ra-space-sm);
    font-size: var(--ra-font-base);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

:deep(.is-primary-col) {
  font-weight: 600;
  background: var(--el-fill-color-lighter);
}

.scope {
  padding-top: var(--ra-space-md);
  margin-top: var(--ra-space-xl);
  font-size: var(--ra-font-xs);
  line-height: 1.7;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);

  summary {
    cursor: pointer;
  }

  ul {
    padding-left: 18px;
    margin: 0;
  }
}

@media (width <= 900px) {
  .explore {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail {
    position: static;
    padding: 0 0 var(--ra-space-md);
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .rail__modules {
    flex-flow: row wrap;
  }
}
</style>
