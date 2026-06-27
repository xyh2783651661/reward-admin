<script setup lang="ts">
import dayjs from "dayjs";
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
import { useRouter } from "vue-router";
import echarts from "@/plugins/echarts";
import { useUserStoreHook } from "@/store/modules/user";
import { message } from "@/utils/message";
import {
  getWorkbenchActivities,
  getWorkbenchSummary,
  getWorkbenchTodos,
  getWorkbenchTrends
} from "@/api/workbench";
import type {
  SummaryTrend,
  WorkbenchActivityItem,
  WorkbenchSummaryCard,
  WorkbenchSummaryData,
  WorkbenchTodoItem,
  WorkbenchTrendData
} from "@/api/workbench";

defineOptions({
  name: "Welcome"
});

type TrendRange = "7d" | "30d";

const emptySummary: WorkbenchSummaryData = {
  headline: {
    title: "",
    description: "",
    updatedAt: ""
  },
  focusItems: [],
  summaryCards: [],
  quickEntries: []
};

const emptyTrend: WorkbenchTrendData = {
  range: "7d",
  categories: [],
  rewardIssued: [],
  mailSuccessRate: [],
  taskExecutions: []
};

const router = useRouter();
const userStore = useUserStoreHook();
const loading = ref(false);
const trendLoading = ref(false);
const chartRef = ref<HTMLElement | null>(null);
const activeRange = ref<TrendRange>("7d");
const summary = ref<WorkbenchSummaryData>(emptySummary);
const trendData = ref<WorkbenchTrendData>(emptyTrend);
const todoList = ref<WorkbenchTodoItem[]>([]);
const activityList = ref<WorkbenchActivityItem[]>([]);
const lastLoadedAt = ref("");
const loadErrorText = ref("");

let trendChart: EChartsType | null = null;

const displayName = computed(() => {
  return userStore.nickname || userStore.username || "管理员";
});

const greeting = computed(() => {
  const hour = dayjs().hour();

  if (hour < 6) return "凌晨好";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
});

const summaryCards = computed(() => summary.value.summaryCards ?? []);
const quickEntries = computed(() => summary.value.quickEntries ?? []);
const focusItems = computed(() => summary.value.focusItems ?? []);
const headline = computed(
  () => summary.value.headline ?? emptySummary.headline
);
const latestRewardIssued = computed(() => {
  return trendData.value.rewardIssued.at(-1) ?? 0;
});
const latestSuccessRate = computed(() => {
  const value = trendData.value.mailSuccessRate.at(-1) ?? 0;
  return `${value.toFixed(1)}%`;
});
const latestTaskExecutions = computed(() => {
  return trendData.value.taskExecutions.at(-1) ?? 0;
});
const todoCount = computed(() => todoList.value.length);
const updatedAtText = computed(() => {
  return headline.value.updatedAt || lastLoadedAt.value || "等待刷新";
});
const currentTimeText = computed(() => dayjs().format("YYYY-MM-DD HH:mm"));
const todoSummaryText = computed(() => {
  return todoCount.value > 0
    ? `当前有 ${todoCount.value} 条事项待你确认`
    : "暂无待办事项，可以安心处理其他工作";
});
const activitySummaryText = computed(() => {
  return activityList.value.length > 0
    ? `已汇总 ${activityList.value.length} 条近期动作`
    : "暂无新的系统动态";
});
const trendMetrics = computed(() => [
  {
    label: "最新奖励发放",
    value: latestRewardIssued.value,
    icon: "ri:gift-line"
  },
  {
    label: "最新邮件成功率",
    value: latestSuccessRate.value,
    icon: "ri:mail-check-line"
  },
  {
    label: "最新任务执行",
    value: latestTaskExecutions.value,
    icon: "ri:timer-flash-line"
  }
]);

function navigateTo(path?: string) {
  if (path) {
    router.push(path);
  }
}

function getTrendLabel(trend: SummaryTrend) {
  if (trend === "up") return "持续提升";
  if (trend === "down") return "需要关注";
  return "保持稳定";
}

function formatCardValue(card: WorkbenchSummaryCard) {
  const value =
    typeof card.value === "number" && Number.isInteger(card.value)
      ? card.value
      : Number(card.value).toFixed(1);

  return `${value}${card.unit ?? ""}`;
}

function formatDelta(card: WorkbenchSummaryCard) {
  const prefix = card.delta > 0 ? "+" : card.delta < 0 ? "-" : "";
  const numeric =
    Number.isInteger(card.delta) || Math.abs(card.delta) >= 10
      ? Math.abs(card.delta)
      : Math.abs(card.delta).toFixed(1);

  return `${prefix}${numeric}${card.unit ?? ""}`;
}

function getDeltaSymbol(trend: SummaryTrend) {
  if (trend === "up") return "↗";
  if (trend === "down") return "↘";
  return "→";
}

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

function buildTrendOption(data: WorkbenchTrendData): EChartsOption {
  const dark = isDarkMode();
  const axisLabel = readCssVar("--el-text-color-secondary", "#64748b");
  const splitLine = readCssVar("--el-border-color-lighter", "#edf2f7");
  const axisLine = dark
    ? "rgba(255,255,255,0.12)"
    : readCssVar("--el-border-color", "#dbe4f0");
  const tooltipBg = dark ? "rgba(20,22,28,0.94)" : "rgba(15,23,42,0.92)";

  return {
    color: ["#2563eb", "#059669", "#d97706"],
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: {
        color: "#fff",
        fontSize: 12
      }
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      icon: "roundRect",
      textStyle: {
        color: axisLabel
      }
    },
    grid: {
      top: 52,
      left: 16,
      right: 16,
      bottom: 8,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: true,
      data: data.categories,
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: axisLine
        }
      },
      axisLabel: {
        color: axisLabel
      }
    },
    yAxis: [
      {
        type: "value",
        name: "数量",
        nameTextStyle: { color: axisLabel },
        splitLine: {
          lineStyle: {
            color: splitLine,
            type: "dashed"
          }
        },
        axisLabel: {
          color: axisLabel
        }
      },
      {
        type: "value",
        name: "成功率",
        nameTextStyle: { color: axisLabel },
        min: 95,
        max: 100,
        splitLine: {
          show: false
        },
        axisLabel: {
          color: axisLabel,
          formatter: "{value}%"
        }
      }
    ],
    series: [
      {
        name: "奖励发放",
        type: "bar",
        barMaxWidth: 16,
        itemStyle: {
          borderRadius: [6, 6, 0, 0]
        },
        data: data.rewardIssued
      },
      {
        name: "任务执行",
        type: "bar",
        barMaxWidth: 16,
        itemStyle: {
          borderRadius: [6, 6, 0, 0]
        },
        data: data.taskExecutions
      },
      {
        name: "邮件成功率",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: {
          width: 2.5
        },
        areaStyle: {
          color: "rgba(217, 119, 6, 0.1)"
        },
        data: data.mailSuccessRate
      }
    ]
  };
}

async function renderTrendChart() {
  await nextTick();

  if (!chartRef.value) return;

  trendChart ??= echarts.init(chartRef.value);
  trendChart.setOption(buildTrendOption(trendData.value), true);
  trendChart.resize();
}

async function loadTrend(range = activeRange.value) {
  trendLoading.value = true;

  try {
    const { data } = await getWorkbenchTrends(range);
    trendData.value = data ?? emptyTrend;
  } catch (error) {
    console.error(error);
    message("加载工作台趋势失败", { type: "error" });
  } finally {
    trendLoading.value = false;
  }
}

async function loadWorkbench() {
  loading.value = true;
  loadErrorText.value = "";

  try {
    const [summaryResponse, todoResponse, activityResponse] = await Promise.all(
      [getWorkbenchSummary(), getWorkbenchTodos(), getWorkbenchActivities()]
    );

    summary.value = summaryResponse.data ?? emptySummary;
    todoList.value = todoResponse.data ?? [];
    activityList.value = activityResponse.data ?? [];
    await loadTrend(activeRange.value);
    lastLoadedAt.value = dayjs().format("YYYY-MM-DD HH:mm");
  } catch (error) {
    console.error(error);
    loadErrorText.value = "工作台数据加载失败，请稍后刷新重试";
    message("加载工作台数据失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function handleRangeChange(range: string | number | boolean) {
  const nextRange = range === "30d" ? "30d" : "7d";

  if (
    activeRange.value === nextRange &&
    trendData.value.range === nextRange &&
    trendData.value.categories.length > 0
  ) {
    return;
  }

  activeRange.value = nextRange;
  void loadTrend(nextRange);
}

watch(
  () => trendData.value,
  () => {
    void renderTrendChart();
  },
  { deep: true }
);

useResizeObserver(chartRef, () => {
  trendChart?.resize();
});

let themeObserver: MutationObserver | null = null;

onMounted(() => {
  void loadWorkbench();
  themeObserver = new MutationObserver(() => {
    if (trendChart) {
      trendChart.setOption(buildTrendOption(trendData.value), true);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
  });
});

onActivated(() => {
  void renderTrendChart();
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
  trendChart?.dispose();
  trendChart = null;
});
</script>

<template>
  <div class="workbench">
    <el-alert
      v-if="loadErrorText"
      class="workbench-alert"
      :title="loadErrorText"
      type="warning"
      show-icon
      :closable="false"
    />

    <section v-loading="loading" class="hero">
      <div class="hero__main">
        <div class="hero__eyebrow">
          <span class="hero__greeting">{{ greeting }}，{{ displayName }}</span>
          <span class="hero__pulse" />
          <span class="hero__status">工作台在线</span>
        </div>
        <h1 class="hero__title">{{ headline.title || "系统运行一切正常" }}</h1>
        <p class="hero__desc">
          {{
            headline.description ||
            "这里会聚合系统配置、邮件发送和任务执行的关键数据。"
          }}
        </p>
        <div class="hero__meta">
          <span
            ><IconifyIconOnline icon="ri:refresh-line" /> 最近更新
            {{ updatedAtText }}</span
          >
          <span
            ><IconifyIconOnline icon="ri:time-line" />
            {{ currentTimeText }}</span
          >
        </div>
      </div>
      <aside class="hero__aside">
        <div class="focus-stack">
          <div class="focus-stack__label">今日关注</div>
          <div class="focus-stack__tags">
            <span
              v-for="item in focusItems"
              :key="item.label"
              class="focus-chip"
              :data-type="item.type"
            >
              <span class="focus-chip__k">{{ item.label }}</span>
              <span class="focus-chip__v">{{ item.value }}</span>
            </span>
          </div>
        </div>
        <button
          class="hero__refresh"
          :disabled="loading"
          @click="loadWorkbench"
        >
          <IconifyIconOnline icon="ri:refresh-line" />
          <span>刷新首页</span>
        </button>
      </aside>
    </section>

    <section class="kpi-grid">
      <article
        v-for="(card, i) in summaryCards"
        :key="card.key"
        class="kpi-card"
        :class="{ 'kpi-card--wide': i === 0, 'is-clickable': card.path }"
        :style="{ '--i': i, '--accent': card.color }"
        :disabled="!card.path"
        @click="navigateTo(card.path)"
      >
        <div class="kpi-card__top">
          <span class="kpi-card__icon"
            ><IconifyIconOnline :icon="card.icon"
          /></span>
          <span class="kpi-card__label">{{ card.label }}</span>
          <span class="kpi-card__trend" :class="`is-${card.trend}`">
            {{ getDeltaSymbol(card.trend) }} {{ getTrendLabel(card.trend) }}
          </span>
        </div>
        <div class="kpi-card__value-row">
          <strong class="kpi-card__value">{{ formatCardValue(card) }}</strong>
          <span class="kpi-card__delta" :class="`is-${card.trend}`">
            {{ formatDelta(card) }}
          </span>
        </div>
        <p class="kpi-card__desc">{{ card.description }}</p>
      </article>
    </section>

    <section class="trend-panel">
      <header class="trend-panel__head">
        <div>
          <h2 class="trend-panel__title">运行趋势</h2>
          <p class="trend-panel__sub">
            奖励发放、邮件成功率和任务执行量统一在这里看。
          </p>
        </div>
        <el-radio-group
          v-model="activeRange"
          size="small"
          @change="handleRangeChange"
        >
          <el-radio-button value="7d">近 7 天</el-radio-button>
          <el-radio-button value="30d">近 30 天</el-radio-button>
        </el-radio-group>
      </header>
      <div class="trend-metrics">
        <div
          v-for="item in trendMetrics"
          :key="item.label"
          class="trend-metric"
        >
          <span class="trend-metric__icon"
            ><IconifyIconOnline :icon="item.icon"
          /></span>
          <div class="trend-metric__text">
            <span class="trend-metric__label">{{ item.label }}</span>
            <strong class="trend-metric__value">{{ item.value }}</strong>
          </div>
        </div>
      </div>
      <div ref="chartRef" v-loading="trendLoading" class="trend-chart" />
    </section>

    <section class="dual-grid">
      <article class="list-panel">
        <header class="list-panel__head">
          <div>
            <h2 class="list-panel__title">待办推进</h2>
            <p class="list-panel__sub">{{ todoSummaryText }}</p>
          </div>
        </header>
        <div v-if="todoList.length" class="todo-stack">
          <button
            v-for="(item, i) in todoList"
            :key="item.id"
            class="todo-row"
            :class="`is-${item.status}`"
            :style="{ '--i': i }"
            @click="navigateTo(item.path)"
          >
            <span class="todo-row__bar" />
            <div class="todo-row__body">
              <div class="todo-row__title">{{ item.title }}</div>
              <div class="todo-row__desc">{{ item.description }}</div>
            </div>
            <div class="todo-row__meta">
              <el-tag :type="item.status" size="small" effect="light" round>
                {{ item.tag }}
              </el-tag>
              <span class="todo-row__time">
                <IconifyIconOnline icon="ri:calendar-check-line" />
                {{ item.dueTime }}
              </span>
              <span class="todo-row__action">{{ item.actionText }} ›</span>
            </div>
          </button>
        </div>
        <el-empty v-else description="暂无待办" :image-size="64" />
      </article>

      <article class="list-panel">
        <header class="list-panel__head">
          <div>
            <h2 class="list-panel__title">最近动态</h2>
            <p class="list-panel__sub">{{ activitySummaryText }}</p>
          </div>
        </header>
        <el-timeline v-if="activityList.length" class="activity-tl">
          <el-timeline-item
            v-for="item in activityList"
            :key="item.id"
            :timestamp="item.time"
            placement="top"
            hollow
          >
            <button class="activity-row" @click="navigateTo(item.path)">
              <div class="activity-row__head">
                <span class="activity-row__icon">
                  <IconifyIconOnline :icon="item.icon" />
                </span>
                <strong>{{ item.title }}</strong>
              </div>
              <p class="activity-row__desc">{{ item.description }}</p>
              <span class="activity-row__op">
                <IconifyIconOnline icon="ri:user-line" />
                {{ item.operator }}
              </span>
            </button>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无动态" :image-size="64" />
      </article>
    </section>

    <section class="quick-rail">
      <span class="quick-rail__label">快捷入口</span>
      <div class="quick-rail__list">
        <button
          v-for="entry in quickEntries"
          :key="entry.key"
          class="quick-chip"
          :style="{ '--accent': entry.accent }"
          @click="navigateTo(entry.path)"
        >
          <span class="quick-chip__icon"
            ><IconifyIconOnline :icon="entry.icon"
          /></span>
          <span class="quick-chip__text">
            <strong>{{ entry.title }}</strong>
            <small>{{ entry.description }}</small>
          </span>
          <span class="quick-chip__arrow">›</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>


@keyframes wb-fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes wb-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(1.6);
  }
}

/* ============ Responsive ============ */
@media (width <= 1280px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kpi-card--wide {
    grid-column: span 2;
  }

  .dual-grid {
    grid-template-columns: 1fr;
  }

  .quick-rail__list {
    flex-wrap: wrap;
  }

  .quick-chip {
    flex: 1 1 calc(50% - 5px);
    min-width: 0;
  }
}

@media (width <= 768px) {
  .workbench {
    padding: 12px;
  }

  .hero {
    flex-direction: column;
    padding: 20px;
  }

  .hero__aside {
    width: 100%;
  }

  .kpi-grid,
  .trend-metrics {
    grid-template-columns: 1fr;
  }

  .kpi-card--wide {
    grid-column: span 1;
  }

  .trend-panel__head,
  .list-panel__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .todo-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .todo-row__meta {
    flex-direction: row;
    align-items: center;
  }

  .quick-chip {
    flex: 1 1 100%;
  }
}

.workbench {
  --wb-gap: 16px;
  --wb-radius: 14px;
  --wb-border: var(--el-border-color-lighter);
  --wb-card: var(--el-bg-color-overlay);
  --wb-shadow: 0 1px 2px rgb(0 0 0 / 3%), 0 8px 24px rgb(0 0 0 / 4%);
  --wb-shadow-hover: 0 2px 4px rgb(0 0 0 / 4%), 0 16px 40px rgb(0 0 0 / 8%);

  display: flex;
  flex-direction: column;
  gap: var(--wb-gap);
  min-height: 100%;
  padding: 20px;
  background:
    radial-gradient(
        circle at 1px 1px,
        var(--el-fill-color-dark, rgb(0 0 0 / 4%)) 1px,
        transparent 0
      )
      0 0 / 22px 22px,
    var(--el-bg-color);
}

.workbench-alert {
  margin-bottom: 0;
}

/* ============ Hero ============ */
.hero {
  display: flex;
  gap: 24px;
  align-items: stretch;
  justify-content: space-between;
  padding: 28px 28px 24px;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-shadow);
  animation: wb-fade-up 0.5s ease both;
}

.hero__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.hero__eyebrow {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.hero__greeting {
  letter-spacing: 0.01em;
}

.hero__pulse {
  width: 7px;
  height: 7px;
  background: var(--el-color-success);
  border-radius: 50%;
  animation: wb-pulse 2s ease-in-out infinite;
}

.hero__status {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.hero__title {
  margin: 0;
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 800;
  line-height: 1.15;
  color: var(--el-text-color-primary);
  letter-spacing: -0.03em;
}

.hero__desc {
  max-width: 620px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.75;
  color: var(--el-text-color-regular);
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
}

.hero__aside {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 14px;
  justify-content: space-between;
  width: min(300px, 32%);
}

.focus-stack {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
}

.focus-stack__label {
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.focus-stack__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.focus-chip {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  padding: 5px 11px;
  font-size: 13px;
  background: var(--el-bg-color);
  border: 1px solid var(--wb-border);
  border-radius: 999px;
}

.focus-chip__k {
  color: var(--el-text-color-secondary);
}

.focus-chip__v {
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.focus-chip[data-type="primary"] {
  border-color: var(--el-color-primary-light-6);
}

.focus-chip[data-type="success"] {
  border-color: var(--el-color-success-light-6);
}

.focus-chip[data-type="warning"] {
  border-color: var(--el-color-warning-light-6);
}

.focus-chip[data-type="danger"] {
  border-color: var(--el-color-danger-light-6);
}

.hero__refresh {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
  cursor: pointer;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--el-color-primary-light-8);
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

/* ============ KPI ============ */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--wb-gap);
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  text-align: left;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-shadow);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  animation: wb-fade-up 0.5s ease both;
  animation-delay: calc(var(--i, 0) * 60ms + 80ms);

  &--wide {
    grid-column: span 2;
  }

  &.is-clickable {
    cursor: pointer;
  }

  &.is-clickable:hover {
    border-color: var(--accent, var(--el-color-primary-light-6));
    box-shadow: var(--wb-shadow-hover);
    transform: translateY(-2px);
  }

  &:disabled {
    color: inherit;
  }
}

.kpi-card__top {
  display: flex;
  gap: 10px;
  align-items: center;
}

.kpi-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 18px;
  color: var(--accent, var(--el-color-primary));
  background: color-mix(
    in srgb,
    var(--accent, var(--el-color-primary)) 12%,
    transparent
  );
  border-radius: 10px;
}

.kpi-card__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.kpi-card__trend {
  padding: 2px 8px;
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--el-fill-color-lighter);
  border-radius: 999px;

  &.is-up {
    color: var(--el-color-success);
  }

  &.is-down {
    color: var(--el-color-warning);
  }

  &.is-flat {
    color: var(--el-text-color-secondary);
  }
}

.kpi-card__value-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.kpi-card__value {
  font-size: 32px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.kpi-card--wide .kpi-card__value {
  font-size: 40px;
}

.kpi-card__delta {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  &.is-up {
    color: var(--el-color-success);
  }

  &.is-down {
    color: var(--el-color-warning);
  }

  &.is-flat {
    color: var(--el-text-color-secondary);
  }
}

.kpi-card__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

/* ============ Trend ============ */
.trend-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-shadow);
  animation: wb-fade-up 0.5s ease both;
  animation-delay: 320ms;
}

.trend-panel__head {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.trend-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.trend-panel__sub {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.trend-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.trend-metric {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
}

.trend-metric__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
}

.trend-metric__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trend-metric__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.trend-metric__value {
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
  letter-spacing: -0.01em;
}

.trend-chart {
  width: 100%;
  min-height: 320px;
}

/* ============ Dual grid ============ */
.dual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--wb-gap);
}

.list-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-shadow);
  animation: wb-fade-up 0.5s ease both;
  animation-delay: 400ms;
}

.list-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.list-panel__sub {
  margin: 5px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* todo */
.todo-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  text-align: left;
  background: var(--el-bg-color);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
  animation: wb-fade-up 0.4s ease both;
  animation-delay: calc(var(--i, 0) * 50ms + 480ms);

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-7);
    transform: translateY(-1px);
  }
}

.todo-row__bar {
  flex-shrink: 0;
  align-self: stretch;
  width: 3px;
  background: var(--el-text-color-placeholder);
  border-radius: 999px;
}

.todo-row.is-danger .todo-row__bar {
  background: var(--el-color-danger);
}

.todo-row.is-warning .todo-row__bar {
  background: var(--el-color-warning);
}

.todo-row.is-info .todo-row__bar {
  background: var(--el-color-primary);
}

.todo-row.is-primary .todo-row__bar {
  background: var(--el-color-primary);
}

.todo-row.is-success .todo-row__bar {
  background: var(--el-color-success);
}

.todo-row__body {
  flex: 1;
  min-width: 0;
}

.todo-row__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.todo-row__desc {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  -webkit-line-clamp: 1;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
}

.todo-row__meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.todo-row__time {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.todo-row__action {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

/* activity */
.activity-tl {
  padding-top: 0;
}

.activity-row {
  width: 100%;
  padding: 2px 0 2px 4px;
  text-align: left;
  background: transparent;
  border: 0;
  transition: opacity 0.18s ease;

  &:hover {
    opacity: 0.75;
  }
}

.activity-row__head {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.activity-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 15px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 9px;
}

.activity-row__desc {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.activity-row__op {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ============ Quick rail ============ */
.quick-rail {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 20px;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: var(--wb-radius);
  box-shadow: var(--wb-shadow);
  animation: wb-fade-up 0.5s ease both;
  animation-delay: 560ms;
}

.quick-rail__label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.quick-rail__list {
  display: flex;
  flex: 1;
  gap: 10px;
  overflow-x: auto;
}

.quick-chip {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  min-width: 200px;
  padding: 12px 16px;
  text-align: left;
  background: var(--el-bg-color);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--accent, var(--el-color-primary-light-7));
    transform: translateY(-2px);
  }
}

.quick-chip__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 19px;
  color: var(--accent, var(--el-color-primary));
  background: color-mix(
    in srgb,
    var(--accent, var(--el-color-primary)) 12%,
    transparent
  );
  border-radius: 10px;
}

.quick-chip__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  strong {
    font-size: 14px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.quick-chip__arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--el-text-color-placeholder);
}
</style>
