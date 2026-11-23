<script setup lang="ts">
import { computed, ref } from "vue";
import {
  getAnalyticsAccessOverview,
  getAnalyticsAiOverview,
  getAnalyticsMailOverview,
  getAnalyticsPublishOverview,
  getAnalyticsTaskExecution
} from "@/api/analytics";
import AnalyticsChart from "../components/AnalyticsChart.vue";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import FindingList from "../components/FindingList.vue";
import type { Finding } from "../components/types";
import RateBar from "../components/RateBar.vue";
import Readout from "../components/Readout.vue";
import Sparkline from "../components/Sparkline.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { useModuleLinks, type ModuleKey } from "../composables/useModuleLinks";
import { PALETTE, SEMANTIC, cartesianOption } from "../utils/chartTheme";
import {
  FAIL_RATE_WARN,
  FINDING_RULES,
  MIN_SAMPLE_DEFAULT,
  accessFindings,
  aiFindings,
  mailFindings,
  publishFindings,
  taskFindings
} from "../utils/findings";
import {
  failRateTone,
  formatDuration,
  formatNumber,
  formatPercent,
  formatText,
  formatTokens,
  type Tone,
  type ValueKind
} from "../utils/format";
import {
  compareHalves,
  mean,
  peakIndex,
  ratioPercent,
  sum
} from "../utils/series";

defineOptions({ name: "AnalyticsOverview" });

const range = ref(30);
const scope = computed(() => `近 ${range.value} 天`);
const { opener } = useModuleLinks();

const ai = useAnalyticsQuery(getAnalyticsAiOverview, {
  range,
  errorLabel: "加载 AI 调用数据失败"
});
const access = useAnalyticsQuery(getAnalyticsAccessOverview, {
  range,
  errorLabel: "加载访问行为数据失败"
});
const task = useAnalyticsQuery(getAnalyticsTaskExecution, {
  range,
  errorLabel: "加载任务执行数据失败"
});
const publish = useAnalyticsQuery(getAnalyticsPublishOverview, {
  range,
  errorLabel: "加载发布链路数据失败"
});
const mail = useAnalyticsQuery(getAnalyticsMailOverview, {
  range,
  errorLabel: "加载邮件运营数据失败"
});

const queries = [
  { key: "ai", label: "AI 调用", q: ai },
  { key: "access", label: "访问行为", q: access },
  { key: "task", label: "任务执行", q: task },
  { key: "publish", label: "发布链路", q: publish },
  { key: "mail", label: "邮件运营", q: mail }
] as const;

const anyLoading = computed(() => queries.some(i => i.q.loading.value));
const hasAny = computed(() => queries.some(i => i.q.data.value));
const allFailed = computed(() =>
  queries.every(i => i.q.error.value && !i.q.data.value)
);
const firstError = computed(
  () => queries.find(i => i.q.error.value)?.q.error.value ?? ""
);
const failedModules = computed(() =>
  queries.filter(i => i.q.error.value).map(i => i.label)
);
const meta = computed(
  () => access.meta.value ?? ai.meta.value ?? task.meta.value ?? mail.meta.value
);

function reloadAll() {
  queries.forEach(i => i.q.load());
}

// ==================== 模块一览（台账） ====================

interface ModuleRow {
  key: ModuleKey;
  label: string;
  loaded: boolean;
  volume: number | null;
  volumeUnit: string;
  failRate: number | null;
  volumeSeries: number[];
  failSeries: Array<number | null>;
}

const rows = computed<ModuleRow[]>(() => {
  const a = ai.data.value;
  const ac = access.data.value;
  const t = task.data.value;
  const p = publish.data.value;
  const m = mail.data.value;
  return [
    {
      key: "ai",
      label: "AI 调用",
      loaded: !!a,
      volume: a?.totalCalls ?? null,
      volumeUnit: "次调用",
      failRate: a && a.totalCalls > 0 ? a.failRate : null,
      volumeSeries: a?.monthlyTrend.map(i => i.total) ?? [],
      failSeries:
        a?.monthlyTrend.map(i => (i.total > 0 ? i.failRate : null)) ?? []
    },
    {
      key: "access",
      label: "访问行为",
      loaded: !!ac,
      volume: ac?.effectiveRequests ?? null,
      volumeUnit: "次有效请求",
      failRate: ac && ac.effectiveRequests > 0 ? ac.failRate : null,
      volumeSeries: ac?.dailyTrend.map(i => i.effective) ?? [],
      failSeries: []
    },
    {
      key: "task",
      label: "任务执行",
      loaded: !!t,
      volume: t?.totalTasks ?? null,
      volumeUnit: "次执行",
      failRate: t && t.totalTasks > 0 ? 100 - t.successRate : null,
      volumeSeries: t?.monthlyTrend.map(i => i.total) ?? [],
      failSeries:
        t?.monthlyTrend.map(i => (i.total > 0 ? 100 - i.successRate : null)) ??
        []
    },
    {
      key: "publish",
      label: "发布链路",
      loaded: !!p,
      volume: p?.totalPackages ?? null,
      volumeUnit: "个内容包",
      failRate: p && p.totalPackages > 0 ? 100 - p.publishSuccessRate : null,
      volumeSeries:
        p?.packageDailyTrend?.map(i => i.published + i.failed) ?? [],
      failSeries:
        p?.packageDailyTrend?.map(i =>
          ratioPercent(i.failed, i.published + i.failed)
        ) ?? []
    },
    {
      key: "mail",
      label: "邮件运营",
      loaded: !!m,
      volume: m?.totalSent ?? null,
      volumeUnit: "封邮件",
      failRate: m && m.totalSent > 0 ? 100 - m.successRate : null,
      volumeSeries: m?.monthlyTrend.map(i => i.total) ?? [],
      failSeries: m?.monthlyTrend.map(i => ratioPercent(i.fail, i.total)) ?? []
    }
  ];
});

function rowTone(row: ModuleRow): Tone {
  if (row.failRate === null || (row.volume ?? 0) < MIN_SAMPLE_DEFAULT)
    return "neutral";
  return failRateTone(row.failRate);
}

function failTrendText(row: ModuleRow) {
  const cmp = compareHalves(row.failSeries);
  if (!cmp) return "";
  const sign = cmp.diff > 0 ? "+" : "";
  return `${formatPercent(cmp.first)} → ${formatPercent(cmp.second)}（${sign}${cmp.diff.toFixed(1)} 个百分点）`;
}

// ==================== 一句话结论 ====================

const assessed = computed(() =>
  rows.value.filter(
    r => r.failRate !== null && (r.volume ?? 0) >= MIN_SAMPLE_DEFAULT
  )
);
const attention = computed(() =>
  assessed.value.filter(r => (r.failRate as number) > FAIL_RATE_WARN)
);
const insufficient = computed(() =>
  rows.value.filter(r => r.loaded && !assessed.value.some(a => a.key === r.key))
);

const headline = computed(() => {
  if (!assessed.value.length) return "当前周期内可判断的数据不足";
  if (attention.value.length)
    return `${attention.value.map(r => r.label).join("、")}的失败率超过 ${FAIL_RATE_WARN}%`;
  return `${assessed.value.length} 个业务模块的失败率均未超过 ${FAIL_RATE_WARN}%`;
});

const headlineDetail = computed(() => {
  const parts: string[] = [];
  const worst = [...assessed.value].sort(
    (a, b) => (b.failRate as number) - (a.failRate as number)
  )[0];
  if (worst)
    parts.push(
      `失败率最高的是${worst.label}，为 ${formatPercent(worst.failRate)}（${formatNumber(worst.volume)} ${worst.volumeUnit}）`
    );
  if (insufficient.value.length)
    parts.push(
      `${insufficient.value.map(r => r.label).join("、")}样本不足 ${MIN_SAMPLE_DEFAULT} 或无数据，未纳入判断`
    );
  return parts.join("；");
});

const leadTone = computed<"warning" | "ok">(() =>
  attention.value.length ? "warning" : "ok"
);

// ==================== 主读数 ====================

const effectiveSpark = computed(
  () => access.data.value?.dailyTrend.map(i => i.effective) ?? []
);
const aiSuccessSpark = computed(
  () =>
    ai.data.value?.monthlyTrend.map(i =>
      i.total > 0 ? 100 - i.failRate : null
    ) ?? []
);
const taskSuccessSpark = computed(
  () =>
    task.data.value?.monthlyTrend.map(i =>
      i.total > 0 ? i.successRate : null
    ) ?? []
);

// ==================== 主趋势：系统访问量 ====================

const dailyTrend = computed(() => access.data.value?.dailyTrend ?? []);

const heroOption = computed(() => {
  const trend = dailyTrend.value;
  const option = cartesianOption({
    categories: trend.map(i => i.date),
    series: [
      {
        name: "有效请求",
        data: trend.map(i => i.effective),
        color: PALETTE[0]
      },
      {
        name: "轮询请求",
        data: trend.map(i => i.polling),
        type: "line",
        dashed: true,
        rightAxis: true,
        color: SEMANTIC.neutral
      }
    ],
    leftAxis: { formatter: v => formatNumber(v) },
    rightAxis: { formatter: v => formatNumber(v) },
    tooltipFormatters: {
      有效请求: v => `${formatNumber(v)} 次`,
      轮询请求: v => `${formatNumber(v)} 次`
    },
    barMaxWidth: 22
  });
  const bar = (option.series as any[])[0];
  bar.markPoint = {
    symbol: "pin",
    symbolSize: 46,
    data: [{ type: "max", name: "峰值" }],
    label: {
      color: "#fff",
      fontSize: 10,
      formatter: (p: any) => formatNumber(p.value)
    }
  };
  bar.markLine = {
    silent: true,
    symbol: "none",
    data: [{ type: "average", name: "日均" }],
    lineStyle: { type: "dashed", color: "@text-secondary", width: 1 },
    label: {
      position: "insideEndTop",
      color: "@text-secondary",
      fontSize: 11,
      formatter: (p: any) => `日均 ${formatNumber(p.value)}`
    }
  };
  return option;
});

const heroNotes = computed(() => {
  const d = access.data.value;
  if (!d || !d.dailyTrend.length) return [];
  const effective = d.dailyTrend.map(i => i.effective);
  const notes: Array<{ label: string; value: string; hint?: string }> = [];
  const peak = peakIndex(effective);
  if (peak >= 0)
    notes.push({
      label: "访问高峰",
      value: formatNumber(effective[peak]),
      hint: `${d.dailyTrend[peak].date}，单日有效请求`
    });
  const avg = mean(effective);
  if (avg !== null)
    notes.push({
      label: "日均有效请求",
      value: formatNumber(avg),
      hint: `共 ${effective.length} 天，合计 ${formatNumber(sum(effective))}`
    });
  const cmp = compareHalves(effective);
  if (cmp?.relative !== null && cmp) {
    const rel = cmp.relative as number;
    notes.push({
      label: "后半段 vs 前半段",
      value: `${rel > 0 ? "+" : ""}${rel.toFixed(1)}%`,
      hint: `日均 ${formatNumber(cmp.first)} → ${formatNumber(cmp.second)}`
    });
  }
  const polling = ratioPercent(
    d.pollingRequests,
    d.pollingRequests + d.effectiveRequests
  );
  if (polling !== null)
    notes.push({
      label: "轮询请求占比",
      value: formatPercent(polling),
      hint: `${formatNumber(d.pollingRequests)} 次轮询未计入有效请求`
    });
  return notes;
});

// ==================== 近期变化 ====================

interface TrendDef {
  module: string;
  label: string;
  kind: "count" | "rate" | "duration" | "tokens";
  /** up：上升是坏事（失败率、耗时）；none：不做好坏判断 */
  badWhen: "up" | "none";
  values: Array<number | null>;
  volumes?: number[];
}

const trendDefs = computed<TrendDef[]>(() => {
  const defs: TrendDef[] = [];
  const a = ai.data.value;
  if (a) {
    const v = a.monthlyTrend;
    defs.push(
      {
        module: "AI 调用",
        label: "调用量",
        kind: "count",
        badWhen: "none",
        values: v.map(i => i.total)
      },
      {
        module: "AI 调用",
        label: "失败率",
        kind: "rate",
        badWhen: "up",
        values: v.map(i => (i.total > 0 ? i.failRate : null)),
        volumes: v.map(i => i.total)
      },
      {
        module: "AI 调用",
        label: "平均耗时",
        kind: "duration",
        badWhen: "up",
        values: v.map(i => (i.total > 0 ? i.avgCostMs : null))
      },
      {
        module: "AI 调用",
        label: "Token 消耗",
        kind: "tokens",
        badWhen: "none",
        values: v.map(i => i.totalTokens ?? null)
      }
    );
  }
  const ac = access.data.value;
  if (ac)
    defs.push({
      module: "访问行为",
      label: "有效请求",
      kind: "count",
      badWhen: "none",
      values: ac.dailyTrend.map(i => i.effective)
    });
  const t = task.data.value;
  if (t) {
    const v = t.monthlyTrend;
    defs.push(
      {
        module: "任务执行",
        label: "执行量",
        kind: "count",
        badWhen: "none",
        values: v.map(i => i.total)
      },
      {
        module: "任务执行",
        label: "失败率",
        kind: "rate",
        badWhen: "up",
        values: v.map(i => (i.total > 0 ? 100 - i.successRate : null)),
        volumes: v.map(i => i.total)
      },
      {
        module: "任务执行",
        label: "平均耗时",
        kind: "duration",
        badWhen: "up",
        values: v.map(i => (i.total > 0 ? i.avgCostMs : null))
      }
    );
  }
  const p = publish.data.value?.packageDailyTrend;
  if (p)
    defs.push(
      {
        module: "发布链路",
        label: "内容包数量",
        kind: "count",
        badWhen: "none",
        values: p.map(i => i.published + i.failed)
      },
      {
        module: "发布链路",
        label: "失败率",
        kind: "rate",
        badWhen: "up",
        values: p.map(i => ratioPercent(i.failed, i.published + i.failed)),
        volumes: p.map(i => i.published + i.failed)
      }
    );
  const m = mail.data.value;
  if (m)
    defs.push(
      {
        module: "邮件运营",
        label: "发送量",
        kind: "count",
        badWhen: "none",
        values: m.monthlyTrend.map(i => i.total)
      },
      {
        module: "邮件运营",
        label: "失败率",
        kind: "rate",
        badWhen: "up",
        values: m.monthlyTrend.map(i => ratioPercent(i.fail, i.total)),
        volumes: m.monthlyTrend.map(i => i.total)
      }
    );
  return defs;
});

const REL_THRESHOLD = 25;
const PP_THRESHOLD = 5;
const MIN_POINT_VOLUME = 5;

const changes = computed(() => {
  const list: Array<{
    module: string;
    label: string;
    from: string;
    to: string;
    delta: string;
    tone: Tone;
    score: number;
    values: Array<number | null>;
  }> = [];
  for (const def of trendDefs.value) {
    const cmp = compareHalves(def.values);
    if (!cmp) continue;
    let score: number;
    let delta: string;
    if (def.kind === "rate") {
      if ((mean(def.volumes ?? []) ?? 0) < MIN_POINT_VOLUME) continue;
      if (Math.abs(cmp.diff) < PP_THRESHOLD) continue;
      score = Math.abs(cmp.diff) / PP_THRESHOLD;
      delta = `${cmp.diff > 0 ? "+" : ""}${cmp.diff.toFixed(1)} 个百分点`;
    } else {
      if (cmp.relative === null || Math.abs(cmp.relative) < REL_THRESHOLD)
        continue;
      score = Math.abs(cmp.relative) / REL_THRESHOLD;
      delta = `${cmp.relative > 0 ? "+" : ""}${cmp.relative.toFixed(0)}%`;
    }
    const kind: ValueKind =
      def.kind === "rate"
        ? "percent"
        : def.kind === "count"
          ? "number"
          : def.kind;
    const fmt = (v: number) =>
      def.kind === "count" ? formatNumber(v) : formatText(v, kind);
    const tone: Tone =
      def.badWhen === "none"
        ? "neutral"
        : cmp.diff > 0
          ? "negative"
          : "positive";
    list.push({
      module: def.module,
      label: def.label,
      from: fmt(cmp.first),
      to: fmt(cmp.second),
      delta,
      tone,
      score,
      values: def.values
    });
  }
  return list.sort((a, b) => b.score - a.score).slice(0, 6);
});

// ==================== 需要关注 ====================

const findings = computed<Finding[]>(() => {
  const list: Finding[] = [];
  if (ai.data.value)
    list.push(
      ...aiFindings(ai.data.value, scope.value, { onModule: opener("ai") })
    );
  if (access.data.value)
    list.push(
      ...accessFindings(access.data.value, scope.value, opener("access"))
    );
  if (task.data.value)
    list.push(...taskFindings(task.data.value, scope.value, opener("task")));
  if (publish.data.value)
    list.push(
      ...publishFindings(publish.data.value, scope.value, opener("publish"))
    );
  if (mail.data.value)
    list.push(...mailFindings(mail.data.value, scope.value, opener("mail")));
  const order = { critical: 0, warning: 1, info: 2 } as const;
  return list.sort((a, b) => order[a.level] - order[b.level]).slice(0, 8);
});

const findingRules = Object.values(FINDING_RULES).join("；");
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="数据分析总览"
      description="先看整体是否健康，再看近期变化与需要处理的事项，最后进入专题页下钻"
      :loading="anyLoading"
      @refresh="reloadAll"
    />
    <StatsMetaLine :meta="meta" />

    <AnalyticsState
      :loading="anyLoading"
      :error="allFailed ? firstError : ''"
      :has-data="hasAny"
      @retry="reloadAll"
    />

    <template v-if="hasAny">
      <el-alert
        v-if="failedModules.length"
        type="warning"
        show-icon
        :closable="false"
        :title="`以下模块加载失败，总览未包含其数据：${failedModules.join('、')}`"
      >
        <el-button size="small" @click="reloadAll">重新加载</el-button>
      </el-alert>

      <!-- 结论带：一句话判断 + 三个最关键读数 -->
      <section class="lead" :class="`is-${leadTone}`" aria-label="整体结论">
        <div class="lead__verdict">
          <span class="lead__eyebrow">{{ scope }} · 核心业务状态</span>
          <h2 class="lead__headline">{{ headline }}</h2>
          <p v-if="headlineDetail" class="lead__detail">{{ headlineDetail }}</p>
          <p class="lead__rule">
            判断规则：失败率 &gt; {{ FAIL_RATE_WARN }}% 且样本 ≥
            {{ MIN_SAMPLE_DEFAULT }} 记为需要关注
          </p>
        </div>
        <div class="lead__figures">
          <Readout
            size="lead"
            label="有效请求"
            :value="access.data.value?.effectiveRequests"
            :spark="effectiveSpark"
            :caption="
              access.data.value
                ? `${formatNumber(access.data.value.uniqueIps)} 个独立 IP`
                : ''
            "
            hint="不含前端轮询的有效访问请求数"
          />
          <Readout
            size="lead"
            label="AI 调用成功率"
            kind="percent"
            :value="ai.data.value?.successRate"
            :tone="failRateTone(ai.data.value?.failRate)"
            :spark="aiSuccessSpark"
            :caption="
              ai.data.value
                ? `${formatNumber(ai.data.value.totalCalls)} 次调用 · ${formatTokens(ai.data.value.totalTokens)} Token`
                : ''
            "
          />
          <Readout
            size="lead"
            label="任务成功率"
            kind="percent"
            :value="task.data.value?.successRate"
            :tone="failRateTone(100 - (task.data.value?.successRate ?? 100))"
            :spark="taskSuccessSpark"
            :caption="
              task.data.value
                ? `${formatNumber(task.data.value.totalTasks)} 次执行 · 平均 ${formatDuration(task.data.value.avgCostMs)}`
                : ''
            "
          />
        </div>
      </section>

      <!-- 主趋势 -->
      <section
        v-if="dailyTrend.length"
        class="block"
        aria-label="系统访问量趋势"
      >
        <header class="block__head">
          <h2>系统访问量</h2>
          <span
            >每日有效请求（柱）与轮询请求（虚线，右轴）；标注为峰值与日均</span
          >
        </header>
        <div class="hero">
          <AnalyticsChart
            :option="heroOption"
            :height="300"
            label="每日有效请求与轮询请求趋势"
          />
          <dl class="hero__notes">
            <div v-for="n in heroNotes" :key="n.label">
              <dt>{{ n.label }}</dt>
              <dd>{{ n.value }}</dd>
              <p v-if="n.hint">{{ n.hint }}</p>
            </div>
          </dl>
        </div>
      </section>

      <!-- 模块台账 -->
      <section class="block" aria-label="各模块一览">
        <header class="block__head">
          <h2>各模块一览</h2>
          <span
            >各模块使用自己的时间轴与量纲，趋势线只比较各自的起伏，不跨模块比较高低</span
          >
        </header>
        <div class="ledger" role="table">
          <div class="ledger__row ledger__row--head" role="row">
            <span role="columnheader">模块</span>
            <span role="columnheader">周期量级</span>
            <span role="columnheader">量级走势</span>
            <span role="columnheader">失败率</span>
            <span role="columnheader">失败率走势（前半段 → 后半段）</span>
            <span role="columnheader" />
          </div>
          <div
            v-for="row in rows"
            :key="row.key"
            class="ledger__row"
            role="row"
          >
            <strong role="cell">{{ row.label }}</strong>
            <span role="cell" class="ledger__volume">
              <template v-if="row.volume !== null">
                <b>{{ formatNumber(row.volume) }}</b>
                <small>{{ row.volumeUnit }}</small>
              </template>
              <small v-else>{{ row.loaded ? "无数据" : "加载失败" }}</small>
            </span>
            <span role="cell">
              <Sparkline
                :values="row.volumeSeries"
                :label="`${row.label}量级走势`"
              />
            </span>
            <span role="cell">
              <RateBar
                v-if="row.failRate !== null"
                :value="row.failRate"
                :tone="rowTone(row)"
              />
              <small v-else class="ledger__muted">—</small>
            </span>
            <span role="cell" class="ledger__trend">
              <template v-if="row.failSeries.length">
                <Sparkline
                  :values="row.failSeries"
                  :tone="rowTone(row)"
                  :label="`${row.label}失败率走势`"
                />
                <small>{{ failTrendText(row) || "数据点不足" }}</small>
              </template>
              <small v-else class="ledger__muted">接口未提供按日失败率</small>
            </span>
            <span role="cell">
              <el-button
                v-if="opener(row.key)"
                size="small"
                text
                type="primary"
                @click="opener(row.key)?.()"
              >
                查看专题
                <IconifyIconOnline icon="ri:arrow-right-s-line" />
              </el-button>
            </span>
          </div>
        </div>
      </section>

      <!-- 变化 + 关注 -->
      <div class="split">
        <section class="block" aria-label="近期重要变化">
          <header class="block__head">
            <h2>近期重要变化</h2>
            <span>按变化幅度排序，最多 6 项</span>
          </header>
          <ul v-if="changes.length" class="changes">
            <li v-for="c in changes" :key="`${c.module}-${c.label}`">
              <div class="changes__name">
                <small>{{ c.module }}</small>
                <strong>{{ c.label }}</strong>
              </div>
              <Sparkline
                :values="c.values"
                :tone="c.tone"
                :label="`${c.label}走势`"
              />
              <div class="changes__range">
                <span>{{ c.from }} → {{ c.to }}</span>
                <b :class="`tone-${c.tone}`">{{ c.delta }}</b>
              </div>
            </li>
          </ul>
          <p v-else class="muted">所选周期内没有变化幅度达到阈值的指标。</p>
          <p class="rule">
            规则：把周期内的趋势点按时间平分为前后两段并比较均值；量类指标变化 ≥
            {{ REL_THRESHOLD }}%、比率类指标变化 ≥
            {{ PP_THRESHOLD }} 个百分点才会列出， 比率类还要求每个点平均样本 ≥
            {{ MIN_POINT_VOLUME }}。
          </p>
        </section>

        <section class="block" aria-label="需要关注">
          <header class="block__head">
            <h2>需要关注</h2>
            <span>{{ findings.length ? `${findings.length} 项` : "" }}</span>
          </header>
          <FindingList :items="findings" :rules="findingRules" />
        </section>
      </div>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.lead {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: var(--ra-space-xl);
  padding: var(--ra-space-xl);
  background: var(--el-fill-color-lighter);
  border-left: 4px solid var(--el-color-success);
  border-radius: var(--ra-radius-lg);

  &.is-warning {
    border-left-color: var(--el-color-warning);
  }
}

.lead__eyebrow {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  letter-spacing: 0.06em;
}

.lead__headline {
  margin: 8px 0 0;
  font-size: var(--ra-font-2xl);
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  text-wrap: balance;
}

.lead__detail {
  margin: var(--ra-space-xs) 0 0;
  font-size: var(--ra-font-sm);
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.lead__rule {
  margin: var(--ra-space-md) 0 0;
  font-size: var(--ra-font-2xs);
  color: var(--el-text-color-placeholder);
}

.lead__figures {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: start;

  > * {
    padding: 0 var(--ra-space-lg);
    border-left: 1px solid var(--el-border-color-lighter);
  }
}

.block {
  min-width: 0;
}

.block__head {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--ra-space-md);
  align-items: baseline;
  margin-bottom: var(--ra-space-md);

  h2 {
    margin: 0;
    font-size: var(--ra-font-md);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  span {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: var(--ra-space-xl);
}

.hero__notes {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-md);
  padding-left: var(--ra-space-lg);
  margin: 0;
  border-left: 1px solid var(--el-border-color-lighter);

  dt {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-size: var(--ra-font-xl);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 2px 0 0;
    font-size: var(--ra-font-xs);
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }
}

.ledger__row {
  display: grid;
  grid-template-columns:
    96px minmax(150px, 1.2fr) 110px minmax(150px, 1fr) minmax(220px, 1.6fr)
    96px;
  gap: var(--ra-space-md);
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &--head {
    min-height: 32px;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
    border-bottom-color: var(--el-border-color-lighter);
  }
}

.ledger__volume {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;

  b {
    font-size: var(--ra-font-lg);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.ledger__trend {
  display: flex;
  gap: var(--ra-space-sm);
  align-items: center;
  min-width: 0;
}

.ledger small,
.ledger__muted {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--ra-space-xl);
  padding-top: var(--ra-space-lg);
  border-top: 1px solid var(--el-border-color-lighter);
}

.changes {
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: minmax(96px, 1fr) 96px minmax(0, 1.3fr);
    gap: var(--ra-space-md);
    align-items: center;
    padding: var(--ra-space-sm) 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
  }
}

.changes__name {
  display: flex;
  flex-direction: column;

  small {
    font-size: var(--ra-font-2xs);
    color: var(--el-text-color-secondary);
  }

  strong {
    font-size: var(--ra-font-base);
    color: var(--el-text-color-primary);
  }
}

.changes__range {
  display: flex;
  flex-direction: column;
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);

  b {
    font-size: var(--ra-font-base);
    color: var(--el-text-color-primary);

    &.tone-negative {
      color: var(--el-color-danger);
    }

    &.tone-positive {
      color: var(--el-color-success);
    }
  }
}

.rule,
.muted {
  margin: var(--ra-space-sm) 0 0;
  font-size: var(--ra-font-2xs);
  line-height: 1.6;
  color: var(--el-text-color-placeholder);
}

.muted {
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

@media (width <= 1200px) {
  .lead,
  .split,
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero__notes {
    flex-flow: row wrap;
    padding: var(--ra-space-md) 0 0;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .ledger {
    overflow-x: auto;
  }

  .ledger__row {
    min-width: 860px;
  }
}

@media (width <= 720px) {
  .lead__figures {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--ra-space-lg);

    > * {
      padding: 0;
      border-left: 0;
    }
  }
}
</style>
