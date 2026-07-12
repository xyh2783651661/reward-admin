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
  getWorkbenchHealthOverview,
  getWorkbenchSummary,
  getWorkbenchTodos,
  getWorkbenchTrends
} from "@/api/workbench";
import type {
  SummaryTrend,
  WorkbenchActivityItem,
  WorkbenchHealthData,
  WorkbenchHealthLight,
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
  headline: { title: "", description: "", updatedAt: "" },
  focusItems: [],
  summaryCards: [],
  quickEntries: []
};

const emptyTrend: WorkbenchTrendData = {
  range: "7d",
  categories: [],
  rewardIssued: [],
  aiCallCount: [],
  taskExecutions: []
};

const emptyHealth: WorkbenchHealthData = {
  generatedAt: "",
  lights: []
};

const router = useRouter();
const userStore = useUserStoreHook();
const loading = ref(false);
const trendLoading = ref(false);
const chartRef = ref<HTMLElement | null>(null);
const activeRange = ref<TrendRange>("7d");
const summary = ref<WorkbenchSummaryData>(emptySummary);
const trendData = ref<WorkbenchTrendData>(emptyTrend);
const health = ref<WorkbenchHealthData>(emptyHealth);
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
const headline = computed(
  () => summary.value.headline ?? emptySummary.headline
);
const healthLights = computed(() => health.value.lights ?? []);
const healthWarnCount = computed(
  () => healthLights.value.filter(l => l.status !== "up").length
);
const overallHealthStatus = computed<"up" | "warn" | "down">(() => {
  if (healthLights.value.some(l => l.status === "down")) return "down";
  if (healthLights.value.some(l => l.status === "warn")) return "warn";
  return "up";
});
const overallHealthText = computed(() => {
  if (healthWarnCount.value === 0) return "全部通道运行正常";
  return `${healthWarnCount.value} 项需要关注`;
});
const todoCount = computed(() => todoList.value.length);
const updatedAtText = computed(() => {
  return headline.value.updatedAt || lastLoadedAt.value || "等待刷新";
});
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

function navigateTo(path?: string) {
  if (path) {
    router.push(path);
  }
}

function handleLightClick(light: WorkbenchHealthLight) {
  if (light.path) {
    router.push(light.path);
  }
}

function getTrendLabel(trend: SummaryTrend) {
  if (trend === "up") return "较昨日 ↑";
  if (trend === "down") return "较昨日 ↓";
  return "与昨日持平";
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
    color: ["#2563eb", "#10b981", "#8b5cf6"],
    tooltip: {
      trigger: "axis",
      backgroundColor: tooltipBg,
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: "#fff", fontSize: 12 }
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      icon: "roundRect",
      textStyle: { color: axisLabel }
    },
    grid: {
      top: 46,
      left: 16,
      right: 16,
      bottom: 8,
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: true,
      data: data.categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: axisLine } },
      axisLabel: { color: axisLabel }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: splitLine, type: "dashed" } },
      axisLabel: { color: axisLabel }
    },
    series: [
      {
        name: "奖励分析",
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: data.rewardIssued
      },
      {
        name: "AI 调用",
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: data.aiCallCount
      },
      {
        name: "任务执行",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 2.5 },
        areaStyle: { color: "rgba(139, 92, 246, 0.1)" },
        data: data.taskExecutions
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
    const [summaryRes, healthRes, todoRes, activityRes] = await Promise.all([
      getWorkbenchSummary(),
      getWorkbenchHealthOverview(),
      getWorkbenchTodos(),
      getWorkbenchActivities()
    ]);
    summary.value = summaryRes.data ?? emptySummary;
    health.value = healthRes.data ?? emptyHealth;
    todoList.value = todoRes.data ?? [];
    activityList.value = activityRes.data ?? [];
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

    <!-- Hero：只保留问候 + 一句状态 + 刷新 -->
    <section v-loading="loading" class="hero">
      <div class="hero__main">
        <div class="hero__eyebrow">
          <span class="hero__greeting">{{ greeting }}，{{ displayName }}</span>
          <span class="hero__pulse" :class="`is-${overallHealthStatus}`" />
          <span class="hero__status">{{ overallHealthText }}</span>
        </div>
        <h1 class="hero__title">{{ headline.title || "系统运行一切正常" }}</h1>
        <p class="hero__desc">
          {{
            headline.description ||
            "本页优先展示需要动手处理的信号；越往下越轻量。"
          }}
        </p>
        <div class="hero__meta">
          <span>
            <IconifyIconOnline icon="ri:refresh-line" />
            最近更新 {{ updatedAtText }}
          </span>
        </div>
      </div>
      <button class="hero__refresh" :disabled="loading" @click="loadWorkbench">
        <IconifyIconOnline icon="ri:refresh-line" />
        <span>刷新首页</span>
      </button>
    </section>

    <!-- Layer 1：健康总览 -->
    <section class="health-grid">
      <button
        v-for="light in healthLights"
        :key="light.key"
        class="health-card"
        :class="[`is-${light.status}`, light.path && 'is-clickable']"
        :disabled="!light.path"
        @click="handleLightClick(light)"
      >
        <span class="health-card__indicator" />
        <span class="health-card__icon">
          <IconifyIconOnline :icon="light.icon" />
        </span>
        <div class="health-card__body">
          <div class="health-card__label">{{ light.label }}</div>
          <div class="health-card__primary">{{ light.primary }}</div>
          <div class="health-card__secondary">{{ light.secondary }}</div>
        </div>
      </button>
    </section>

    <!-- Layer 2a: KPI -->
    <section class="kpi-grid">
      <article
        v-for="(card, i) in summaryCards"
        :key="card.key"
        class="kpi-card"
        :class="{ 'is-clickable': card.path }"
        :style="{ '--i': i, '--accent': card.color }"
        :disabled="!card.path"
        @click="navigateTo(card.path)"
      >
        <div class="kpi-card__top">
          <span class="kpi-card__icon">
            <IconifyIconOnline :icon="card.icon" />
          </span>
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

    <!-- Layer 2b: 趋势图 -->
    <section class="trend-panel">
      <header class="trend-panel__head">
        <div>
          <h2 class="trend-panel__title">运行趋势</h2>
          <p class="trend-panel__sub">奖励分析、AI 调用与任务执行体量。</p>
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
      <div ref="chartRef" v-loading="trendLoading" class="trend-chart" />
    </section>

    <!-- Layer 3: 待办 + 动态 -->
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

    <!-- 快捷入口 -->
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
          <span class="quick-chip__icon">
            <IconifyIconOnline :icon="entry.icon" />
          </span>
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

@media (width <= 1280px) {
  .health-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .health-grid,
  .kpi-grid {
    grid-template-columns: 1fr;
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
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
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
  margin-bottom: 12px;
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
  border-radius: 50%;
  animation: wb-pulse 2s ease-in-out infinite;

  &.is-up {
    background: var(--el-color-success);
  }

  &.is-warn {
    background: var(--el-color-warning);
  }

  &.is-down {
    background: var(--el-color-danger);
  }
}

.hero__status {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.hero__title {
  margin: 0;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
  line-height: 1.15;
  color: var(--el-text-color-primary);
  letter-spacing: -0.03em;
}

.hero__desc {
  max-width: 620px;
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
}

.hero__refresh {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 40px;
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

/* ============ Health grid ============ */
.health-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
}

.health-card {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 14px 14px 18px;
  overflow: hidden;
  text-align: left;
  background: var(--wb-card);
  border: 1px solid var(--wb-border);
  border-radius: 12px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  animation: wb-fade-up 0.4s ease both;

  &.is-clickable {
    cursor: pointer;
  }

  &.is-clickable:hover {
    box-shadow: var(--wb-shadow-hover);
    transform: translateY(-2px);
  }

  &:disabled {
    color: inherit;
    cursor: default;
  }
}

.health-card__indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
}

.health-card.is-up .health-card__indicator {
  background: var(--el-color-success);
}

.health-card.is-warn .health-card__indicator {
  background: var(--el-color-warning);
}

.health-card.is-down .health-card__indicator {
  background: var(--el-color-danger);
}

.health-card__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  border-radius: 8px;
}

.health-card.is-up .health-card__icon {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.health-card.is-warn .health-card__icon {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.health-card.is-down .health-card__icon {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.health-card__body {
  flex: 1;
  min-width: 0;
}

.health-card__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.health-card__primary {
  margin: 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.health-card__secondary {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
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
  gap: 10px;
  padding: 18px 20px;
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
  width: 32px;
  height: 32px;
  font-size: 17px;
  color: var(--accent, var(--el-color-primary));
  background: color-mix(
    in srgb,
    var(--accent, var(--el-color-primary)) 12%,
    transparent
  );
  border-radius: 9px;
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
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.kpi-card__delta {
  font-size: 13px;
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
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

/* ============ Trend ============ */
.trend-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.trend-panel__sub {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--el-text-color-secondary);
}

.trend-chart {
  width: 100%;
  min-height: 280px;
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
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.list-panel__sub {
  margin: 4px 0 0;
  font-size: 12.5px;
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
  width: 36px;
  height: 36px;
  font-size: 18px;
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
