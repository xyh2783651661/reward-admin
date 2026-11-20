<script setup lang="ts">
import { computed } from "vue";
import {
  getAnalyticsRewardOverview,
  type AnalyticsRewardOverview
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
import RateBar from "../components/RateBar.vue";
import Readout from "../components/Readout.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import { SEMANTIC, cartesianOption, rankingOption } from "../utils/chartTheme";
import { formatNumber, formatPercent, successRateTone } from "../utils/format";
import { compareHalves, peakIndex, sum } from "../utils/series";

defineOptions({ name: "AnalyticsReward" });

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsRewardOverview>(
    () => getAnalyticsRewardOverview(),
    { errorLabel: "加载成绩分析数据失败" }
  );

const scoreTrend = computed(() => data.value?.scoreTrend ?? []);
const rankTrend = computed(() => data.value?.rankTrend ?? []);

const totalReward = computed(() =>
  sum(scoreTrend.value.map(i => i.totalReward))
);

const lead = computed(() => ({
  rateSpark: scoreTrend.value.map(i => i.scoreRate),
  rewardSpark: scoreTrend.value.map(i => i.totalReward)
}));

const latestExam = computed(() => scoreTrend.value.at(-1));

const findingRules =
  "科目平均分低于目标（达标率 < 50% 为严重，仅展示差距最大的 3 个科目）；最近一次考试排名下降";

const findings = computed<Finding[]>(() => {
  const d = data.value;
  if (!d) return [];
  const list: Finding[] = [];
  const behind = [...(d.targetGapStats ?? [])]
    .filter(s => s.avgGap < 0)
    .sort((a, b) => a.avgGap - b.avgGap);
  for (const s of behind.slice(0, 3)) {
    list.push({
      level: s.achievementRate < 50 ? "critical" : "warning",
      module: "成绩",
      title: `${s.subjectName} 平均分低于目标`,
      evidence: `平均 ${formatNumber(s.avgScore, 1)} 分，目标 ${formatNumber(s.avgTarget, 1)} 分，差 ${formatNumber(Math.abs(s.avgGap), 1)} 分；达标 ${s.aboveCount} 次 / 未达标 ${s.belowCount} 次（达标率 ${formatPercent(s.achievementRate)}）`
    });
  }
  const rank = rankTrend.value;
  if (rank.length >= 2) {
    const last = rank[rank.length - 1];
    const prev = rank[rank.length - 2];
    if (last.rankValue > prev.rankValue) {
      list.push({
        level: "info",
        module: "成绩",
        title: "最近一次考试排名下降",
        evidence: `${prev.examName} 第 ${prev.rankValue} 名 → ${last.examName} 第 ${last.rankValue} 名（下降 ${last.rankValue - prev.rankValue} 名）`
      });
    }
  }
  return list;
});

const trendFacts = computed<Fact[]>(() => {
  const t = scoreTrend.value;
  const facts: Fact[] = [];
  if (!t.length) return facts;
  const best = peakIndex(t.map(i => i.scoreRate));
  if (best >= 0)
    facts.push({
      label: "得分率最高的一次",
      value: formatPercent(t[best].scoreRate),
      hint: `${t[best].examName}（${t[best].examDate}）`
    });
  const cmp = compareHalves(t.map(i => i.scoreRate));
  if (cmp)
    facts.push({
      label: "近期 vs 早期得分率",
      value: `${cmp.diff >= 0 ? "+" : ""}${formatNumber(cmp.diff, 1)} 个百分点`,
      hint: `${formatPercent(cmp.first)} → ${formatPercent(cmp.second)}`
    });
  const ranks = rankTrend.value;
  if (ranks.length) {
    const bestRank = ranks.reduce((a, b) =>
      b.rankValue < a.rankValue ? b : a
    );
    facts.push({
      label: "历史最佳排名",
      value: `第 ${bestRank.rankValue} 名`,
      hint: `${bestRank.examName}（${bestRank.examDate}）`
    });
  }
  return facts;
});

const subjectFacts = computed<Fact[]>(() => {
  const d = data.value;
  const facts: Fact[] = [];
  if (!d) return facts;
  const subjects = d.subjectStats ?? [];
  if (subjects.length) {
    const top = [...subjects].sort((a, b) => b.avgScoreRate - a.avgScoreRate);
    facts.push({
      label: "得分率最高的科目",
      value: top[0].subjectName,
      hint: formatPercent(top[0].avgScoreRate)
    });
    if (top.length > 1) {
      const low = top[top.length - 1];
      facts.push({
        label: "得分率最低的科目",
        value: low.subjectName,
        hint: formatPercent(low.avgScoreRate)
      });
    }
  }
  const gaps = d.targetGapStats ?? [];
  if (gaps.length) {
    const reached = gaps.filter(g => g.avgGap >= 0).length;
    facts.push({
      label: "平均分达到目标的科目",
      value: `${reached} / ${gaps.length}`,
      hint: "平均分 ≥ 目标分记为达标"
    });
  }
  return facts;
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
  const t = scoreTrend.value;
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
  const t = rankTrend.value;
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
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      title="成绩分析"
      description="成绩整体趋势、各科目距离目标还有多远（全部历史数据）"
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
          label="考试总数"
          :value="data.totalExams"
          :spark="lead.rateSpark"
          :caption="
            latestExam
              ? `最近：${latestExam.examName}，得分率 ${formatPercent(latestExam.scoreRate)}`
              : ''
          "
        />
        <Readout
          size="lead"
          label="奖励记录数"
          :value="data.totalRewards"
          :spark="lead.rewardSpark"
          :caption="`累计奖励金额 ${formatNumber(totalReward, 2)}`"
        />
        <Readout
          size="lead"
          label="科目数"
          :value="data.subjectStats?.length ?? 0"
        />
      </LeadStrip>

      <FindingsSection :items="findings" :rules="findingRules" />

      <Chapter index="01" question="成绩整体在往哪个方向走？">
        <template #facts>
          <FactList :items="trendFacts" />
        </template>
        <h3 class="pair__title">得分率与奖励金额</h3>
        <p class="chart-note">得分率 = 各科分数合计 / 满分合计</p>
        <AnalyticsChart
          v-if="scoreTrend.length"
          :option="scoreTrendOption"
          :height="300"
          label="历次考试得分率与奖励金额"
        />
        <p v-else class="empty">还没有可用于趋势的考试数据。</p>

        <template v-if="rankTrend.length">
          <h3 class="pair__title pair__title--spaced">总分排名变化</h3>
          <p class="chart-note">排名越靠上越好（纵轴已反转）</p>
          <AnalyticsChart
            :option="rankOption"
            :height="280"
            label="历次考试总分排名变化"
          />
        </template>
      </Chapter>

      <Chapter index="02" question="哪些科目离目标最远？">
        <template #facts>
          <FactList
            :items="subjectFacts"
            note="得分率便于跨科目比较，不受满分差异影响；分差 = 平均分 − 目标分。"
          />
        </template>
        <div class="pair">
          <div>
            <h3 class="pair__title">科目平均得分率</h3>
            <AnalyticsChart
              v-if="data.subjectStats?.length"
              :option="subjectRateOption"
              :height="Math.max(220, data.subjectStats.length * 40)"
              label="科目平均得分率排行"
            />
            <p v-else class="empty">没有科目成绩数据。</p>
          </div>
          <div>
            <h3 class="pair__title">
              科目目标达成差距（绿色达标，红色未达标）
            </h3>
            <AnalyticsChart
              v-if="data.targetGapStats?.length"
              :option="gapOption"
              :height="Math.max(220, data.targetGapStats.length * 40)"
              label="科目目标达成差距"
            />
            <p v-else class="empty">没有设置目标分的科目。</p>
          </div>
        </div>

        <div class="pair pair--spaced">
          <div>
            <h3 class="pair__title">科目成绩明细</h3>
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
          </div>
          <div>
            <h3 class="pair__title">科目目标达成明细</h3>
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
          </div>
        </div>
      </Chapter>

      <Chapter index="03" question="明细：考试记录">
        <DataTable :data="data.examResults" empty-text="还没有考试记录">
          <el-table-column prop="examName" label="考试名称" min-width="200" />
          <el-table-column prop="examDate" label="日期" width="120" />
          <el-table-column prop="stage" label="学段" width="100" />
          <el-table-column prop="rewardStatus" label="奖励状态" width="120" />
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

  &--spaced {
    margin-top: var(--ra-space-xl);
  }
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

.chart-note,
.empty {
  margin: 0 0 var(--ra-space-sm);
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.empty {
  font-size: var(--ra-font-sm);
}

.text-positive {
  color: var(--el-color-success);
}

.text-negative {
  color: var(--el-color-danger);
}

@media (width <= 1100px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
