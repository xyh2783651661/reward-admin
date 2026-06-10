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

function buildTrendOption(data: WorkbenchTrendData): EChartsOption {
  return {
    color: ["#2563eb", "#059669", "#d97706"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: {
        color: "#fff"
      }
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        color: "#64748b"
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
      boundaryGap: false,
      data: data.categories,
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: "#dbe4f0"
        }
      },
      axisLabel: {
        color: "#64748b"
      }
    },
    yAxis: [
      {
        type: "value",
        name: "数量",
        splitLine: {
          lineStyle: {
            color: "#edf2f7"
          }
        },
        axisLabel: {
          color: "#64748b"
        }
      },
      {
        type: "value",
        name: "成功率",
        min: 95,
        max: 100,
        splitLine: {
          show: false
        },
        axisLabel: {
          color: "#64748b",
          formatter: "{value}%"
        }
      }
    ],
    series: [
      {
        name: "奖励发放",
        type: "bar",
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [8, 8, 0, 0]
        },
        data: data.rewardIssued
      },
      {
        name: "任务执行",
        type: "bar",
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [8, 8, 0, 0]
        },
        data: data.taskExecutions
      },
      {
        name: "邮件成功率",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: {
          width: 3
        },
        areaStyle: {
          color: "rgba(217, 119, 6, 0.12)"
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

onMounted(() => {
  void loadWorkbench();
});

onActivated(() => {
  void renderTrendChart();
});

onBeforeUnmount(() => {
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

    <section v-loading="loading" class="hero-panel">
      <div class="hero-panel__content">
        <div class="hero-panel__main">
          <div class="hero-panel__eyebrow">
            <span>{{ greeting }}，{{ displayName }}</span>
            <el-tag type="success" effect="light" round>工作台在线</el-tag>
          </div>
          <h1 class="hero-panel__title">
            {{ headline.title || "系统运行一切正常" }}
          </h1>
          <p class="hero-panel__description">
            {{
              headline.description ||
              "这里会聚合系统配置、邮件发送和任务执行的关键数据。"
            }}
          </p>
          <div class="hero-panel__meta">
            <span>
              <IconifyIconOnline icon="ri:refresh-line" />
              最近更新 {{ updatedAtText }}
            </span>
            <span>
              <IconifyIconOnline icon="ri:time-line" />
              当前时间 {{ currentTimeText }}
            </span>
          </div>
        </div>
        <div class="hero-panel__aside">
          <div class="focus-card">
            <div class="focus-card__title">今日关注</div>
            <div v-if="focusItems.length" class="focus-card__list">
              <el-tag
                v-for="item in focusItems"
                :key="item.label"
                :type="item.type"
                effect="light"
                round
              >
                {{ item.label }}: {{ item.value }}
              </el-tag>
            </div>
            <el-empty v-else description="暂无关注项" :image-size="48" />
          </div>
          <el-button
            type="primary"
            plain
            :loading="loading"
            @click="loadWorkbench"
          >
            刷新首页
          </el-button>
        </div>
      </div>
    </section>

    <section class="summary-grid">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        class="summary-card"
        :class="{ 'is-clickable': card.path }"
        :disabled="!card.path"
        :style="{
          '--summary-accent': card.color
        }"
        @click="navigateTo(card.path)"
      >
        <div class="summary-card__header">
          <span class="summary-card__icon">
            <IconifyIconOnline :icon="card.icon" />
          </span>
          <span class="summary-card__trend" :class="`is-${card.trend}`">
            {{ getDeltaSymbol(card.trend) }} {{ getTrendLabel(card.trend) }}
          </span>
        </div>
        <div class="summary-card__label">{{ card.label }}</div>
        <div class="summary-card__value">{{ formatCardValue(card) }}</div>
        <div class="summary-card__delta" :class="`is-${card.trend}`">
          {{ formatDelta(card) }}
        </div>
        <p class="summary-card__description">{{ card.description }}</p>
      </button>
    </section>

    <section class="content-grid">
      <article class="panel panel--wide">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">运行趋势</h2>
            <p class="panel__subtitle">
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
        </div>
        <div class="metric-grid">
          <div
            v-for="item in trendMetrics"
            :key="item.label"
            class="metric-card"
          >
            <span class="metric-card__icon">
              <IconifyIconOnline :icon="item.icon" />
            </span>
            <span class="metric-card__label">{{ item.label }}</span>
            <strong class="metric-card__value">{{ item.value }}</strong>
          </div>
        </div>
        <div ref="chartRef" v-loading="trendLoading" class="trend-chart" />
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">快捷入口</h2>
            <p class="panel__subtitle">把常用配置和排障入口固定到首页。</p>
          </div>
        </div>
        <div v-if="quickEntries.length" class="quick-entry-list">
          <button
            v-for="entry in quickEntries"
            :key="entry.key"
            type="button"
            class="quick-entry"
            :style="{ '--quick-accent': entry.accent }"
            @click="navigateTo(entry.path)"
          >
            <span class="quick-entry__icon">
              <IconifyIconOnline :icon="entry.icon" />
            </span>
            <span class="quick-entry__text">
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.description }}</span>
            </span>
          </button>
        </div>
        <el-empty v-else description="暂无快捷入口" :image-size="72" />
      </article>
    </section>

    <section class="content-grid content-grid--bottom">
      <article class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">待办推进</h2>
            <p class="panel__subtitle">{{ todoSummaryText }}</p>
          </div>
        </div>
        <div v-if="todoList.length" class="todo-list">
          <button
            v-for="item in todoList"
            :key="item.id"
            type="button"
            class="todo-card"
            @click="navigateTo(item.path)"
          >
            <div class="todo-card__header">
              <div class="todo-card__title-wrap">
                <h3 class="todo-card__title">{{ item.title }}</h3>
                <p class="todo-card__description">{{ item.description }}</p>
              </div>
              <el-tag :type="item.status" effect="light">{{ item.tag }}</el-tag>
            </div>
            <div class="todo-card__footer">
              <span>
                <IconifyIconOnline icon="ri:calendar-check-line" />
                截止 {{ item.dueTime }}
              </span>
              <span class="todo-card__action">{{ item.actionText }}</span>
            </div>
          </button>
        </div>
        <el-empty v-else description="暂无待办" :image-size="72" />
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">最近动态</h2>
            <p class="panel__subtitle">{{ activitySummaryText }}</p>
          </div>
        </div>
        <el-timeline v-if="activityList.length" class="activity-timeline">
          <el-timeline-item
            v-for="item in activityList"
            :key="item.id"
            :timestamp="item.time"
            placement="top"
            hollow
          >
            <button
              type="button"
              class="activity-card"
              @click="navigateTo(item.path)"
            >
              <div class="activity-card__title">
                <span class="activity-card__icon">
                  <IconifyIconOnline :icon="item.icon" />
                </span>
                <strong>{{ item.title }}</strong>
              </div>
              <p class="activity-card__description">{{ item.description }}</p>
              <span class="activity-card__operator">
                <IconifyIconOnline icon="ri:user-line" />
                {{ item.operator }}
              </span>
            </button>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无动态" :image-size="72" />
      </article>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.workbench {
  --workbench-radius: 16px;
  --workbench-gap: 16px;
  --workbench-shadow: 0 10px 28px rgb(0 0 0 / 4%);

  display: flex;
  flex-direction: column;
  gap: var(--workbench-gap);
  min-height: 100%;
  padding: 16px;
  background:
    radial-gradient(circle at 8% 0, rgb(64 158 255 / 10%), transparent 26%),
    var(--el-bg-color);
}

.workbench-alert {
  margin-bottom: 0;
}

.hero-panel,
.panel,
.summary-card {
  position: relative;
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--workbench-radius);
  box-shadow: var(--workbench-shadow);
}

.hero-panel {
  padding: 24px;
  color: var(--el-text-color-primary);
  background:
    linear-gradient(135deg, rgb(64 158 255 / 12%), transparent 42%),
    var(--el-bg-color-overlay);
  border-color: var(--el-color-primary-light-8);

  &::after {
    position: absolute;
    right: -48px;
    bottom: -72px;
    width: 220px;
    height: 220px;
    content: "";
    background: var(--el-color-primary-light-9);
    border-radius: 50%;
    opacity: 0.7;
  }
}

.hero-panel__content {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 20px;
  align-items: stretch;
  justify-content: space-between;
}

.hero-panel__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.hero-panel__eyebrow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.hero-panel__title {
  margin: 0;
  font-size: clamp(24px, 3.2vw, 34px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.hero-panel__description {
  max-width: 680px;
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

.hero-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 6px 10px;
    background: var(--el-fill-color-lighter);
    border-radius: 999px;
  }
}

.hero-panel__aside {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 12px;
  justify-content: space-between;
  width: min(320px, 36%);
}

.focus-card {
  padding: 14px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 14px;
}

.focus-card__title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.focus-card__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--workbench-gap);
}

.summary-card {
  padding: 18px;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: default;
  border-top: 3px solid var(--summary-accent);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;

  &::before {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 76px;
    height: 76px;
    content: "";
    background: var(--el-fill-color-lighter);
    border-radius: 50%;
    opacity: 0.8;
  }

  &.is-clickable {
    cursor: pointer;
  }

  &.is-clickable:hover {
    border-color: var(--el-color-primary-light-7);
    box-shadow: 0 14px 32px rgb(64 158 255 / 10%);
    transform: translateY(-2px);
  }

  &:disabled {
    color: inherit;
  }
}

.summary-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--summary-accent);
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
}

.summary-card__trend {
  position: relative;
  z-index: 1;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-info);
  white-space: nowrap;
  background: var(--el-fill-color-lighter);
  border-radius: 999px;

  &.is-up {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  &.is-down {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }
}

.summary-card__label,
.summary-card__value,
.summary-card__delta,
.summary-card__description {
  position: relative;
  z-index: 1;
}

.summary-card__label {
  margin-top: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary-card__value {
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 30px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  white-space: nowrap;
}

.summary-card__delta {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;

  &.is-up {
    color: var(--el-color-success);
  }

  &.is-down {
    color: var(--el-color-warning);
  }

  &.is-flat {
    color: var(--el-color-info);
  }
}

.summary-card__description {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
  gap: var(--workbench-gap);
}

.content-grid--bottom {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.panel__header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.panel__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.panel__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: center;
  padding: 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 14px;
}

.metric-card__icon {
  display: inline-flex;
  grid-row: span 2;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
}

.metric-card__label {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric-card__value {
  display: block;
  margin-top: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.trend-chart {
  width: 100%;
  min-height: 320px;
}

.quick-entry-list,
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-entry,
.todo-card,
.activity-card {
  width: 100%;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
}

.quick-entry,
.todo-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 14px;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-7);
    transform: translateY(-1px);
  }
}

.quick-entry {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px;
}

.quick-entry__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: var(--quick-accent);
  background: var(--el-fill-color-lighter);
  border-radius: 12px;
}

.quick-entry__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 15px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }

  span {
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
}

.todo-card {
  padding: 14px;
}

.todo-card__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.todo-card__title-wrap {
  min-width: 0;
}

.todo-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.todo-card__description {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.todo-card__footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);

  span {
    display: inline-flex;
    gap: 5px;
    align-items: center;
  }
}

.todo-card__action {
  font-weight: 600;
  color: var(--el-color-primary);
}

.activity-timeline {
  padding-top: 0;
}

.activity-card {
  padding: 0 0 0 4px;
}

.activity-card__title {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 15px;
  color: var(--el-text-color-primary);
}

.activity-card__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 16px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 12px;
}

.activity-card__description {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-secondary);
}

.activity-card__operator {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (width <= 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid,
  .content-grid--bottom {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .workbench {
    padding: 10px;
  }

  .hero-panel {
    padding: 18px;
  }

  .hero-panel__content,
  .panel__header,
  .todo-card__header,
  .todo-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-panel__aside {
    width: 100%;
  }

  .summary-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .panel,
  .summary-card {
    padding: 16px;
  }

  .trend-chart {
    min-height: 300px;
  }
}
</style>
