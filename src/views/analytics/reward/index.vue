<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import PanelCard from "@/components/PanelCard/index.vue";
import {
  getAnalyticsRewardOverview,
  type AnalyticsRewardOverview
} from "@/api/analytics";
import { useChartMount } from "../useChartMount";

defineOptions({ name: "AnalyticsReward" });

const { setChartRef, mountChart, resizeAll } = useChartMount();

const loading = ref(true);
const data = ref<AnalyticsRewardOverview | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const res = await getAnalyticsRewardOverview();
    data.value = res.data?.data ?? null;
  } catch (e) {
    console.error("加载成绩分析数据失败", e);
  }
  loading.value = false;
  await nextTick();
  setTimeout(renderCharts, 60);
}

function renderCharts() {
  renderRadar();
  renderRankTrend();
  renderTargetGap();
  renderScoreTrend();
  resizeAll();
}

function renderTargetGap() {
  const stats = data.value?.targetGapStats ?? [];
  if (!stats.length) return;
  // 按平均差距升序（差距越小/越负越靠下），便于看出哪科落后
  const sorted = [...stats].sort((a, b) => a.avgGap - b.avgGap);
  mountChart("targetGap", {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        const item = sorted[p.dataIndex];
        return `${item.subjectName}<br/>平均分: ${item.avgScore}<br/>目标分: ${item.avgTarget}<br/>差距: ${item.avgGap > 0 ? "+" : ""}${item.avgGap}<br/>达标率: ${item.achievementRate}%`;
      }
    },
    grid: { left: 16, right: 64, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: "value", name: "分差" },
    yAxis: { type: "category", data: sorted.map(s => s.subjectName) },
    series: [
      {
        type: "bar",
        barMaxWidth: 20,
        data: sorted.map(s => ({
          value: s.avgGap,
          itemStyle: {
            color: s.avgGap >= 0 ? "#10b981" : "#ef4444",
            borderRadius: s.avgGap >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]
          }
        })),
        label: {
          show: true,
          position: (p: any) => (p.value >= 0 ? "right" : "left"),
          formatter: (p: any) => `${p.value > 0 ? "+" : ""}${p.value}`
        }
      }
    ]
  });
}

function renderScoreTrend() {
  const trend = data.value?.scoreTrend ?? [];
  if (!trend.length) return;
  mountChart("scoreTrend", {
    color: ["#2563eb", "#f59e0b"],
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const idx = params[0].dataIndex;
        const item = trend[idx];
        return `${item.examName}<br/>日期: ${item.examDate}<br/>总分: ${item.totalScore}/${item.totalFullScore}<br/>得分率: ${item.scoreRate}%<br/>奖励: ${item.totalReward}`;
      }
    },
    legend: { data: ["得分率", "奖励金额"], top: 0 },
    grid: { left: 16, right: 28, bottom: 8, top: 44, containLabel: true },
    xAxis: {
      type: "category",
      data: trend.map(t => t.examDate),
      axisLabel: { rotate: 30 }
    },
    yAxis: [
      { type: "value", name: "得分率%", max: 100, min: 60 },
      { type: "value", name: "奖励" }
    ],
    series: [
      {
        name: "得分率",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 7,
        data: trend.map(t => t.scoreRate)
      },
      {
        name: "奖励金额",
        type: "bar",
        yAxisIndex: 1,
        barMaxWidth: 26,
        data: trend.map(t => t.totalReward)
      }
    ]
  });
}

function renderRadar() {
  const subjects = data.value?.subjectStats ?? [];
  if (!subjects.length) return;
  mountChart("radar", {
    color: ["#2563eb"],
    tooltip: {},
    legend: { bottom: 0 },
    radar: {
      indicator: subjects.map(s => ({
        name: s.subjectName,
        max: s.maxScore > 0 ? s.maxScore : 150
      })),
      radius: "62%",
      splitArea: { areaStyle: { color: ["#f8fbff", "#eef5ff"] } }
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: subjects.map(s => s.avgScore),
            name: "平均分",
            areaStyle: { opacity: 0.25 }
          }
        ]
      }
    ]
  });
}

function renderRankTrend() {
  const trend = data.value?.rankTrend ?? [];
  if (!trend.length) return;
  mountChart("rank", {
    color: ["#2563eb"],
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const p = params[0];
        const item = trend[p.dataIndex];
        return `${item.examName}<br/>日期: ${item.examDate}<br/>排名: ${item.rankValue}`;
      }
    },
    grid: { left: 16, right: 32, top: 32, bottom: 48, containLabel: true },
    xAxis: {
      type: "category",
      data: trend.map(t => t.examDate),
      axisLabel: { rotate: 30 }
    },
    yAxis: {
      type: "value",
      name: "排名",
      inverse: true,
      minInterval: 1
    },
    series: [
      {
        name: "总分排名",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2.5 },
        data: trend.map(t => t.rankValue),
        label: { show: true, position: "top", formatter: "{c}" }
      }
    ]
  });
}

onMounted(() => loadData());
</script>

<template>
  <div style="padding: 20px">
    <template v-if="data">
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="8"
          ><el-card shadow="hover"
            ><el-statistic title="考试总数" :value="data.totalExams" /></el-card
        ></el-col>
        <el-col :span="8"
          ><el-card shadow="hover"
            ><el-statistic
              title="奖励记录数"
              :value="data.totalRewards" /></el-card
        ></el-col>
        <el-col :span="8"
          ><el-card shadow="hover"
            ><el-statistic
              title="科目数"
              :value="data.subjectStats?.length || 0" /></el-card
        ></el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <PanelCard title="科目成绩雷达图" description="各科目平均分对比">
            <div
              :ref="el => setChartRef('radar', el)"
              style=" width: 100%;height: 400px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard title="科目成绩明细">
            <el-table :data="data.subjectStats" stripe size="small">
              <el-table-column prop="subjectName" label="科目" width="100" />
              <el-table-column prop="count" label="考试次数" width="90" />
              <el-table-column prop="avgScore" label="平均分" width="90" />
              <el-table-column prop="avgScoreRate" label="得分率" width="90"
                ><template #default="{ row }"
                  >{{ row.avgScoreRate }}%</template
                ></el-table-column
              >
              <el-table-column prop="minScore" label="最低分" width="80" />
              <el-table-column prop="maxScore" label="最高分" width="80" />
            </el-table>
          </PanelCard>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <PanelCard
            title="科目目标达成差距"
            description="分差 = 平均分 - 目标分，绿色为达标"
          >
            <div
              :ref="el => setChartRef('targetGap', el)"
              style=" width: 100%;height: 360px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard title="科目目标达成明细">
            <el-table :data="data.targetGapStats" stripe size="small">
              <el-table-column prop="subjectName" label="科目" width="90" />
              <el-table-column prop="avgScore" label="平均分" width="90" />
              <el-table-column prop="avgTarget" label="目标分" width="90" />
              <el-table-column prop="avgGap" label="分差" width="90">
                <template #default="{ row }">
                  <span
                    :style="{ color: row.avgGap >= 0 ? '#67c23a' : '#f56c6c' }"
                  >
                    {{ row.avgGap > 0 ? "+" : "" }}{{ row.avgGap }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="achievementRate" label="达标率" width="90">
                <template #default="{ row }"
                  >{{ row.achievementRate }}%</template
                >
              </el-table-column>
              <el-table-column label="达标/未达" min-width="100">
                <template #default="{ row }"
                  >{{ row.aboveCount }} / {{ row.belowCount }}</template
                >
              </el-table-column>
            </el-table>
          </PanelCard>
        </el-col>
      </el-row>

      <PanelCard
        v-if="data.scoreTrend?.length"
        title="历次考试得分率与奖励金额"
        description="得分率基于「各科分数合计 / 满分合计」"
        style="margin-top: 16px"
      >
        <div
          :ref="el => setChartRef('scoreTrend', el)"
          style=" width: 100%;height: 320px"
        />
      </PanelCard>

      <PanelCard
        v-if="data.rankTrend?.length"
        title="总分排名变化"
        description="排名越靠上越好（Y 轴已反转）"
        style="margin-top: 16px"
      >
        <div
          :ref="el => setChartRef('rank', el)"
          style=" width: 100%;height: 320px"
        />
      </PanelCard>

      <PanelCard title="考试记录" style="margin-top: 16px">
        <el-table :data="data.examResults" stripe size="small">
          <el-table-column prop="examName" label="考试名称" min-width="200" />
          <el-table-column prop="examDate" label="日期" width="120" />
          <el-table-column prop="stage" label="学段" width="100" />
          <el-table-column prop="rewardStatus" label="奖励状态" width="120" />
        </el-table>
      </PanelCard>
    </template>

    <el-empty v-else-if="!loading" description="暂无数据" />
    <el-skeleton v-if="loading" :rows="6" animated />
  </div>
</template>
