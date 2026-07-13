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
  WorkbenchTrendData,
  WorkbenchTrendRange
} from "@/api/workbench";

defineOptions({ name: "Welcome" });

type ModuleKey = "summary" | "health" | "todos" | "activities" | "trend";
type ModuleState = Record<ModuleKey, boolean>;

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
const emptyHealth: WorkbenchHealthData = { generatedAt: "", lights: [] };

const router = useRouter();
const userStore = useUserStoreHook();
const chartRef = ref<HTMLElement | null>(null);
const activeRange = ref<WorkbenchTrendRange>("7d");
const summary = ref<WorkbenchSummaryData>(emptySummary);
const trendData = ref<WorkbenchTrendData>(emptyTrend);
const health = ref<WorkbenchHealthData>(emptyHealth);
const todoList = ref<WorkbenchTodoItem[]>([]);
const activityList = ref<WorkbenchActivityItem[]>([]);
const lastLoadedAt = ref("");
const loading = ref<ModuleState>({
  summary: true,
  health: true,
  todos: true,
  activities: true,
  trend: true
});
const errors = ref<Record<ModuleKey, string>>({
  summary: "",
  health: "",
  todos: "",
  activities: "",
  trend: ""
});
const refreshing = ref(false);
let trendChart: EChartsType | null = null;
let trendRequestId = 0;

const displayName = computed(
  () => userStore.nickname || userStore.username || "管理员"
);
const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 6) return "凌晨好";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
});
const headline = computed(
  () => summary.value.headline ?? emptySummary.headline
);
const summaryCards = computed(() => summary.value.summaryCards ?? []);
const quickEntries = computed(() => summary.value.quickEntries ?? []);
const focusItems = computed(() => summary.value.focusItems ?? []);
const healthLights = computed(() => health.value.lights ?? []);
const healthRank = { down: 0, warn: 1, up: 2 } as const;
const sortedHealthLights = computed(() =>
  healthLights.value
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        healthRank[a.item.status] - healthRank[b.item.status] ||
        a.index - b.index
    )
    .map(({ item }) => item)
);
const attentionLights = computed(() =>
  sortedHealthLights.value.filter(item => item.status !== "up")
);
const healthyLights = computed(() =>
  sortedHealthLights.value.filter(item => item.status === "up")
);
const todoRank = { danger: 0, warning: 1, primary: 2, info: 3, success: 4 };
const sortedTodos = computed(() =>
  todoList.value
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        todoRank[a.item.status] - todoRank[b.item.status] || a.index - b.index
    )
    .map(({ item }) => item)
);
const overallStatus = computed<"up" | "warn" | "down">(() => {
  if (healthLights.value.some(item => item.status === "down")) return "down";
  if (healthLights.value.some(item => item.status === "warn")) return "warn";
  return "up";
});
const statusText = computed(() => {
  if (overallStatus.value === "down") return "存在服务异常";
  if (overallStatus.value === "warn") return "有项目需要关注";
  return "系统运行正常";
});
const updatedAtText = computed(
  () => headline.value.updatedAt || lastLoadedAt.value || "尚未更新"
);
const firstLoadFailed = computed(
  () =>
    Object.values(errors.value).every(Boolean) &&
    !summaryCards.value.length &&
    !healthLights.value.length
);
const hasTrendData = computed(
  () =>
    trendData.value.categories?.length && trendData.value.categories.length > 0
);

function navigateTo(path?: string) {
  if (path) void router.push(path);
}
function formatValue(card: WorkbenchSummaryCard) {
  const number = Number(card.value);
  const value = Number.isInteger(number) ? number : number.toFixed(1);
  return `${value}${card.unit ?? ""}`;
}
function formatDelta(card: WorkbenchSummaryCard) {
  const value = Math.abs(card.delta);
  const number =
    Number.isInteger(value) || value >= 10 ? value : value.toFixed(1);
  return `${card.delta > 0 ? "+" : card.delta < 0 ? "−" : ""}${number}${card.unit ?? ""}`;
}
function trendText(trend: SummaryTrend) {
  if (trend === "up") return "较前期上升";
  if (trend === "down") return "较前期下降";
  return "较前期持平";
}
function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}
function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}
function buildTrendOption(data: WorkbenchTrendData): EChartsOption {
  const dark = isDarkMode();
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
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: text }
    },
    grid: { top: 48, left: 12, right: 12, bottom: 6, containLabel: true },
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
async function renderTrendChart() {
  await nextTick();
  if (!chartRef.value || !hasTrendData.value) return;
  trendChart ??= echarts.init(chartRef.value);
  trendChart.setOption(buildTrendOption(trendData.value), true);
  trendChart.resize();
}

async function loadSummary() {
  loading.value.summary = true;
  errors.value.summary = "";
  try {
    const { data } = await getWorkbenchSummary();
    summary.value = data ?? emptySummary;
  } catch {
    errors.value.summary = "概览数据加载失败";
  } finally {
    loading.value.summary = false;
  }
}
async function loadHealth() {
  loading.value.health = true;
  errors.value.health = "";
  try {
    const { data } = await getWorkbenchHealthOverview();
    health.value = data ?? emptyHealth;
  } catch {
    errors.value.health = "运行状态加载失败";
  } finally {
    loading.value.health = false;
  }
}
async function loadTodos() {
  loading.value.todos = true;
  errors.value.todos = "";
  try {
    const { data } = await getWorkbenchTodos();
    todoList.value = data ?? [];
  } catch {
    errors.value.todos = "待办事项加载失败";
  } finally {
    loading.value.todos = false;
  }
}
async function loadActivities() {
  loading.value.activities = true;
  errors.value.activities = "";
  try {
    const { data } = await getWorkbenchActivities();
    activityList.value = data ?? [];
  } catch {
    errors.value.activities = "最近动态加载失败";
  } finally {
    loading.value.activities = false;
  }
}
async function loadTrend(range = activeRange.value) {
  const requestId = ++trendRequestId;
  loading.value.trend = true;
  errors.value.trend = "";
  try {
    const { data } = await getWorkbenchTrends(range);
    if (requestId === trendRequestId) trendData.value = data ?? emptyTrend;
  } catch {
    if (requestId === trendRequestId) errors.value.trend = "趋势数据加载失败";
  } finally {
    if (requestId === trendRequestId) loading.value.trend = false;
  }
}
async function loadWorkbench(showFeedback = false) {
  refreshing.value = true;
  await Promise.allSettled([
    loadSummary(),
    loadHealth(),
    loadTodos(),
    loadActivities(),
    loadTrend(activeRange.value)
  ]);
  lastLoadedAt.value = dayjs().format("YYYY-MM-DD HH:mm");
  refreshing.value = false;
  if (showFeedback && !firstLoadFailed.value) {
    message("首页数据已更新", { type: "success" });
  }
}
function handleRangeChange(value: string | number | boolean | undefined) {
  activeRange.value = value === "30d" ? "30d" : "7d";
  void loadTrend(activeRange.value);
}

watch(trendData, () => void renderTrendChart(), { deep: true });
useResizeObserver(chartRef, () => trendChart?.resize());
let themeObserver: MutationObserver | null = null;
onMounted(() => {
  void loadWorkbench();
  themeObserver = new MutationObserver(() => {
    if (trendChart)
      trendChart.setOption(buildTrendOption(trendData.value), true);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
  });
});
onActivated(() => void renderTrendChart());
onBeforeUnmount(() => {
  themeObserver?.disconnect();
  trendChart?.dispose();
  trendChart = null;
});
</script>

<template>
  <main class="workbench">
    <el-alert
      v-if="firstLoadFailed"
      title="首页数据暂时不可用，请检查网络后重试"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button size="small" @click="loadWorkbench()">重新加载</el-button>
      </template>
    </el-alert>

    <header class="topbar">
      <div class="topbar__intro">
        <p>{{ greeting }}，{{ displayName }}</p>
        <div class="topbar__title-row">
          <h1>{{ headline.title || "运营工作台" }}</h1>
          <span class="status-pill" :class="`is-${overallStatus}`">
            <i />{{ statusText }}
          </span>
        </div>
        <p class="topbar__description">
          {{ headline.description || "优先处理风险与待办，再查看业务表现。" }}
        </p>
        <div v-if="focusItems.length" class="focus-list" aria-label="重点信息">
          <span v-for="item in focusItems" :key="item.label" class="focus-item">
            <small>{{ item.label }}</small
            ><strong>{{ item.value }}</strong>
          </span>
        </div>
      </div>
      <div class="topbar__controls">
        <span class="updated">更新于 {{ updatedAtText }}</span>
        <el-radio-group
          v-model="activeRange"
          size="small"
          aria-label="趋势时间范围"
          @change="handleRangeChange"
        >
          <el-radio-button value="7d">7 天</el-radio-button>
          <el-radio-button value="30d">30 天</el-radio-button>
        </el-radio-group>
        <el-button :loading="refreshing" @click="loadWorkbench(true)">
          <IconifyIconOnline icon="ri:refresh-line" />
          刷新
        </el-button>
      </div>
    </header>

    <section class="health-strip" aria-labelledby="health-title">
      <div class="section-heading section-heading--compact">
        <div>
          <span class="eyebrow">实时监测</span>
          <h2 id="health-title">运行状态</h2>
        </div>
        <span v-if="attentionLights.length" class="attention-count">
          {{ attentionLights.length }} 项需关注
        </span>
        <span v-else-if="!loading.health" class="all-clear">全部正常</span>
      </div>
      <div v-if="errors.health" class="inline-error">
        <span>{{ errors.health }}</span>
        <button @click="loadHealth">重试</button>
      </div>
      <div v-else v-loading="loading.health" class="health-strip__content">
        <button
          v-for="light in attentionLights"
          :key="light.key"
          class="health-alert"
          :class="`is-${light.status}`"
          :disabled="!light.path"
          @click="navigateTo(light.path)"
        >
          <span class="health-alert__icon"
            ><IconifyIconOnline :icon="light.icon"
          /></span>
          <span class="health-alert__copy">
            <small>{{ light.label }}</small>
            <strong>{{ light.primary }}</strong>
            <em>{{ light.secondary }}</em>
          </span>
          <IconifyIconOnline v-if="light.path" icon="ri:arrow-right-line" />
        </button>
        <div v-if="healthyLights.length" class="healthy-list">
          <button
            v-for="light in healthyLights"
            :key="light.key"
            :disabled="!light.path"
            @click="navigateTo(light.path)"
          >
            <i />
            <span
              ><small>{{ light.label }}</small
              ><strong>{{ light.primary }}</strong></span
            >
          </button>
        </div>
        <p v-if="!loading.health && !healthLights.length" class="empty-copy">
          暂无运行状态数据
        </p>
      </div>
    </section>

    <section class="primary-grid">
      <article class="panel action-panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">现在需要处理</span>
            <h2>行动中心</h2>
          </div>
          <span class="counter">{{ todoList.length }}</span>
        </div>
        <div v-if="errors.todos" class="inline-error">
          <span>{{ errors.todos }}</span
          ><button @click="loadTodos">重试</button>
        </div>
        <div v-else v-loading="loading.todos" class="todo-list">
          <div
            v-for="item in sortedTodos"
            :key="item.id"
            class="todo-item"
            :class="`is-${item.status}`"
          >
            <div class="todo-item__status"><i /></div>
            <div class="todo-item__content">
              <div class="todo-item__top">
                <strong>{{ item.title }}</strong>
                <el-tag :type="item.status" size="small" effect="light">{{
                  item.tag
                }}</el-tag>
              </div>
              <p>{{ item.description }}</p>
              <span
                ><IconifyIconOnline icon="ri:time-line" />{{
                  item.dueTime
                }}</span
              >
            </div>
            <button class="todo-item__action" @click="navigateTo(item.path)">
              {{ item.actionText }}
              <IconifyIconOnline icon="ri:arrow-right-line" />
            </button>
          </div>
          <div v-if="!loading.todos && !todoList.length" class="positive-empty">
            <span><IconifyIconOnline icon="ri:checkbox-circle-line" /></span>
            <div>
              <strong>当前没有待办</strong>
              <p>所有事项均已处理，可以关注业务趋势。</p>
            </div>
          </div>
        </div>
      </article>

      <article class="panel metrics-panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">关键表现</span>
            <h2>指标概览</h2>
          </div>
        </div>
        <div v-if="errors.summary" class="inline-error">
          <span>{{ errors.summary }}</span
          ><button @click="loadSummary">重试</button>
        </div>
        <div v-else v-loading="loading.summary" class="metrics-grid">
          <component
            :is="card.path ? 'button' : 'div'"
            v-for="card in summaryCards"
            :key="card.key"
            class="metric"
            :class="{ 'is-clickable': card.path }"
            @click="navigateTo(card.path)"
          >
            <span class="metric__icon" :style="{ color: card.color }">
              <IconifyIconOnline :icon="card.icon" />
            </span>
            <span class="metric__label">{{ card.label }}</span>
            <strong>{{ formatValue(card) }}</strong>
            <span class="metric__change">
              {{ formatDelta(card) }} · {{ trendText(card.trend) }}
            </span>
            <p>{{ card.description }}</p>
            <IconifyIconOnline
              v-if="card.path"
              class="metric__arrow"
              icon="ri:arrow-right-up-line"
            />
          </component>
          <p v-if="!loading.summary && !summaryCards.length" class="empty-copy">
            暂无指标数据
          </p>
        </div>
      </article>
    </section>

    <section v-if="quickEntries.length || loading.summary" class="tool-section">
      <div class="section-heading section-heading--compact">
        <div>
          <span class="eyebrow">常用功能</span>
          <h2>快速开始</h2>
        </div>
      </div>
      <div v-loading="loading.summary" class="tool-grid">
        <button
          v-for="entry in quickEntries"
          :key="entry.key"
          class="tool-item"
          @click="navigateTo(entry.path)"
        >
          <span class="tool-item__icon" :style="{ color: entry.accent }">
            <IconifyIconOnline :icon="entry.icon" />
          </span>
          <span
            ><strong>{{ entry.title }}</strong
            ><small>{{ entry.description }}</small></span
          >
          <IconifyIconOnline icon="ri:arrow-right-s-line" />
        </button>
      </div>
    </section>

    <section class="analysis-grid">
      <article class="panel trend-panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">业务观察</span>
            <h2>运行趋势</h2>
          </div>
          <span class="range-label"
            >近 {{ activeRange === "7d" ? 7 : 30 }} 天</span
          >
        </div>
        <div v-if="errors.trend" class="module-placeholder">
          <span>{{ errors.trend }}</span
          ><button @click="loadTrend()">重新加载</button>
        </div>
        <div
          v-else-if="!loading.trend && !hasTrendData"
          class="module-placeholder"
        >
          暂无趋势数据
        </div>
        <div
          v-show="!errors.trend && (loading.trend || hasTrendData)"
          ref="chartRef"
          v-loading="loading.trend"
          class="trend-chart"
        />
      </article>

      <article class="panel activity-panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">系统记录</span>
            <h2>最近动态</h2>
          </div>
        </div>
        <div v-if="errors.activities" class="inline-error">
          <span>{{ errors.activities }}</span
          ><button @click="loadActivities">重试</button>
        </div>
        <div v-else v-loading="loading.activities" class="activity-list">
          <component
            :is="item.path ? 'button' : 'div'"
            v-for="item in activityList"
            :key="item.id"
            class="activity-item"
            :class="{ 'is-clickable': item.path }"
            @click="navigateTo(item.path)"
          >
            <span class="activity-item__icon"
              ><IconifyIconOnline :icon="item.icon"
            /></span>
            <span class="activity-item__content">
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
              <small>{{ item.operator }} · {{ item.time }}</small>
            </span>
          </component>
          <p
            v-if="!loading.activities && !activityList.length"
            class="empty-copy"
          >
            暂无最新动态
          </p>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped lang="scss">
.workbench {
  --wb-blue: #2563eb;
  --wb-teal: #0f766e;
  --wb-amber: #d97706;
  --wb-red: #dc2626;
  --wb-surface: var(--el-bg-color-overlay);
  --wb-border: var(--el-border-color-lighter);

  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  padding: 24px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-page);
}

button {
  font: inherit;
}

.topbar {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 4px 2px 12px;
  border-bottom: 1px solid var(--wb-border);
}

.topbar__intro {
  min-width: 0;
}

.topbar__intro > p:first-child,
.topbar__description {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.topbar__title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 7px 0;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 2.5vw, 34px);
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.status-pill {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 999px;
}

.status-pill i {
  width: 7px;
  height: 7px;
  background: var(--el-color-success);
  border-radius: 50%;
}

.status-pill.is-warn i {
  background: var(--wb-amber);
}

.status-pill.is-down i {
  background: var(--wb-red);
}

.focus-list {
  display: flex;
  gap: 18px;
  padding-bottom: 2px;
  margin-top: 14px;
  overflow-x: auto;
}

.focus-item {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: baseline;
}

.focus-item small {
  color: var(--el-text-color-secondary);
}

.focus-item strong {
  font-size: 13px;
}

.topbar__controls {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
}

.updated {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.topbar__controls .el-button svg {
  margin-right: 5px;
}

.panel,
.health-strip,
.tool-section {
  background: var(--wb-surface);
  border: 1px solid var(--wb-border);
  border-radius: 14px;
}

.panel {
  padding: 20px;
}

.section-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.section-heading--compact {
  margin-bottom: 12px;
}

.section-heading h2 {
  margin: 2px 0 0;
  font-size: 18px;
  line-height: 1.3;
}

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.08em;
}

.counter {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-weight: 700;
  background: var(--el-fill-color-light);
  border-radius: 10px;
}

.health-strip {
  padding: 16px 20px;
}

.attention-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--wb-red);
}

.all-clear {
  font-size: 12px;
  font-weight: 700;
  color: var(--wb-teal);
}

.health-strip__content {
  display: flex;
  gap: 10px;
  min-height: 62px;
  overflow-x: auto;
}

.health-alert {
  display: flex;
  flex: 0 0 min(310px, 80vw);
  gap: 10px;
  align-items: center;
  padding: 11px 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: color-mix(in srgb, var(--wb-amber) 8%, var(--wb-surface));
  border: 1px solid color-mix(in srgb, var(--wb-amber) 30%, var(--wb-border));
  border-radius: 10px;
}

.health-alert.is-down {
  background: color-mix(in srgb, var(--wb-red) 7%, var(--wb-surface));
  border-color: color-mix(in srgb, var(--wb-red) 30%, var(--wb-border));
}

.health-alert:disabled {
  cursor: default;
}

.health-alert__icon {
  display: grid;
  flex: 0 0 34px;
  place-items: center;
  height: 34px;
  color: var(--wb-amber);
  background: var(--el-bg-color);
  border-radius: 8px;
}

.health-alert.is-down .health-alert__icon {
  color: var(--wb-red);
}

.health-alert__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.health-alert__copy small,
.health-alert__copy em {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-style: normal;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.health-alert__copy strong {
  margin: 2px 0;
  font-size: 14px;
}

.healthy-list {
  display: flex;
  flex: 1 0 auto;
  gap: 6px;
  align-items: stretch;
}

.healthy-list button {
  display: flex;
  gap: 9px;
  align-items: center;
  min-width: 118px;
  padding: 8px 10px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.healthy-list button:hover:not(:disabled) {
  background: var(--el-fill-color-light);
}

.healthy-list button:disabled {
  cursor: default;
}

.healthy-list i {
  width: 7px;
  height: 7px;
  background: var(--wb-teal);
  border-radius: 50%;
}

.healthy-list span {
  display: flex;
  flex-direction: column;
}

.healthy-list small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.healthy-list strong {
  margin-top: 2px;
  font-size: 13px;
}

.primary-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 18px;
  align-items: stretch;
}

.action-panel,
.metrics-panel {
  min-height: 350px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 250px;
}

.todo-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 4px;
  border-bottom: 1px solid var(--wb-border);
}

.todo-item:last-child {
  border-bottom: 0;
}

.todo-item__status {
  align-self: stretch;
  width: 4px;
  background: var(--el-color-primary);
  border-radius: 999px;
}

.todo-item.is-danger .todo-item__status {
  background: var(--wb-red);
}

.todo-item.is-warning .todo-item__status {
  background: var(--wb-amber);
}

.todo-item.is-success .todo-item__status {
  background: var(--wb-teal);
}

.todo-item__content {
  flex: 1;
  min-width: 0;
}

.todo-item__top {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.todo-item__top strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  white-space: nowrap;
}

.todo-item__content p {
  display: -webkit-box;
  margin: 5px 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
  -webkit-box-orient: vertical;
}

.todo-item__content > span {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.todo-item__action {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 8px 10px;
  color: var(--el-color-primary);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 7px;
}

.todo-item__action:hover {
  background: var(--el-color-primary-light-9);
}

.positive-empty {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 210px;
}

.positive-empty > span {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 24px;
  color: var(--wb-teal);
  background: color-mix(in srgb, var(--wb-teal) 10%, transparent);
  border-radius: 12px;
}

.positive-empty strong {
  font-size: 14px;
}

.positive-empty p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 260px;
}

.metric {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px 18px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--wb-border);
  border-bottom: 1px solid var(--wb-border);
}

.metric:nth-child(2n) {
  border-right: 0;
}

.metric:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.metric.is-clickable {
  cursor: pointer;
}

.metric.is-clickable:hover {
  background: var(--el-fill-color-light);
}

.metric__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.metric__label {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric > strong {
  margin-top: 3px;
  font-size: clamp(24px, 2vw, 32px);
  letter-spacing: -0.04em;
}

.metric__change {
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.metric p {
  margin: 8px 24px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.metric__arrow {
  position: absolute;
  right: 15px;
  bottom: 17px;
  color: var(--el-text-color-placeholder);
}

.tool-section {
  padding: 16px 20px 20px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-height: 68px;
}

.tool-item {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
  border-radius: 10px;
}

.tool-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  transform: translateY(-1px);
}

.tool-item__icon {
  display: grid;
  flex: 0 0 34px;
  place-items: center;
  height: 34px;
  font-size: 18px;
  background: var(--el-bg-color);
  border-radius: 8px;
}

.tool-item > span:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.tool-item strong,
.tool-item small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-item strong {
  font-size: 13px;
}

.tool-item small {
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.analysis-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(290px, 1fr);
  gap: 18px;
}

.range-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.trend-chart {
  width: 100%;
  height: 350px;
}

.module-placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  height: 350px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.module-placeholder button,
.inline-error button {
  padding: 0;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  min-height: 350px;
}

.activity-item {
  display: flex;
  gap: 10px;
  padding: 13px 2px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--wb-border);
}

.activity-item.is-clickable {
  cursor: pointer;
}

.activity-item.is-clickable:hover strong {
  color: var(--el-color-primary);
}

.activity-item__icon {
  display: grid;
  flex: 0 0 30px;
  place-items: center;
  height: 30px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.activity-item__content {
  min-width: 0;
}

.activity-item__content strong {
  font-size: 13px;
}

.activity-item__content p {
  display: -webkit-box;
  margin: 4px 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-regular);
  -webkit-box-orient: vertical;
}

.activity-item__content small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.inline-error {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.empty-copy {
  align-self: center;
  margin: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

@media (width <= 1100px) {
  .topbar {
    flex-direction: column;
    gap: 18px;
  }

  .topbar__controls {
    width: 100%;
  }

  .updated {
    margin-right: auto;
  }

  .primary-grid,
  .analysis-grid {
    grid-template-columns: 1fr;
  }

  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .workbench {
    gap: 12px;
    padding: 12px;
  }

  .topbar {
    padding: 4px 2px 10px;
  }

  .topbar__controls {
    flex-wrap: wrap;
  }

  .updated {
    width: 100%;
  }

  .panel,
  .health-strip,
  .tool-section {
    padding: 16px;
    border-radius: 12px;
  }

  .health-strip__content {
    flex-direction: column;
    overflow: visible;
  }

  .health-alert {
    flex-basis: auto;
    width: 100%;
  }

  .healthy-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .healthy-list button {
    min-width: 0;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric,
  .metric:nth-child(2n),
  .metric:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--wb-border);
  }

  .metric:last-child {
    border-bottom: 0;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }

  .todo-item {
    align-items: flex-start;
  }

  .todo-item__action {
    padding: 7px 4px;
  }

  .trend-chart {
    height: 290px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition: none !important;
    animation: none !important;
  }
}
</style>
