<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsMailOverview,
  type AnalyticsMailOverview
} from "@/api/analytics";
import AnalyticsChart from "../components/AnalyticsChart.vue";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import Chapter from "../components/Chapter.vue";
import DataTable from "../components/DataTable.vue";
import FactList, { type Fact } from "../components/FactList.vue";
import type { Finding } from "../components/FindingList.vue";
import FindingsSection from "../components/FindingsSection.vue";
import LeadStrip from "../components/LeadStrip.vue";
import Readout from "../components/Readout.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { SEMANTIC, cartesianOption, rankingOption } from "../utils/chartTheme";
import {
  failRateTone,
  formatNumber,
  formatPercent,
  successRateTone
} from "../utils/format";
import { compareHalves, peakIndex, troughIndex } from "../utils/series";

defineOptions({ name: "AnalyticsMail" });

const FAIL_RATE_WARN = 10;
const FAIL_RATE_CRITICAL = 20;
const REASON_CONCENTRATION = 50;

const router = useRouter();
const range = ref(90);
const rangeOptions = [
  { label: "近 30 天", value: 30 },
  { label: "近 90 天", value: 90 },
  { label: "近 180 天", value: 180 }
];
const scope = computed(() => `近 ${range.value} 天`);

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsMailOverview>(
    days => getAnalyticsMailOverview(days),
    { range, errorLabel: "加载邮件分析数据失败" }
  );

const trend = computed(() => data.value?.monthlyTrend ?? []);

const failRate = computed(() => {
  const d = data.value;
  return d && d.totalSent > 0 ? (d.failCount / d.totalSent) * 100 : null;
});

const lead = computed(() => ({
  totalSpark: trend.value.map(i => i.total),
  successSpark: trend.value.map(i => (i.total > 0 ? i.successRate : null)),
  failSpark: trend.value.map(i => i.fail)
}));

function goFailRecords() {
  router.push({ path: "/log/mail", query: { status: "2" } });
}

const findingRules = `失败率 > ${FAIL_RATE_WARN}%（> ${FAIL_RATE_CRITICAL}% 为严重）；单一失败原因占全部失败 ≥ ${REASON_CONCENTRATION}%`;

const findings = computed<Finding[]>(() => {
  const d = data.value;
  if (!d || failRate.value === null) return [];
  const list: Finding[] = [];
  if (failRate.value > FAIL_RATE_WARN) {
    list.push({
      level: failRate.value > FAIL_RATE_CRITICAL ? "critical" : "warning",
      module: "邮件",
      title: "邮件发送失败率偏高",
      evidence: `${scope.value}失败 ${formatNumber(d.failCount)} / ${formatNumber(d.totalSent)} 封，失败率 ${formatPercent(failRate.value)}（阈值 ${FAIL_RATE_WARN}%）`,
      actionLabel: "查看失败邮件",
      onAction: goFailRecords
    });
  }
  const top = d.failReasons?.[0];
  if (
    top &&
    d.failCount > 0 &&
    (top.count / d.failCount) * 100 >= REASON_CONCENTRATION
  ) {
    list.push({
      level: "info",
      module: "邮件",
      title: "失败原因高度集中",
      evidence: `「${top.reason}」占全部失败的 ${formatPercent((top.count / d.failCount) * 100)}（${formatNumber(top.count)} 次，阈值 ${REASON_CONCENTRATION}%），优先处理该原因收益最大`,
      actionLabel: "查看失败邮件",
      onAction: goFailRecords
    });
  }
  return list;
});

const trendFacts = computed<Fact[]>(() => {
  const t = trend.value;
  const facts: Fact[] = [];
  if (!t.length) return facts;
  const pk = peakIndex(t.map(i => i.total));
  if (pk >= 0)
    facts.push({
      label: "发送最多的月份",
      value: t[pk].month,
      hint: `${formatNumber(t[pk].total)} 封`
    });
  const rates = t.map(i => (i.total > 0 ? i.successRate : null));
  const low = troughIndex(rates);
  if (low >= 0)
    facts.push({
      label: "成功率最低的月份",
      value: formatPercent(t[low].successRate),
      hint: `${t[low].month}，失败 ${formatNumber(t[low].fail)} / ${formatNumber(t[low].total)} 封`
    });
  const cmp = compareHalves(rates);
  if (cmp)
    facts.push({
      label: "成功率前后半段对比",
      value: `${cmp.diff >= 0 ? "+" : ""}${formatNumber(cmp.diff, 1)} 个百分点`,
      hint: `${formatPercent(cmp.first)} → ${formatPercent(cmp.second)}`
    });
  return facts;
});

const reasonFacts = computed<Fact[]>(() => {
  const d = data.value;
  const facts: Fact[] = [];
  if (!d) return facts;
  const topType = d.typeStats?.[0];
  if (topType)
    facts.push({
      label: "占比最高的邮件类型",
      value: formatPercent(topType.percentage),
      hint: `${topType.type}，${formatNumber(topType.count)} 封`
    });
  const top = d.failReasons?.[0];
  if (top && d.failCount > 0)
    facts.push({
      label: "最主要的失败原因",
      value: formatPercent((top.count / d.failCount) * 100),
      hint: `${top.reason}（${formatNumber(top.count)} 次）`
    });
  return facts;
});

const trendOption = computed(() => {
  const t = trend.value;
  return cartesianOption({
    categories: t.map(i => i.month),
    series: [
      {
        name: "成功",
        stack: "mail",
        data: t.map(i => i.success),
        color: SEMANTIC.positive
      },
      {
        name: "失败",
        stack: "mail",
        data: t.map(i => i.fail),
        color: SEMANTIC.negative
      },
      {
        name: "成功率",
        type: "line",
        rightAxis: true,
        data: t.map(i => i.successRate),
        color: SEMANTIC.primary
      }
    ],
    leftAxis: { name: "封" },
    rightAxis: { name: "成功率", max: 100, formatter: v => `${v}%` },
    tooltipFormatters: {
      成功: v => `${formatNumber(v)} 封`,
      失败: v => `${formatNumber(v)} 封`,
      成功率: v => formatPercent(v)
    }
  });
});

const typeOption = computed(() =>
  rankingOption({
    items: (data.value?.typeStats ?? []).map(i => ({
      name: i.type,
      value: i.count,
      label: `${formatNumber(i.count)} · ${formatPercent(i.percentage)}`
    })),
    valueName: "发送数量",
    format: v => formatNumber(v)
  })
);

const failReasonOption = computed(() =>
  rankingOption({
    items: (data.value?.failReasons ?? []).map(i => ({
      name: i.reason,
      value: i.count,
      color: SEMANTIC.negative,
      note: "点击进入失败邮件明细"
    })),
    valueName: "失败次数",
    format: v => formatNumber(v),
    labelWidth: 200
  })
);
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="邮件分析"
      description="发送是否稳定，失败集中在哪些原因"
      :range-options="rangeOptions"
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

    <template v-if="data">
      <LeadStrip>
        <Readout
          size="lead"
          label="发送总量"
          :value="data.totalSent"
          :spark="lead.totalSpark"
          :caption="scope"
        />
        <Readout
          size="lead"
          label="成功率"
          kind="percent"
          :value="data.successRate"
          :tone="successRateTone(data.successRate)"
          :spark="lead.successSpark"
          :caption="`成功 ${formatNumber(data.successCount)} 封`"
        />
        <Readout
          size="lead"
          label="失败数"
          :value="data.failCount"
          :tone="failRateTone(failRate)"
          :spark="lead.failSpark"
          :caption="`失败率 ${formatPercent(failRate)}`"
        />
      </LeadStrip>

      <FindingsSection :items="findings" :rules="findingRules" />

      <Chapter index="01" question="发送是否稳定？">
        <template #facts>
          <FactList :items="trendFacts" />
        </template>
        <p class="chart-note">
          按月统计：成功与失败堆叠为发送总量，折线为成功率
        </p>
        <AnalyticsChart
          v-if="trend.length"
          :option="trendOption"
          :height="320"
          label="邮件月度发送趋势"
        />
        <p v-else class="empty">当前周期没有邮件发送记录。</p>
      </Chapter>

      <Chapter index="02" question="失败集中在哪些原因与类型？">
        <template #facts>
          <FactList :items="reasonFacts" />
        </template>
        <div class="pair">
          <div>
            <h3 class="pair__title">邮件类型分布</h3>
            <AnalyticsChart
              v-if="data.typeStats?.length"
              :option="typeOption"
              :height="Math.max(220, data.typeStats.length * 36)"
              label="邮件类型发送量排行"
            />
            <p v-else class="empty">没有邮件类型数据。</p>
          </div>
          <div>
            <h3 class="pair__title">失败原因 TOP10（点击查看失败邮件）</h3>
            <AnalyticsChart
              v-if="data.failReasons?.length"
              :option="failReasonOption"
              :height="Math.max(220, data.failReasons.length * 36)"
              clickable
              label="邮件失败原因排行"
              @chart-click="goFailRecords"
            />
            <p v-else class="empty">当前周期没有邮件发送失败。</p>
          </div>
        </div>
      </Chapter>

      <Chapter index="03" question="明细：完整失败原因">
        <DataTable
          :data="data.failReasons"
          clickable
          empty-text="当前周期没有邮件发送失败"
          @row-click="goFailRecords"
        >
          <el-table-column
            prop="reason"
            label="失败原因"
            min-width="320"
            show-overflow-tooltip
          />
          <el-table-column
            prop="count"
            label="次数"
            width="100"
            align="right"
          />
        </DataTable>
      </Chapter>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
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
}

.chart-note,
.empty {
  margin: 0 0 var(--ra-space-sm);
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.empty {
  font-size: var(--ra-font-sm);
}

@media (width <= 1100px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
