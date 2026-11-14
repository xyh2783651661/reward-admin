<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsMailOverview,
  type AnalyticsMailOverview
} from "@/api/analytics";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import AnalyticsSection from "../components/AnalyticsSection.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import MetricCard from "../components/MetricCard.vue";
import ChartCard from "../components/ChartCard.vue";
import DataTable from "../components/DataTable.vue";
import InsightPanel, { type Insight } from "../components/InsightPanel.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { SEMANTIC, cartesianOption, rankingOption } from "../utils/chartTheme";
import {
  failRateTone,
  formatNumber,
  formatPercent,
  successRateTone
} from "../utils/format";

defineOptions({ name: "AnalyticsMail" });

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

const failRate = computed(() => {
  const d = data.value;
  return d && d.totalSent > 0 ? (d.failCount / d.totalSent) * 100 : null;
});

function goFailRecords() {
  router.push({ path: "/log/mail", query: { status: "2" } });
}

const insights = computed<Insight[]>(() => {
  const d = data.value;
  if (!d || failRate.value === null) return [];
  const list: Insight[] = [];
  if (failRate.value > 10) {
    list.push({
      level: failRate.value > 20 ? "critical" : "warning",
      title: "邮件发送失败率偏高",
      evidence: `${scope.value}失败 ${formatNumber(d.failCount)} / ${formatNumber(d.totalSent)} 封，失败率 ${formatPercent(failRate.value)}（阈值 10%）`,
      actionLabel: "查看失败邮件",
      onAction: goFailRecords
    });
  }
  const top = d.failReasons?.[0];
  if (top && d.failCount > 0 && top.count / d.failCount >= 0.5) {
    list.push({
      level: "info",
      title: "失败原因高度集中",
      evidence: `「${top.reason}」占全部失败的 ${formatPercent((top.count / d.failCount) * 100)}（${formatNumber(top.count)} 次），优先处理该原因收益最大`,
      actionLabel: "查看失败邮件",
      onAction: goFailRecords
    });
  }
  return list;
});

const trendOption = computed(() => {
  const t = data.value?.monthlyTrend ?? [];
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
      description="邮件发送量、成功率与失败原因"
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
      <InsightPanel
        :insights="insights"
        rules="失败率 > 10%；单一失败原因占比 ≥ 50%"
        :loading="loading"
      />

      <div class="mail-metrics">
        <MetricCard
          label="发送总量"
          :value="data.totalSent"
          size="hero"
          :caption="scope"
        />
        <MetricCard
          label="成功率"
          :value="data.successRate"
          kind="percent"
          size="hero"
          :tone="successRateTone(data.successRate)"
          :caption="`成功 ${formatNumber(data.successCount)} 封`"
        />
        <MetricCard
          label="失败数"
          :value="data.failCount"
          size="hero"
          :tone="failRateTone(failRate)"
          :caption="`失败率 ${formatPercent(failRate)}`"
          clickable
          @click="goFailRecords"
        />
      </div>

      <AnalyticsSection title="趋势" description="按月统计">
        <ChartCard
          title="月度发送趋势"
          description="成功与失败堆叠为发送总量，折线为成功率"
          :scope="scope"
          :option="trendOption"
          :height="320"
          :empty="!data.monthlyTrend?.length"
          :loading="loading"
          @retry="load"
        />
      </AnalyticsSection>

      <AnalyticsSection title="构成与失败原因">
        <div class="mail-grid">
          <ChartCard
            title="邮件类型分布"
            :scope="scope"
            :option="typeOption"
            :height="Math.max(220, (data.typeStats?.length ?? 0) * 36)"
            :empty="!data.typeStats?.length"
            :loading="loading"
          />
          <ChartCard
            title="失败原因 TOP10"
            description="点击条形查看失败邮件明细"
            :scope="scope"
            :option="failReasonOption"
            :height="Math.max(220, (data.failReasons?.length ?? 0) * 36)"
            :empty="!data.failReasons?.length"
            :loading="loading"
            clickable
            @chart-click="goFailRecords"
          />
        </div>
      </AnalyticsSection>

      <ChartCard
        title="失败原因明细"
        description="完整原因文案，点击行查看失败邮件"
        :scope="scope"
        :empty="!data.failReasons?.length"
      >
        <DataTable
          :data="data.failReasons"
          clickable
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
      </ChartCard>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.mail-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ra-space-md);
}

.mail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--ra-space-md);
}
</style>
