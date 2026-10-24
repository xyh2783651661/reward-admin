<script setup lang="ts">
import type { EChartsOption } from "echarts";
import type { EChartsType } from "echarts/core";
import { useResizeObserver } from "@vueuse/core";
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";
import echarts from "@/plugins/echarts";
import type { WorkbenchTrendData, WorkbenchTrendRange } from "@/api/workbench";
import PanelCard from "@/components/PanelCard/index.vue";

const props = defineProps<{
  data: WorkbenchTrendData;
  range: WorkbenchTrendRange;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  "update:range": [value: WorkbenchTrendRange];
  retry: [];
}>();

const chartRef = ref<HTMLElement | null>(null);
let chart: EChartsType | null = null;
let themeObserver: MutationObserver | null = null;

const hasData = computed(() => (props.data.categories?.length ?? 0) > 0);
const isEmpty = computed(
  () => !props.loading && !props.error && !hasData.value
);

const rangeModel = computed({
  get: () => props.range,
  set: value => emit("update:range", value === "30d" ? "30d" : "7d")
});

function readCssVar(name: string, fallback: string) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function buildOption(data: WorkbenchTrendData): EChartsOption {
  const dark = document.documentElement.classList.contains("dark");
  const text = readCssVar("--el-text-color-secondary", "#64748b");
  const grid = readCssVar("--el-border-color-lighter", "#e5e7eb");
  return {
    color: ["#2563eb", "#0f766e", "#d97706"],
    animationDuration: 500,
    tooltip: {
      trigger: "axis",
      backgroundColor: dark ? "#171a21" : "#111827",
      borderWidth: 0,
      textStyle: { color: "#f8fafc", fontSize: 12 }
    },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      icon: "roundRect",
      textStyle: { color: text }
    },
    grid: { top: 40, left: 8, right: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: true,
      data: data.categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: text, hideOverlap: true }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: text },
      splitLine: { lineStyle: { color: grid, type: "dashed" } }
    },
    series: [
      {
        name: "奖励发放",
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: data.rewardIssued
      },
      {
        name: "AI 调用",
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: data.aiCallCount
      },
      {
        name: "任务执行",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2.5 },
        data: data.taskExecutions
      }
    ]
  };
}

async function render() {
  await nextTick();
  if (!chartRef.value || !hasData.value) return;
  chart ??= echarts.init(chartRef.value);
  chart.setOption(buildOption(props.data), true);
  chart.resize();
}

watch(
  () => props.data,
  () => void render(),
  { deep: true }
);
useResizeObserver(chartRef, () => chart?.resize());

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    if (chart) chart.setOption(buildOption(props.data), true);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
  });
  void render();
});
onActivated(() => void render());
onBeforeUnmount(() => {
  themeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <PanelCard
    title="运行趋势"
    :description="`近 ${range === '7d' ? 7 : 30} 天奖励、AI 与任务数据`"
    :loading="loading"
    :error="error"
    :empty="isEmpty"
    empty-text="暂无趋势数据"
    empty-icon="ri:bar-chart-2-line"
    :min-height="320"
    @retry="emit('retry')"
  >
    <template #extra>
      <el-radio-group
        v-model="rangeModel"
        size="small"
        aria-label="趋势时间范围"
      >
        <el-radio-button value="7d">7 天</el-radio-button>
        <el-radio-button value="30d">30 天</el-radio-button>
      </el-radio-group>
    </template>
    <div ref="chartRef" class="trend-chart" />
  </PanelCard>
</template>

<style scoped lang="scss">
.trend-chart {
  width: 100%;
  height: 320px;
}
</style>
