<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PanelCard from "@/components/PanelCard/index.vue";
import {
  getAnalyticsAiOverview,
  type AnalyticsAiOverview
} from "@/api/analytics";
import { useChartMount } from "../useChartMount";

defineOptions({ name: "AnalyticsAi" });

const router = useRouter();
const { setChartRef, mountChart, resizeAll, onChartClick } = useChartMount();

const loading = ref(true);
const data = ref<AnalyticsAiOverview | null>(null);
const range = ref(30);

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#14b8a6"
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getAnalyticsAiOverview(range.value);
    data.value = res.data?.data ?? null;
  } catch (e) {
    console.error("加载AI分析数据失败", e);
  }
  loading.value = false;
  await nextTick();
  setTimeout(renderCharts, 60);
}

function renderCharts() {
  renderModelChart();
  renderBizTypeChart();
  renderTrendChart();
  renderTokenTrend();
  resizeAll();
}

function navigateToCallRecord(model?: string) {
  if (!model) return;
  router.push({ path: "/monitor/ai-call-records", query: { model } });
}

function renderModelChart() {
  if (!data.value) return;
  const stats = [...(data.value.modelStats ?? [])].sort(
    (a, b) => a.failRate - b.failRate
  );
  mountChart("model", {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 16, right: 56, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: stats.map(s => s.model) },
    series: [
      {
        type: "bar",
        barMaxWidth: 20,
        data: stats.map(s => ({
          value: s.failRate,
          itemStyle: {
            color:
              s.failRate > 30
                ? "#ef4444"
                : s.failRate > 15
                  ? "#f59e0b"
                  : "#10b981",
            borderRadius: [0, 4, 4, 0]
          }
        })),
        label: { show: true, position: "right", formatter: "{c}%" }
      }
    ]
  });
  onChartClick("model", (params: any) => navigateToCallRecord(params?.name));
}

function renderBizTypeChart() {
  if (!data.value) return;
  const stats = (data.value.bizTypeStats ?? []).slice(0, 8);
  mountChart("bizType", {
    color: CHART_COLORS,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { type: "scroll", orient: "vertical", right: 8, top: "center" },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["36%", "50%"],
        avoidLabelOverlap: true,
        data: stats.map(s => ({ name: s.bizType, value: s.count })),
        label: { formatter: "{d}%" }
      }
    ]
  });
  onChartClick("bizType", (params: any) => {
    if (!params?.name) return;
    router.push({
      path: "/monitor/ai-call-records",
      query: { bizType: params.name }
    });
  });
}

function renderTrendChart() {
  if (!data.value) return;
  const trend = data.value.monthlyTrend ?? [];
  mountChart("trend", {
    color: ["#2563eb", "#ef4444", "#8b5cf6"],
    tooltip: { trigger: "axis" },
    legend: { data: ["调用总量", "失败数", "失败率"], top: 0 },
    grid: { left: 16, right: 28, bottom: 8, top: 44, containLabel: true },
    xAxis: { type: "category", data: trend.map(t => t.month) },
    yAxis: [
      { type: "value", name: "调用量" },
      {
        type: "value",
        name: "失败率%",
        max: 100,
        axisLabel: { formatter: "{value}%" }
      }
    ],
    series: [
      {
        name: "调用总量",
        type: "bar",
        barMaxWidth: 24,
        data: trend.map(t => t.total)
      },
      {
        name: "失败数",
        type: "bar",
        barMaxWidth: 24,
        data: trend.map(t => t.fail)
      },
      {
        name: "失败率",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        data: trend.map(t => t.failRate)
      }
    ]
  });
}

function renderTokenTrend() {
  if (!data.value) return;
  const trend = data.value.monthlyTrend ?? [];
  mountChart("tokenTrend", {
    color: ["#10b981", "#f59e0b", "#8b5cf6"],
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Token 消耗", "Fallback 次数", "Fallback 触发率"],
      top: 0
    },
    grid: { left: 16, right: 28, bottom: 8, top: 44, containLabel: true },
    xAxis: { type: "category", data: trend.map(t => t.month) },
    yAxis: [
      { type: "value", name: "Token" },
      {
        type: "value",
        name: "触发率%",
        max: 100,
        axisLabel: { formatter: "{value}%" }
      }
    ],
    series: [
      {
        name: "Token 消耗",
        type: "bar",
        barMaxWidth: 26,
        data: trend.map(t => t.totalTokens ?? 0)
      },
      {
        name: "Fallback 次数",
        type: "bar",
        barMaxWidth: 26,
        data: trend.map(t => t.fallbackCount ?? 0)
      },
      {
        name: "Fallback 触发率",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        data: trend.map(t => t.fallbackRate ?? 0)
      }
    ]
  });
}

onMounted(() => loadData());
</script>
<template>
  <div class="analytics-ai" style="padding: 20px">
    <el-radio-group
      v-model="range"
      style="margin-bottom: 16px"
      @change="loadData"
    >
      <el-radio-button :value="7">近7天</el-radio-button>
      <el-radio-button :value="30">近30天</el-radio-button>
      <el-radio-button :value="90">近90天</el-radio-button>
    </el-radio-group>

    <template v-if="data">
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic title="总调用" :value="data.totalCalls"
          /></el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic
              title="成功率"
              :value="data.successRate"
              suffix="%"
              :value-style="{
                color: data.successRate >= 80 ? '#67c23a' : '#e6a23c'
              }"
          /></el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic
              title="失败率"
              :value="data.failRate"
              suffix="%"
              :value-style="{ color: '#f56c6c' }"
          /></el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic title="平均耗时" :value="data.avgCostMs" suffix="ms"
          /></el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic title="Token总量" :value="data.totalTokens"
          /></el-card>
        </el-col>
        <el-col :span="4">
          <el-card shadow="hover"
            ><el-statistic
              title="Fallback触发率"
              :value="data.fallbackRate"
              suffix="%"
              :value-style="{ color: '#409eff' }"
          /></el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <PanelCard
            title="模型失败率对比"
            description="点击柱状图可跳转到对应调用记录"
          >
            <div
              :ref="el => setChartRef('model', el)"
              style=" width: 100%;height: 380px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard
            title="业务类型分布"
            description="点击扇区可跳转到对应调用记录"
          >
            <div
              :ref="el => setChartRef('bizType', el)"
              style=" width: 100%;height: 380px"
            />
          </PanelCard>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="24">
          <PanelCard
            title="月度趋势"
            description="调用总量、失败数与失败率变化"
          >
            <div
              :ref="el => setChartRef('trend', el)"
              style=" width: 100%;height: 340px"
            />
          </PanelCard>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="24">
          <PanelCard
            title="Token 消耗与 Fallback 触发趋势"
            description="月度 Token 消耗量、回退次数与触发率"
          >
            <div
              :ref="el => setChartRef('tokenTrend', el)"
              style=" width: 100%;height: 320px"
            />
          </PanelCard>
        </el-col>
      </el-row>

      <PanelCard
        v-if="data.fallbackPatterns?.length"
        title="Fallback 回退链路模式"
        description="按回退路径聚合，成功率 = 最终成功 / 该路径调用次数"
        style="margin-top: 16px"
      >
        <el-table :data="data.fallbackPatterns" stripe size="small">
          <el-table-column prop="pattern" label="回退链路" min-width="260" />
          <el-table-column prop="count" label="触发次数" width="110" />
          <el-table-column prop="successCount" label="最终成功" width="110" />
          <el-table-column prop="successRate" label="成功率" width="120">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.successRate >= 80
                    ? 'success'
                    : row.successRate >= 50
                      ? 'warning'
                      : 'danger'
                "
                size="small"
              >
                {{ row.successRate }}%
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </PanelCard>

      <PanelCard
        v-if="data.fallbackChains?.length"
        title="Fallback 明细（最近 20 条多供应商回退）"
        description="基于 ai_call_record.fallback_tried 原始字段，未做推断"
        style="margin-top: 16px"
      >
        <el-table :data="data.fallbackChains" stripe size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="model" label="最终模型" width="150" />
          <el-table-column
            prop="fallbackTried"
            label="尝试链路"
            min-width="220"
          />
          <el-table-column prop="attemptCount" label="尝试次数" width="100" />
          <el-table-column prop="status" label="最终状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
                size="small"
                >{{ row.status }}</el-tag
              >
            </template>
          </el-table-column>
          <el-table-column prop="costTimeMs" label="耗时(ms)" width="110" />
          <el-table-column prop="bizType" label="业务类型" width="150" />
          <el-table-column prop="createdTime" label="时间" min-width="160" />
        </el-table>
      </PanelCard>

      <PanelCard
        title="供应商健康 vs 实际失败率"
        description="标记不匹配项（health=UP 但失败率>20%）"
        style="margin-top: 16px"
      >
        <el-table :data="data.providerHealthCompare" stripe size="small">
          <el-table-column prop="provider" label="供应商" width="180" />
          <el-table-column prop="healthStatus" label="健康状态" width="120">
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
                >{{ row.healthStatus }}</el-tag
              >
            </template>
          </el-table-column>
          <el-table-column prop="healthReason" label="原因" width="180" />
          <el-table-column prop="actualSuccess" label="实际成功" width="100" />
          <el-table-column prop="actualFail" label="实际失败" width="100" />
          <el-table-column prop="actualFailRate" label="实际失败率" width="120">
            <template #default="{ row }">
              <span
                :style="{
                  color: row.actualFailRate > 20 ? '#f56c6c' : '#67c23a'
                }"
                >{{ row.actualFailRate }}%</span
              >
            </template>
          </el-table-column>
          <el-table-column label="匹配" width="90">
            <template #default="{ row }">
              <el-tag
                :type="row.mismatch ? 'danger' : 'success'"
                size="small"
                >{{ row.mismatch ? "不匹配" : "匹配" }}</el-tag
              >
            </template>
          </el-table-column>
        </el-table>
      </PanelCard>

      <PanelCard
        v-if="data.slowCalls?.length"
        title="慢调用 TOP10（耗时>30s）"
        style="margin-top: 16px"
      >
        <el-table :data="data.slowCalls" stripe size="small">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="model" label="模型" width="150" />
          <el-table-column prop="biz_type" label="业务类型" width="150" />
          <el-table-column prop="STATUS" label="状态" width="100" />
          <el-table-column prop="cost_time_ms" label="耗时(ms)" width="120" />
          <el-table-column prop="created_time" label="时间" />
        </el-table>
      </PanelCard>
    </template>

    <el-empty v-else-if="!loading" description="暂无数据" />
    <el-skeleton v-if="loading" :rows="6" animated />
  </div>
</template>
