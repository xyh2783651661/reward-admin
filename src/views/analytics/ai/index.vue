<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsAiOverview,
  type AnalyticsAiOverview
} from "@/api/analytics";
import AnalyticsChart from "../components/AnalyticsChart.vue";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import Chapter from "../components/Chapter.vue";
import DataTable from "../components/DataTable.vue";
import FactList from "../components/FactList.vue";
import FindingsSection from "../components/FindingsSection.vue";
import LeadStrip from "../components/LeadStrip.vue";
import RateBar from "../components/RateBar.vue";
import Readout from "../components/Readout.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import {
  PALETTE,
  SEMANTIC,
  cartesianOption,
  rankingOption,
  toneColor,
  tooltipHtml
} from "../utils/chartTheme";
import {
  FAIL_RATE_WARN,
  FINDING_RULES,
  MIN_SAMPLE_AI,
  aiFindings
} from "../utils/findings";
import {
  failRateTone,
  formatDuration,
  formatNumber,
  formatParts,
  formatPercent,
  formatTokens,
  successRateTone
} from "../utils/format";
import { compareHalves, peakIndex, ratioPercent } from "../utils/series";

defineOptions({ name: "AnalyticsAi" });

const router = useRouter();
const range = ref(30);
const scope = computed(() => `近 ${range.value} 天`);

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsAiOverview>(days => getAnalyticsAiOverview(days), {
    range,
    errorLabel: "加载 AI 分析数据失败"
  });

function goCallRecords(query: Record<string, string>) {
  router.push({ path: "/monitor/ai-call-records", query });
}

// ==================== 发现 ====================

const findings = computed(() => {
  const d = data.value;
  if (!d) return [];
  const list = aiFindings(d, scope.value, {
    onModel: model => goCallRecords({ model })
  });
  const slow = d.slowCalls?.length ?? 0;
  if (slow > 0)
    list.push({
      level: "info",
      module: "AI 调用",
      title: `存在 ${slow} 条耗时超过 30 秒的慢调用`,
      evidence: "详见页面底部「明细」中的慢调用 TOP10，可按模型与业务类型定位"
    });

  // 成本相关：单价缺失会让面板金额长期偏低，属于「看着正常其实错」的问题，必须显式提示
  if (!d.priceConfigured)
    list.push({
      level: "warning",
      module: "AI 成本",
      title: "尚未配置模型单价，成本金额全部为 0",
      evidence: `本期消耗 ${formatTokens(d.totalTokens)}，但没有任何启用单价，无法换算金额`
    });
  else if (d.unpricedModels?.length)
    list.push({
      level: "warning",
      module: "AI 成本",
      title: `${d.unpricedModels.length} 个模型未配置单价`,
      evidence: `未配置：${d.unpricedModels.join("、")}；这些调用的成本按 0 计，总额会偏低`
    });

  return list;
});

// ==================== 06 成本 ====================

/** 金额符号：后端只给币种代码，不做汇率换算 */
const currencySymbol = computed(() =>
  data.value?.currency === "USD" ? "$" : "¥"
);

function money(value: number | null | undefined) {
  return `${currencySymbol.value}${formatParts(value ?? 0, "money").main}`;
}

/** 出现多币种时，「总成本」只含主币种，需要额外说明 */
const multiCurrency = computed(
  () => Object.keys(data.value?.costByCurrency ?? {}).length > 1
);

const unpricedCount = computed(() => data.value?.unpricedModels?.length ?? 0);

/** 每日成本趋势：柱=金额，折线=调用量 */
const dailyCostOption = computed(() => {
  const trend = data.value?.dailyTrend ?? [];
  return cartesianOption({
    categories: trend.map(i => i.date),
    series: [
      { name: "成本", data: trend.map(i => i.cost), color: SEMANTIC.primary },
      {
        name: "调用次数",
        type: "line",
        rightAxis: true,
        data: trend.map(i => i.calls),
        color: SEMANTIC.positive
      }
    ],
    leftAxis: { name: `成本（${currencySymbol.value}）` },
    rightAxis: { name: "次", formatter: v => formatNumber(v) },
    tooltipFormatters: {
      成本: v => money(v),
      调用次数: v => `${formatNumber(v)} 次`
    }
  });
});

// ---------- 单价维护入口 ----------

/**
 * 单价维护跳转到独立的「AI 模型单价」页（/ai/model-price）。
 *
 * 这里曾经有个内嵌抽屉，但单价是「供应商 + 模型」二维的，
 * 抽屉里编辑要再复制一套表格；两处编辑入口迟早会不一致，
 * 所以统一收口到管理页，本页只负责展示成本与提示缺口。
 */
function goModelPrice() {
  router.push("/ai/model-price");
}

// ==================== 01 调用趋势 ====================

type TrendMetric = "calls" | "token" | "fallback";
const trendMetric = ref<TrendMetric>("calls");
const TREND_OPTIONS: Array<{ label: string; value: TrendMetric }> = [
  { label: "调用与失败", value: "calls" },
  { label: "Token 与耗时", value: "token" },
  { label: "Fallback", value: "fallback" }
];

const trend = computed(() => data.value?.monthlyTrend ?? []);
const months = computed(() => trend.value.map(i => i.month));

const trendOption = computed(() => {
  const t = trend.value;
  const base = { categories: months.value };
  if (trendMetric.value === "token")
    return cartesianOption({
      ...base,
      series: [
        {
          name: "Token 消耗",
          data: t.map(i => i.totalTokens ?? null),
          color: PALETTE[3]
        },
        {
          name: "平均耗时",
          data: t.map(i => i.avgCostMs),
          type: "line",
          rightAxis: true,
          color: SEMANTIC.warning
        }
      ],
      leftAxis: { formatter: v => formatTokens(v) },
      rightAxis: { formatter: v => formatDuration(v) },
      tooltipFormatters: {
        "Token 消耗": v => formatTokens(v),
        平均耗时: v => formatDuration(v)
      }
    });
  if (trendMetric.value === "fallback")
    return cartesianOption({
      ...base,
      series: [
        {
          name: "Fallback 次数",
          data: t.map(i => i.fallbackCount ?? null),
          color: PALETTE[2]
        },
        {
          name: "Fallback 触发率",
          data: t.map(i => i.fallbackRate ?? null),
          type: "line",
          rightAxis: true,
          color: SEMANTIC.negative
        }
      ],
      leftAxis: { formatter: v => formatNumber(v) },
      rightAxis: { formatter: v => `${v}%`, min: 0 },
      tooltipFormatters: {
        "Fallback 次数": v => `${formatNumber(v)} 次`,
        "Fallback 触发率": v => formatPercent(v)
      }
    });
  const option = cartesianOption({
    ...base,
    series: [
      {
        name: "成功",
        data: t.map(i => i.success),
        stack: "calls",
        color: SEMANTIC.positive
      },
      {
        name: "失败",
        data: t.map(i => i.fail),
        stack: "calls",
        color: SEMANTIC.negative
      },
      {
        name: "失败率",
        data: t.map(i => (i.total > 0 ? i.failRate : null)),
        type: "line",
        rightAxis: true,
        color: SEMANTIC.warning
      }
    ],
    leftAxis: { formatter: v => formatNumber(v) },
    rightAxis: { formatter: v => `${v}%`, min: 0 },
    tooltipFormatters: {
      成功: v => `${formatNumber(v)} 次`,
      失败: v => `${formatNumber(v)} 次`,
      失败率: v => formatPercent(v)
    }
  });
  const line = (option.series as any[])[2];
  line.markLine = {
    silent: true,
    symbol: "none",
    data: [{ yAxis: FAIL_RATE_WARN }],
    lineStyle: {
      type: "dashed",
      color: SEMANTIC.negative,
      width: 1,
      opacity: 0.6
    },
    label: {
      position: "insideEndTop",
      color: "@text-secondary",
      fontSize: 11,
      formatter: `关注线 ${FAIL_RATE_WARN}%`
    }
  };
  return option;
});

const trendFacts = computed(() => {
  const t = trend.value;
  const facts: Array<{ label: string; value: string; hint: string }> = [];
  if (!t.length) return facts;
  const pk = peakIndex(t.map(i => i.total));
  if (pk >= 0)
    facts.push({
      label: "调用最多的时段",
      value: t[pk].month,
      hint: `${formatNumber(t[pk].total)} 次调用`
    });
  const worst = peakIndex(
    t.map(i => i.failRate),
    i => t[i].total >= MIN_SAMPLE_AI / 2
  );
  if (worst >= 0)
    facts.push({
      label: "失败率最高的时段",
      value: formatPercent(t[worst].failRate),
      hint: `${t[worst].month}，${formatNumber(t[worst].fail)} / ${formatNumber(t[worst].total)} 次`
    });
  const cmp = compareHalves(t.map(i => (i.total > 0 ? i.failRate : null)));
  if (cmp)
    facts.push({
      label: "失败率前后半段",
      value: `${cmp.diff > 0 ? "+" : ""}${cmp.diff.toFixed(1)} 个百分点`,
      hint: `${formatPercent(cmp.first)} → ${formatPercent(cmp.second)}`
    });
  return facts;
});

// ==================== 02 模型 ====================

const selectedModel = ref<string | null>(null);

const models = computed(() =>
  [...(data.value?.modelStats ?? [])].sort((a, b) => b.total - a.total)
);
const selected = computed(
  () => models.value.find(m => m.model === selectedModel.value) ?? null
);

function toggleModel(model: string | undefined) {
  if (!model) return;
  selectedModel.value = selectedModel.value === model ? null : model;
}

const scatterOption = computed(() => {
  const list = models.value.filter(m => m.total > 0);
  const maxTotal = Math.max(...list.map(m => m.total), 1);
  return {
    grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        const m = p.data.stat;
        return tooltipHtml(
          m.model,
          [
            { label: "调用次数", value: formatNumber(m.total) },
            {
              label: "失败率",
              value: formatPercent(m.failRate),
              color: toneColor(failRateTone(m.failRate))
            },
            { label: "平均耗时", value: formatDuration(m.avgCostMs) },
            { label: "Token", value: formatTokens(m.totalTokens) }
          ],
          "点击查看该模型详情"
        );
      }
    },
    xAxis: {
      type: "value",
      name: "平均耗时",
      nameLocation: "middle",
      nameGap: 28,
      axisLabel: { formatter: (v: number) => formatDuration(v) }
    },
    yAxis: {
      type: "value",
      name: "失败率",
      min: 0,
      axisLabel: { formatter: (v: number) => `${v}%` }
    },
    series: [
      {
        type: "scatter",
        data: list.map(m => ({
          value: [m.avgCostMs, m.failRate],
          stat: m,
          symbolSize: 12 + Math.sqrt(m.total / maxTotal) * 34,
          itemStyle: {
            color: toneColor(failRateTone(m.failRate)),
            opacity:
              selectedModel.value && selectedModel.value !== m.model
                ? 0.3
                : 0.8,
            borderColor:
              selectedModel.value === m.model ? "@text-primary" : "transparent",
            borderWidth: 2
          },
          name: m.model
        })),
        label: {
          show: true,
          position: "top",
          fontSize: 11,
          color: "@text-secondary",
          formatter: (p: any) => p.data.name
        },
        markLine: {
          silent: true,
          symbol: "none",
          data: [{ yAxis: FAIL_RATE_WARN }],
          lineStyle: {
            type: "dashed",
            color: SEMANTIC.negative,
            width: 1,
            opacity: 0.6
          },
          label: { show: false }
        }
      }
    ]
  };
});

function onScatterClick(p: any) {
  toggleModel(p?.data?.name);
}

function modelRowClass({ row }: { row: { model: string } }) {
  return row.model === selectedModel.value ? "is-selected-row" : "";
}

// ==================== 03 业务类型 ====================

const bizTypes = computed(() => data.value?.bizTypeStats ?? []);

const bizVolumeOption = computed(() =>
  rankingOption({
    items: bizTypes.value.slice(0, 10).map(b => ({
      name: b.bizType,
      value: b.count,
      color: PALETTE[0],
      note: `占比 ${formatPercent(b.percentage)}，平均耗时 ${formatDuration(b.avgCostMs)}，${formatTokens(b.totalTokens)} Token`
    })),
    valueName: "调用次数",
    format: v => formatNumber(v)
  })
);

const bizFailItems = computed(() =>
  bizTypes.value
    .filter(b => b.count >= MIN_SAMPLE_AI)
    .map(b => ({ b, rate: ratioPercent(b.failCount, b.count) ?? 0 }))
    .filter(i => i.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
);

const bizFailOption = computed(() =>
  rankingOption({
    items: bizFailItems.value.map(({ b, rate }) => ({
      name: b.bizType,
      value: rate,
      color: toneColor(failRateTone(rate)),
      note: `失败 ${formatNumber(b.failCount)} / 调用 ${formatNumber(b.count)} 次`
    })),
    valueName: "失败率",
    format: v => formatPercent(v),
    min: 0
  })
);

const findingRules = FINDING_RULES.ai;

const lead = computed(() => {
  const d = data.value;
  if (!d) return null;
  return {
    failTone: failRateTone(d.failRate),
    successSpark: trend.value.map(i => (i.total > 0 ? 100 - i.failRate : null)),
    callSpark: trend.value.map(i => i.total),
    costSpark: trend.value.map(i => (i.total > 0 ? i.avgCostMs : null)),
    tokenSpark: trend.value.map(i => i.totalTokens ?? null),
    fallbackSpark: trend.value.map(i => i.fallbackRate ?? null)
  };
});
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="AI 调用分析"
      description="调用是否稳定、哪些模型与业务需要关注、供应商与回退是否可靠"
      :loading="loading"
      @refresh="load"
    />
    <StatsMetaLine :meta="meta" />
    <AnalyticsState
      :loading="loading"
      :error="error"
      :has-data="!!data"
      @retry="load"
    />

    <template v-if="data && lead">
      <LeadStrip>
        <Readout
          size="lead"
          label="调用次数"
          :value="data.totalCalls"
          :spark="lead.callSpark"
          :caption="`成功 ${formatNumber(data.successCount)} · 失败 ${formatNumber(data.failCount)}`"
        />
        <Readout
          size="lead"
          label="成功率"
          kind="percent"
          :value="data.successRate"
          :tone="successRateTone(data.successRate)"
          :spark="lead.successSpark"
          :caption="`失败率 ${formatPercent(data.failRate)}`"
        />
        <Readout
          size="lead"
          label="平均耗时"
          kind="duration"
          :value="data.avgCostMs"
          :spark="lead.costSpark"
        />
        <Readout
          size="lead"
          label="Token 消耗"
          kind="tokens"
          :value="data.totalTokens"
          :spark="lead.tokenSpark"
        />
        <Readout
          size="lead"
          label="成本（估算）"
          kind="money"
          :value="data.totalCost ?? 0"
          :caption="`${data.currency ?? 'CNY'} · 按当前单价估算`"
          hint="成本 = prompt token × 输入单价 + response token × 输出单价（单价按每百万 token 报价）；不是供应商账单实付金额"
        />
        <Readout
          size="lead"
          label="Fallback 触发率"
          kind="percent"
          :value="data.fallbackRate"
          :tone="data.fallbackRate > 20 ? 'warning' : 'neutral'"
          :spark="lead.fallbackSpark"
          :caption="`${formatNumber(data.fallbackTriggered)} 次触发，最终成功率 ${formatPercent(data.fallbackSuccessRate)}`"
          hint="触发过回退的调用占总调用的比例；最终成功率为回退后成功的比例"
        />
      </LeadStrip>

      <FindingsSection :items="findings" :rules="findingRules" />

      <Chapter index="01" question="调用量与失败率在如何变化？">
        <template #facts>
          <FactList :items="trendFacts" />
        </template>
        <div class="chart-bar">
          <el-radio-group
            v-model="trendMetric"
            size="small"
            aria-label="趋势指标"
          >
            <el-radio-button
              v-for="o in TREND_OPTIONS"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </el-radio-button>
          </el-radio-group>
          <span>按月统计 · 虚线为 {{ FAIL_RATE_WARN }}% 关注线</span>
        </div>
        <AnalyticsChart
          :option="trendOption"
          :height="300"
          label="AI 调用月度趋势"
        />
      </Chapter>

      <Chapter index="02" question="哪些模型值得关注？">
        <template #facts>
          <FactList
            note="横轴是平均耗时，纵轴是失败率，气泡越大调用越多。越靠右上越需要关注；点击气泡或表格行查看详情。"
          />
        </template>
        <div class="models">
          <AnalyticsChart
            :option="scatterOption"
            :height="320"
            clickable
            label="模型失败率与平均耗时散点图"
            @chart-click="onScatterClick"
          />
          <aside class="models__detail" aria-live="polite">
            <template v-if="selected">
              <h3>{{ selected.model }}</h3>
              <dl>
                <div>
                  <dt>调用次数</dt>
                  <dd>{{ formatNumber(selected.total) }}</dd>
                </div>
                <div>
                  <dt>失败次数</dt>
                  <dd>{{ formatNumber(selected.fail) }}</dd>
                </div>
                <div>
                  <dt>失败率</dt>
                  <dd>{{ formatPercent(selected.failRate) }}</dd>
                </div>
                <div>
                  <dt>平均耗时</dt>
                  <dd>{{ formatDuration(selected.avgCostMs) }}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{{ formatTokens(selected.totalTokens) }}</dd>
                </div>
                <div>
                  <dt>使用 Fallback</dt>
                  <dd>{{ formatNumber(selected.fallbackUsed) }} 次</dd>
                </div>
              </dl>
              <el-button
                type="primary"
                size="small"
                @click="goCallRecords({ model: selected.model })"
              >
                查看调用记录
              </el-button>
            </template>
            <p v-else class="models__hint">
              选择一个模型，在这里查看它的完整数据。
            </p>
          </aside>
        </div>
        <DataTable
          :data="models"
          clickable
          :row-class-name="modelRowClass"
          @row-click="(row: any) => toggleModel(row.model)"
        >
          <el-table-column prop="model" label="模型" min-width="160" />
          <el-table-column
            label="调用次数"
            width="110"
            align="right"
            sortable
            prop="total"
          >
            <template #default="{ row }">{{
              formatNumber(row.total)
            }}</template>
          </el-table-column>
          <el-table-column label="失败率" width="190" sortable prop="failRate">
            <template #default="{ row }">
              <RateBar
                :value="row.failRate"
                :tone="failRateTone(row.failRate)"
              />
            </template>
          </el-table-column>
          <el-table-column
            label="平均耗时"
            width="110"
            align="right"
            sortable
            prop="avgCostMs"
          >
            <template #default="{ row }">{{
              formatDuration(row.avgCostMs)
            }}</template>
          </el-table-column>
          <el-table-column
            label="Token"
            width="110"
            align="right"
            sortable
            prop="totalTokens"
          >
            <template #default="{ row }">{{
              formatTokens(row.totalTokens)
            }}</template>
          </el-table-column>
          <el-table-column
            label="Fallback"
            width="100"
            align="right"
            prop="fallbackUsed"
          >
            <template #default="{ row }">{{
              formatNumber(row.fallbackUsed)
            }}</template>
          </el-table-column>
        </DataTable>
      </Chapter>

      <Chapter index="03" question="哪些业务在调用，哪些业务容易失败？">
        <template #facts>
          <FactList
            :note="`左图看调用量，右图看失败率（仅统计调用 ≥ ${MIN_SAMPLE_AI} 次且有失败的业务）。点击条形查看调用记录。`"
          />
        </template>
        <div class="pair">
          <div>
            <h3 class="pair__title">调用量 TOP10</h3>
            <AnalyticsChart
              :option="bizVolumeOption"
              :height="Math.max(200, Math.min(10, bizTypes.length) * 30 + 16)"
              clickable
              label="业务类型调用量排行"
              @chart-click="p => p?.name && goCallRecords({ bizType: p.name })"
            />
          </div>
          <div>
            <h3 class="pair__title">失败率 TOP10</h3>
            <AnalyticsChart
              v-if="bizFailItems.length"
              :option="bizFailOption"
              :height="Math.max(200, bizFailItems.length * 30 + 16)"
              clickable
              label="业务类型失败率排行"
              @chart-click="p => p?.name && goCallRecords({ bizType: p.name })"
            />
            <p v-else class="pair__empty">
              没有满足样本要求且存在失败的业务类型。
            </p>
          </div>
        </div>
      </Chapter>

      <Chapter index="04" question="供应商与回退是否可靠？">
        <template #facts>
          <FactList
            note="健康状态来自供应商探测，实际失败率来自真实调用；两者不一致说明探测没有反映真实情况。"
          />
        </template>
        <h3 class="pair__title">供应商健康 vs 实际失败率</h3>
        <DataTable :data="data.providerHealthCompare">
          <el-table-column prop="provider" label="供应商" min-width="140" />
          <el-table-column label="健康状态" width="120">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.healthStatus === 'UP'
                    ? 'success'
                    : row.healthStatus === 'SUSPENDED'
                      ? 'danger'
                      : 'warning'
                "
                size="small"
              >
                {{ row.healthStatus }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="healthReason"
            label="原因"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="actualSuccess"
            label="实际成功"
            width="100"
            align="right"
          />
          <el-table-column
            prop="actualFail"
            label="实际失败"
            width="100"
            align="right"
          />
          <el-table-column label="实际失败率" width="180">
            <template #default="{ row }">
              <RateBar
                :value="row.actualFailRate"
                :tone="failRateTone(row.actualFailRate)"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态一致性" width="110">
            <template #default="{ row }">
              <el-tag :type="row.mismatch ? 'danger' : 'success'" size="small">
                {{ row.mismatch ? "不匹配" : "匹配" }}
              </el-tag>
            </template>
          </el-table-column>
        </DataTable>

        <template v-if="data.fallbackPatterns?.length">
          <h3 class="pair__title pair__title--spaced">Fallback 回退链路模式</h3>
          <DataTable :data="data.fallbackPatterns">
            <el-table-column prop="pattern" label="回退链路" min-width="260" />
            <el-table-column
              prop="count"
              label="触发次数"
              width="110"
              align="right"
            />
            <el-table-column
              prop="successCount"
              label="最终成功"
              width="110"
              align="right"
            />
            <el-table-column label="成功率" width="180">
              <template #default="{ row }">
                <RateBar
                  :value="row.successRate"
                  :tone="successRateTone(row.successRate)"
                />
              </template>
            </el-table-column>
          </DataTable>
        </template>
      </Chapter>

      <Chapter index="05" question="明细：最近的回退与慢调用">
        <el-collapse>
          <el-collapse-item
            v-if="data.fallbackChains?.length"
            title="Fallback 明细（最近 20 条多供应商回退）"
            name="chains"
          >
            <DataTable :data="data.fallbackChains">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="model" label="最终模型" min-width="140" />
              <el-table-column
                prop="fallbackTried"
                label="尝试链路"
                min-width="220"
                show-overflow-tooltip
              />
              <el-table-column
                prop="attemptCount"
                label="尝试次数"
                width="100"
                align="right"
              />
              <el-table-column label="最终状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="耗时" width="100" align="right">
                <template #default="{ row }">{{
                  formatDuration(row.costTimeMs)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="bizType"
                label="业务类型"
                min-width="140"
              />
              <el-table-column
                prop="createdTime"
                label="时间"
                min-width="160"
              />
            </DataTable>
          </el-collapse-item>
          <el-collapse-item
            v-if="data.slowCalls?.length"
            title="慢调用 TOP10（耗时 > 30 秒）"
            name="slow"
          >
            <DataTable :data="data.slowCalls">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="model" label="模型" min-width="140" />
              <el-table-column
                prop="biz_type"
                label="业务类型"
                min-width="140"
              />
              <el-table-column prop="STATUS" label="状态" width="100" />
              <el-table-column label="耗时" width="100" align="right">
                <template #default="{ row }">{{
                  formatDuration(row.cost_time_ms)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="created_time"
                label="时间"
                min-width="160"
              />
            </DataTable>
          </el-collapse-item>
        </el-collapse>
        <p
          v-if="!data.fallbackChains?.length && !data.slowCalls?.length"
          class="pair__empty"
        >
          当前周期没有多供应商回退，也没有超过 30 秒的慢调用。
        </p>
      </Chapter>

      <Chapter index="06" question="这段时间在 AI 上花了多少钱？">
        <template #facts>
          <dl class="facts">
            <div>
              <dt>总成本</dt>
              <dd>{{ money(data.totalCost) }}</dd>
              <p>按当前配置单价估算，不是账单实付</p>
            </div>
            <div>
              <dt>计价币种</dt>
              <dd>{{ data.currency ?? "CNY" }}</dd>
              <p>
                {{
                  multiCurrency
                    ? "存在多币种，本页不做汇率换算，仅汇总主币种"
                    : "全表统一币种"
                }}
              </p>
            </div>
            <div>
              <dt>未配单价模型</dt>
              <dd>{{ unpricedCount }}</dd>
              <p>
                {{
                  unpricedCount
                    ? data.unpricedModels?.join("、")
                    : "所有出现过的模型都已配置单价"
                }}
              </p>
            </div>
          </dl>
        </template>

        <el-alert
          v-if="!data.priceConfigured"
          type="warning"
          show-icon
          :closable="false"
          class="cost-alert"
          title="尚未配置模型单价，成本金额全部为 0"
        >
          <template #default>
            成本是按「单价 × token」算出来的，没有单价就只能看消耗量。
            <el-button type="primary" link @click="goModelPrice">
              立即配置
            </el-button>
          </template>
        </el-alert>

        <div class="cost-toolbar">
          <span class="cost-toolbar__note">
            资产口径：调用量按天汇总；成本按「实际服务模型」计价（actual_model →
            remote_model → model）
          </span>
          <el-button type="primary" plain @click="goModelPrice">
            配置单价
          </el-button>
        </div>

        <AnalyticsChart
          :option="dailyCostOption"
          :height="300"
          label="每日成本与调用量趋势"
        />

        <DataTable :data="data.modelCostStats ?? []">
          <el-table-column label="供应商" width="150">
            <template #default="{ row }">
              <span v-if="row.provider">{{ row.provider }}</span>
              <el-tag v-else size="small" type="info">全局</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="model"
            label="模型"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column
            prop="calls"
            label="调用次数"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              {{ formatNumber(row.calls) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="promptTokens"
            label="输入 Token"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              {{ formatTokens(row.promptTokens) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="responseTokens"
            label="输出 Token"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              {{ formatTokens(row.responseTokens) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="cost"
            label="成本（估算）"
            width="150"
            align="right"
          >
            <template #default="{ row }">
              {{ money(row.cost) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="priced"
            label="单价"
            width="110"
            align="center"
          >
            <template #default="{ row }">
              <el-tag :type="row.priced ? 'success' : 'warning'" size="small">
                {{ row.priced ? "已配置" : "未配置" }}
              </el-tag>
            </template>
          </el-table-column>
        </DataTable>
        <p v-if="!data.modelCostStats?.length" class="pair__empty">
          当前周期没有 AI 调用记录。
        </p>
      </Chapter>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.cost-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 12px;
}

.cost-toolbar__note {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.cost-alert {
  margin-bottom: 12px;
}

.ai-lead {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  padding: var(--ra-space-lg) 0;

  > * {
    padding: 0 var(--ra-space-lg);
    border-left: 1px solid var(--el-border-color-lighter);

    &:first-child {
      padding-left: 0;
      border-left: 0;
    }
  }
}

.ai-findings {
  padding: var(--ra-space-lg);
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-lg);

  h2 {
    margin: 0 0 var(--ra-space-sm);
    font-size: var(--ra-font-md);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.facts {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-md);
  margin: var(--ra-space-md) 0 0;

  dt {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-size: var(--ra-font-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 2px 0 0;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }
}

.facts-note {
  margin: var(--ra-space-sm) 0 0;
  font-size: var(--ra-font-xs);
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.chart-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ra-space-sm) var(--ra-space-md);
  align-items: center;
  margin-bottom: var(--ra-space-sm);
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.models {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: var(--ra-space-xl);
  margin-bottom: var(--ra-space-lg);
}

.models__detail {
  padding-left: var(--ra-space-lg);
  border-left: 1px solid var(--el-border-color-lighter);

  h3 {
    margin: 0 0 var(--ra-space-sm);
    font-size: var(--ra-font-md);
    color: var(--el-text-color-primary);
    word-break: break-all;
  }

  dl {
    margin: 0 0 var(--ra-space-md);
  }

  dl > div {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: var(--ra-font-sm);
    border-bottom: 1px solid var(--el-border-color-extra-light);
  }

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }
}

.models__hint,
.pair__empty {
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ra-space-xl);
}

.pair__title {
  margin: 0 0 var(--ra-space-sm);
  font-size: var(--ra-font-base);
  font-weight: 600;
  color: var(--el-text-color-primary);

  &--spaced {
    margin-top: var(--ra-space-xl);
  }
}

:deep(.is-selected-row > td) {
  background: var(--el-color-primary-light-9) !important;
}

@media (width <= 1100px) {
  .models,
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .models__detail {
    padding: var(--ra-space-md) 0 0;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }
}
</style>
