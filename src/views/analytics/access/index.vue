<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import PanelCard from "@/components/PanelCard/index.vue";
import {
  getAnalyticsAccessOverview,
  type AnalyticsAccessOverview
} from "@/api/analytics";
import { useChartMount } from "../useChartMount";

defineOptions({ name: "AnalyticsAccess" });

const router = useRouter();
const { setChartRef, mountChart, resizeAll, onChartClick } = useChartMount();

const loading = ref(true);
const data = ref<AnalyticsAccessOverview | null>(null);
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
    const res = await getAnalyticsAccessOverview(range.value);
    data.value = res.data?.data ?? null;
  } catch (e) {
    console.error("加载访问分析数据失败", e);
  }
  loading.value = false;
  await nextTick();
  setTimeout(renderCharts, 60);
}

function renderCharts() {
  renderDailyChart();
  renderFailChart();
  renderClientChart();
  renderHeatmap();
  renderLatencyBuckets();
  resizeAll();
}

function renderLatencyBuckets() {
  const buckets = data.value?.latencyBuckets ?? [];
  if (!buckets.length) return;
  mountChart("latencyBucket", {
    color: ["#10b981", "#2563eb", "#f59e0b", "#ef4444"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        const item = buckets[p.dataIndex];
        return `${item.bucket}<br/>${item.count} 次（${item.percentage}%）`;
      }
    },
    grid: { left: 16, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: { type: "category", data: buckets.map(b => b.bucket) },
    yAxis: { type: "value", name: "请求数" },
    series: [
      {
        type: "bar",
        barMaxWidth: 56,
        data: buckets.map((b, i) => ({
          value: b.count,
          itemStyle: {
            color: ["#10b981", "#2563eb", "#f59e0b", "#ef4444"][i],
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => `${buckets[p.dataIndex].percentage}%`
        }
      }
    ]
  });
}

function renderDailyChart() {
  if (!data.value) return;
  const trend = data.value.dailyTrend ?? [];
  mountChart("daily", {
    color: ["#2563eb", "#e6a23c"],
    tooltip: { trigger: "axis" },
    legend: { data: ["有效请求", "轮询请求"], top: 0 },
    grid: { left: 16, right: 16, bottom: 8, top: 40, containLabel: true },
    xAxis: { type: "category", data: trend.map(t => t.date) },
    yAxis: { type: "value" },
    series: [
      {
        name: "有效请求",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 5,
        data: trend.map(t => t.effective)
      },
      {
        name: "轮询请求",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 5,
        data: trend.map(t => t.polling)
      }
    ]
  });
}

function renderFailChart() {
  if (!data.value) return;
  const apis = [...(data.value.failApis ?? [])].sort(
    (a, b) => a.failRate - b.failRate
  );
  mountChart("fail", {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 16, right: 56, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: apis.map(a => a.uri) },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: apis.map(a => ({
          value: a.failRate,
          itemStyle: {
            color: a.failRate > 50 ? "#ef4444" : "#f59e0b",
            borderRadius: [0, 4, 4, 0]
          }
        })),
        label: { show: true, position: "right", formatter: "{c}%" }
      }
    ]
  });
  onChartClick("fail", (params: any) => {
    if (!params?.name) return;
    router.push({
      path: "/log/system",
      query: { uri: params.name, success: "false" }
    });
  });
}

function renderClientChart() {
  if (!data.value) return;
  const list = (data.value.clientTypes ?? []).slice(0, 8);
  mountChart("client", {
    color: CHART_COLORS,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { type: "scroll", orient: "vertical", right: 8, top: "center" },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["36%", "50%"],
        avoidLabelOverlap: true,
        data: list.map(c => ({ name: c.browserType, value: c.count })),
        label: { formatter: "{d}%" }
      }
    ]
  });
}

function renderHeatmap() {
  const points = data.value?.heatmap ?? [];
  if (!points.length) return;
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}时`);
  const seriesData = points.map(p => [p.hour, p.weekday - 1, p.count]);
  const max = Math.max(...points.map(p => p.count), 1);
  mountChart("heatmap", {
    tooltip: {
      position: "top",
      formatter: (params: any) =>
        `${days[params.value[1]]} ${hours[params.value[0]]}<br/>请求 ${params.value[2]} 次`
    },
    grid: { left: 16, right: 16, top: 16, bottom: 56, containLabel: true },
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true },
      axisLabel: { interval: 2 }
    },
    yAxis: { type: "category", data: days, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#e8f3ff", "#7cb6f5", "#2563eb", "#0b3d91"] }
    },
    series: [
      {
        name: "请求量",
        type: "heatmap",
        data: seriesData,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.4)" }
        }
      }
    ]
  });
}

function onIpClick(row: { ip?: string; ipLocation?: string }) {
  const ipLocation = row?.ipLocation ?? "";
  if (!ipLocation) return;
  router.push({ path: "/log/system", query: { ipLocation } });
}

onMounted(() => loadData());
</script>

<template>
  <div class="analytics-access" style="padding: 20px">
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
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="有效请求（排除轮询）"
              :value="data.effectiveRequests" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="独立公网IP"
              :value="data.uniqueIps" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="平均耗时"
              :value="data.avgCostMs"
              suffix="ms" /></el-card
        ></el-col>
        <el-col :span="6"
          ><el-card shadow="hover"
            ><el-statistic
              title="失败率"
              :value="data.failRate"
              suffix="%"
              :value-style="{
                color: data.failRate > 5 ? '#f56c6c' : '#67c23a'
              }" /></el-card
        ></el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="16">
          <PanelCard title="请求趋势" description="有效请求 vs 系统轮询">
            <div
              :ref="el => setChartRef('daily', el)"
              style=" width: 100%;height: 340px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="8">
          <PanelCard title="客户端类型分布">
            <div
              :ref="el => setChartRef('client', el)"
              style=" width: 100%;height: 340px"
            />
          </PanelCard>
        </el-col>
      </el-row>

      <PanelCard
        title="API 耗时分位数（P50/P95/P99）"
        description="按 P95 降序，仅展示请求量≥20 的接口"
        style="margin-top: 16px"
      >
        <el-table :data="data.apiLatency" stripe size="small">
          <el-table-column prop="uri" label="接口" min-width="200" />
          <el-table-column prop="count" label="请求数" width="100" />
          <el-table-column prop="avgMs" label="平均(ms)" width="100" />
          <el-table-column prop="p50" label="P50(ms)" width="100">
            <template #default="{ row }"
              ><span :style="{ color: row.p50 > 500 ? '#e6a23c' : '' }">{{
                row.p50
              }}</span></template
            >
          </el-table-column>
          <el-table-column prop="p95" label="P95(ms)" width="100">
            <template #default="{ row }"
              ><span :style="{ color: row.p95 > 1000 ? '#f56c6c' : '' }">{{
                row.p95
              }}</span></template
            >
          </el-table-column>
          <el-table-column prop="p99" label="P99(ms)" width="100" />
          <el-table-column prop="maxMs" label="最大(ms)" width="100" />
        </el-table>
      </PanelCard>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <PanelCard
            title="API 耗时分段分布"
            description="全量业务请求（排除轮询）"
          >
            <div
              :ref="el => setChartRef('latencyBucket', el)"
              style=" width: 100%;height: 300px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard
            title="疑似批量脚本"
            description="同一 IP+URI 请求≥50 次且 80% 以上耗时 0ms"
          >
            <el-table
              :data="data.batchScripts"
              stripe
              size="small"
              empty-text="未检测到批量脚本"
            >
              <el-table-column prop="ip" label="IP" width="130" />
              <el-table-column
                prop="ipLocation"
                label="归属地"
                width="150"
                show-overflow-tooltip
              />
              <el-table-column
                prop="uri"
                label="接口"
                min-width="170"
                show-overflow-tooltip
              />
              <el-table-column prop="requestCount" label="请求数" width="90" />
              <el-table-column prop="zeroCostRate" label="0ms占比" width="95">
                <template #default="{ row }">{{ row.zeroCostRate }}%</template>
              </el-table-column>
            </el-table>
          </PanelCard>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="24">
          <PanelCard
            title="访问时间规律热力图"
            description="星期 × 小时，已排除通知轮询"
          >
            <div
              :ref="el => setChartRef('heatmap', el)"
              style=" width: 100%;height: 320px"
            />
          </PanelCard>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <PanelCard
            title="失败率 TOP10"
            description="点击柱状图查看对应访问日志"
          >
            <div
              :ref="el => setChartRef('fail', el)"
              style=" width: 100%;height: 340px"
            />
          </PanelCard>
        </el-col>
        <el-col :span="12">
          <PanelCard
            title="高频 IP 排行 TOP15"
            description="点击行查看该归属地访问日志"
          >
            <el-table
              :data="data.topIps"
              stripe
              size="small"
              style="cursor: pointer"
              @row-click="onIpClick"
            >
              <el-table-column prop="ip" label="IP" width="140" />
              <el-table-column prop="ipLocation" label="归属地" width="160" />
              <el-table-column prop="requestCount" label="请求数" width="80" />
              <el-table-column prop="distinctUris" label="接口数" width="80" />
              <el-table-column prop="lastSeen" label="最后访问" />
            </el-table>
          </PanelCard>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else-if="!loading" description="暂无数据" />
    <el-skeleton v-if="loading" :rows="6" animated />
  </div>
</template>
