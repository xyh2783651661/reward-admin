<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PanelCard from "@/components/PanelCard/index.vue";
import {
  getAnalyticsMailOverview,
  type AnalyticsMailOverview
} from "@/api/analytics";
import { useChartMount } from "../useChartMount";

defineOptions({ name: "AnalyticsMail" });

const router = useRouter();
const { setChartRef, mountChart, resizeAll } = useChartMount();

const loading = ref(true);
const data = ref<AnalyticsMailOverview | null>(null);
const range = ref(90);

/** 下钻：查看失败邮件明细 */
function goFailRecords() {
  router.push({ path: "/log/mail", query: { status: "2" } });
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getAnalyticsMailOverview(range.value);
    data.value = res.data?.data ?? null;
  } catch (e) {
    console.error("加载邮件分析数据失败", e);
  }
  loading.value = false;
  await nextTick();
  setTimeout(renderCharts, 60);
}

function renderCharts() {
  renderTrend();
  resizeAll();
}

function renderTrend() {
  if (!data.value) return;
  const t = data.value.monthlyTrend ?? [];
  mountChart("trend", {
    color: ["#94a3b8", "#10b981", "#ef4444", "#2563eb"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["发送总量", "成功", "失败", "成功率"], top: 0 },
    grid: { left: 16, right: 28, bottom: 8, top: 44, containLabel: true },
    xAxis: { type: "category", data: t.map(i => i.month) },
    yAxis: [
      { type: "value", name: "数量" },
      {
        type: "value",
        name: "成功率%",
        max: 100,
        axisLabel: { formatter: "{value}%" }
      }
    ],
    series: [
      {
        name: "发送总量",
        type: "bar",
        barMaxWidth: 20,
        data: t.map(i => i.total)
      },
      {
        name: "成功",
        type: "bar",
        barMaxWidth: 20,
        data: t.map(i => i.success)
      },
      { name: "失败", type: "bar", barMaxWidth: 20, data: t.map(i => i.fail) },
      {
        name: "成功率",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        data: t.map(i => i.successRate)
      }
    ]
  });
}

onMounted(() => loadData());
</script>

<template>
  <div style="padding: 20px">
    <el-radio-group
      v-model="range"
      style="margin-bottom: 16px"
      @change="loadData"
    >
      <el-radio-button :value="30">近30天</el-radio-button>
      <el-radio-button :value="90">近90天</el-radio-button>
      <el-radio-button :value="180">近180天</el-radio-button>
    </el-radio-group>

    <template v-if="data">
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic title="总发送" :value="data.totalSent" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="成功"
              :value="data.successCount"
              :value-style="{ color: '#67c23a' }" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="失败"
              :value="data.failCount"
              :value-style="{ color: '#f56c6c' }" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="成功率"
              :value="data.successRate"
              suffix="%" /></el-card
        ></el-col>
      </el-row>

      <PanelCard title="月度趋势" description="发送数量与成功率">
        <div
          :ref="el => setChartRef('trend', el)"
          style=" width: 100%;height: 350px"
        />
      </PanelCard>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <PanelCard title="邮件类型分布">
            <el-table :data="data.typeStats" stripe size="small">
              <el-table-column prop="type" label="类型" min-width="180" />
              <el-table-column prop="count" label="数量" width="100" />
              <el-table-column prop="percentage" label="占比" width="100"
                ><template #default="{ row }"
                  >{{ row.percentage }}%</template
                ></el-table-column
              >
            </el-table>
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard
            title="失败原因 TOP10"
            description="点击行查看失败邮件明细"
          >
            <el-table
              :data="data.failReasons"
              stripe
              size="small"
              style="cursor: pointer"
              @row-click="goFailRecords"
            >
              <el-table-column
                prop="reason"
                label="原因"
                min-width="250"
                show-overflow-tooltip
              />
              <el-table-column prop="count" label="次数" width="80" />
            </el-table>
          </PanelCard>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else-if="!loading" description="暂无数据" />
    <el-skeleton v-if="loading" :rows="6" animated />
  </div>
</template>
