<script setup lang="ts">
import { computed } from "vue";
import {
  getAnalyticsRewardOverview,
  type AnalyticsRewardOverview
} from "@/api/analytics";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import AnalyticsSection from "../components/AnalyticsSection.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import MetricCard from "../components/MetricCard.vue";
import ChartCard from "../components/ChartCard.vue";
import DataTable from "../components/DataTable.vue";
import RateBar from "../components/RateBar.vue";
import InsightPanel, { type Insight } from "../components/InsightPanel.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { SEMANTIC, cartesianOption, rankingOption } from "../utils/chartTheme";
import { formatNumber, formatPercent, successRateTone } from "../utils/format";

defineOptions({ name: "AnalyticsReward" });

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsRewardOverview>(
    () => getAnalyticsRewardOverview(),
    { errorLabel: "加载成绩分析数据失败" }
  );

const insights = computed<Insight[]>(() => {
  const d = data.value;
  if (!d) return [];
  const list: Insight[] = [];
  const behind = [...(d.targetGapStats ?? [])]
    .filter(s => s.avgGap < 0)
    .sort((a, b) => a.avgGap - b.avgGap);
  for (const s of behind.slice(0, 3)) {
    list.push({
      level: s.achievementRate < 50 ? "critical" : "warning",
      title: `${s.subjectName} 平均分低于目标`,
      evidence: `平均 ${formatNumber(s.avgScore, 1)} 分，目标 ${formatNumber(s.avgTarget, 1)} 分，差 ${formatNumber(Math.abs(s.avgGap), 1)} 分；达标 ${s.aboveCount} 次 / 未达标 ${s.belowCount} 次（达标率 ${formatPercent(s.achievementRate)}）`
    });
  }
  const trend = d.rankTrend ?? [];
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (last.rankValue > prev.rankValue) {
      list.push({
        level: "info",
        title: "最近一次考试排名下降",
        evidence: `${prev.examName} 第 ${prev.rankValue} 名 → ${last.examName} 第 ${last.rankValue} 名（下降 ${last.rankValue - prev.rankValue} 名）`
      });
    }
  }
  return list;
});

const subjectRateOption = computed(() =>
  rankingOption({
    items: (data.value?.subjectStats ?? []).map(s => ({
      name: s.subjectName,
      value: s.avgScoreRate,
      note: `平均 ${formatNumber(s.avgScore, 1)} 分 · 最低 ${s.minScore} · 最高 ${s.maxScore} · 共 ${s.count} 次考试`
    })),
    valueName: "平均得分率",
    format: v => formatPercent(v),
    max: 100
  })
);

const gapOption = computed(() =>
  rankingOption({
    items: (data.value?.targetGapStats ?? []).map(s => ({
      name: s.subjectName,
      value: s.avgGap,
      color: s.avgGap >= 0 ? SEMANTIC.positive : SEMANTIC.negative,
      label: `${s.avgGap > 0 ? "+" : ""}${formatNumber(s.avgGap, 1)}`,
      note: `平均 ${formatNumber(s.avgScore, 1)} 分，目标 ${formatNumber(s.avgTarget, 1)} 分，达标率 ${formatPercent(s.achievementRate)}`
    })),
    valueName: "平均分差",
    format: v => `${v > 0 ? "+" : ""}${formatNumber(v, 1)}`
  })
);

const scoreTrendOption = computed(() => {
  const t = data.value?.scoreTrend ?? [];
  return cartesianOption({
    categories: t.map(i => i.examDate),
    series: [
      {
        name: "奖励金额",
        data: t.map(i => i.totalReward),
        color: SEMANTIC.muted
      },
      {
        name: "得分率",
        type: "line",
        rightAxis: true,
        data: t.map(i => i.scoreRate),
        color: SEMANTIC.primary
      }
    ],
    leftAxis: { name: "奖励" },
    rightAxis: { name: "得分率", formatter: v => `${v}%` },
    tooltipFormatters: {
      奖励金额: v => formatNumber(v, 2),
      得分率: v => formatPercent(v)
    },
    tooltipNote: i => {
      const item = t[i ?? -1];
      return item
        ? `${item.examName} · 总分 ${item.totalScore} / ${item.totalFullScore}`
        : undefined;
    },
    xLabel: { rotate: t.length > 8 ? 30 : 0 }
  });
});

const rankOption = computed(() => {
  const t = data.value?.rankTrend ?? [];
  const option = cartesianOption({
    categories: t.map(i => i.examDate),
    series: [
      {
        name: "总分排名",
        type: "line",
        data: t.map(i => i.rankValue),
        color: SEMANTIC.primary
      }
    ],
    tooltipFormatters: { 总分排名: v => `第 ${v} 名` },
    tooltipNote: i => t[i ?? -1]?.examName,
    xLabel: { rotate: t.length > 8 ? 30 : 0 }
  });
  // 排名越小越好：反转 Y 轴并只允许整数刻度
  option.yAxis[0] = {
    ...option.yAxis[0],
    inverse: true,
    minInterval: 1,
    axisLabel: { formatter: (v: number) => `第 ${v} 名` }
  };
  option.series[0].label = { show: true, position: "top", fontSize: 11 };
  return option;
});

const totalReward = computed(() =>
  (data.value?.scoreTrend ?? []).reduce((s, i) => s + (i.totalReward ?? 0), 0)
);
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      title="成绩分析"
      description="科目表现、目标达成与历次考试变化（全部历史数据）"
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
        rules="科目平均分低于目标；最近一次考试排名下降"
        :loading="loading"
      />

      <div class="reward-metrics">
        <MetricCard label="考试总数" :value="data.totalExams" size="hero" />
        <MetricCard
          label="奖励记录数"
          :value="data.totalRewards"
          size="hero"
          :caption="`累计奖励金额 ${formatNumber(totalReward, 2)}`"
        />
        <MetricCard
          label="科目数"
          :value="data.subjectStats?.length ?? 0"
          size="hero"
        />
      </div>

      <AnalyticsSection
        title="科目表现"
        description="得分率便于跨科目比较，不受满分差异影响"
      >
        <div class="reward-grid">
          <ChartCard
            title="科目平均得分率"
            :option="subjectRateOption"
            :height="Math.max(220, (data.subjectStats?.length ?? 0) * 40)"
            :empty="!data.subjectStats?.length"
          />
          <ChartCard
            title="科目目标达成差距"
            description="分差 = 平均分 − 目标分；绿色达标，红色未达标"
            :option="gapOption"
            :height="Math.max(220, (data.targetGapStats?.length ?? 0) * 40)"
            :empty="!data.targetGapStats?.length"
          />
        </div>
        <div class="reward-grid">
          <ChartCard title="科目成绩明细" :empty="!data.subjectStats?.length">
            <DataTable :data="data.subjectStats">
              <el-table-column prop="subjectName" label="科目" min-width="90" />
              <el-table-column
                prop="count"
                label="考试次数"
                width="90"
                align="right"
              />
              <el-table-column
                prop="avgScore"
                label="平均分"
                width="90"
                align="right"
              />
              <el-table-column label="得分率" width="160">
                <template #default="{ row }">
                  <RateBar
                    :value="row.avgScoreRate"
                    :tone="successRateTone(row.avgScoreRate)"
                  />
                </template>
              </el-table-column>
              <el-table-column
                prop="minScore"
                label="最低"
                width="70"
                align="right"
              />
              <el-table-column
                prop="maxScore"
                label="最高"
                width="70"
                align="right"
              />
            </DataTable>
          </ChartCard>
          <ChartCard
            title="科目目标达成明细"
            :empty="!data.targetGapStats?.length"
          >
            <DataTable :data="data.targetGapStats">
              <el-table-column prop="subjectName" label="科目" min-width="90" />
              <el-table-column
                prop="avgScore"
                label="平均分"
                width="80"
                align="right"
              />
              <el-table-column
                prop="avgTarget"
                label="目标分"
                width="80"
                align="right"
              />
              <el-table-column label="分差" width="80" align="right">
                <template #default="{ row }">
                  <span
                    :class="row.avgGap >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    {{ row.avgGap > 0 ? "+" : "" }}{{ row.avgGap }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="达标率" width="160">
                <template #default="{ row }">
                  <RateBar
                    :value="row.achievementRate"
                    :tone="successRateTone(row.achievementRate)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="达标 / 未达" width="100" align="right">
                <template #default="{ row }">
                  {{ row.aboveCount }} / {{ row.belowCount }}
                </template>
              </el-table-column>
            </DataTable>
          </ChartCard>
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="历次考试变化">
        <ChartCard
          v-if="data.scoreTrend?.length"
          title="得分率与奖励金额"
          description="得分率 = 各科分数合计 / 满分合计"
          :option="scoreTrendOption"
          :height="300"
        />
        <ChartCard
          v-if="data.rankTrend?.length"
          title="总分排名变化"
          description="排名越靠上越好（纵轴已反转）"
          :option="rankOption"
          :height="280"
        />
      </AnalyticsSection>

      <ChartCard title="考试记录" :empty="!data.examResults?.length">
        <DataTable :data="data.examResults">
          <el-table-column prop="examName" label="考试名称" min-width="200" />
          <el-table-column prop="examDate" label="日期" width="120" />
          <el-table-column prop="stage" label="学段" width="100" />
          <el-table-column prop="rewardStatus" label="奖励状态" width="120" />
        </DataTable>
      </ChartCard>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.reward-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ra-space-md);
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--ra-space-md);
}

.text-positive {
  color: var(--el-color-success);
}

.text-negative {
  color: var(--el-color-danger);
}
</style>
