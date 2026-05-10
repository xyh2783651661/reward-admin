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

function navigateTo(path?: string) {
  if (path) {
    router.push(path);
  }
}

function getTrendTagType(trend: SummaryTrend) {
  if (trend === "up") return "success";
  if (trend === "down") return "warning";
  return "info";
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

  try {
    const [summaryResponse, todoResponse, activityResponse] = await Promise.all(
      [getWorkbenchSummary(), getWorkbenchTodos(), getWorkbenchActivities()]
    );

    summary.value = summaryResponse.data ?? emptySummary;
    todoList.value = todoResponse.data ?? [];
    activityList.value = activityResponse.data ?? [];
    await loadTrend(activeRange.value);
  } catch (error) {
    console.error(error);
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
    <section v-loading="loading" class="hero-panel">
      <div class="hero-panel__content">
        <div class="hero-panel__main">
          <p class="hero-panel__eyebrow">{{ greeting }}，{{ displayName }}</p>
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
            <span>最近更新 {{ headline.updatedAt || "--" }}</span>
            <span>当前时间 {{ dayjs().format("YYYY-MM-DD HH:mm") }}</span>
          </div>
        </div>
        <div class="hero-panel__aside">
          <el-tag
            v-for="item in focusItems"
            :key="item.label"
            :type="item.type"
            effect="dark"
            round
          >
            {{ item.label }}: {{ item.value }}
          </el-tag>
        </div>
      </div>
    </section>

    <section class="summary-grid">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        class="summary-card"
        :style="{
          '--summary-accent': card.color,
          cursor: card.path ? 'pointer' : 'default'
        }"
        @click="navigateTo(card.path)"
      >
        <div class="summary-card__header">
          <span class="summary-card__icon">
            <IconifyIconOnline :icon="card.icon" />
          </span>
          <el-tag
            :type="getTrendTagType(card.trend)"
            effect="plain"
            size="small"
          >
            {{ getTrendLabel(card.trend) }}
          </el-tag>
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
          <div class="metric-card">
            <span class="metric-card__label">最新奖励发放</span>
            <strong class="metric-card__value">{{ latestRewardIssued }}</strong>
          </div>
          <div class="metric-card">
            <span class="metric-card__label">最新邮件成功率</span>
            <strong class="metric-card__value">{{ latestSuccessRate }}</strong>
          </div>
          <div class="metric-card">
            <span class="metric-card__label">最新任务执行</span>
            <strong class="metric-card__value">{{
              latestTaskExecutions
            }}</strong>
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
        <div class="quick-entry-list">
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
      </article>
    </section>

    <section class="content-grid content-grid--bottom">
      <article class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">待办推进</h2>
            <p class="panel__subtitle">
              当前有 {{ todoCount }} 条事项待你确认。
            </p>
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
              <span>截止 {{ item.dueTime }}</span>
              <span class="todo-card__action">{{ item.actionText }}</span>
            </div>
          </button>
        </div>
        <el-empty v-else description="暂无待办" />
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">最近动态</h2>
            <p class="panel__subtitle">配置、版本和邮件相关动作会持续汇总。</p>
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
              <span class="activity-card__operator">{{ item.operator }}</span>
            </button>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无动态" />
      </article>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.workbench {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.hero-panel,
.panel,
.summary-card {
  position: relative;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 24px;
  box-shadow: 0 18px 44px rgb(15 23 42 / 8%);
}

.hero-panel {
  padding: 28px 32px;
  color: #eff6ff;
  background:
    radial-gradient(
      circle at top right,
      rgb(125 211 252 / 38%),
      transparent 26%
    ),
    linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #0ea5e9 100%);

  &::after {
    position: absolute;
    right: -30px;
    bottom: -60px;
    width: 220px;
    height: 220px;
    content: "";
    background: rgb(255 255 255 / 10%);
    border-radius: 50%;
    filter: blur(6px);
  }

  .hero-panel__content {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .hero-panel__main {
    max-width: 760px;
  }

  .hero-panel__eyebrow {
    margin: 0 0 12px;
    font-size: 14px;
    letter-spacing: 0.08em;
    opacity: 0.88;
  }

  .hero-panel__title {
    margin: 0;
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 700;
    line-height: 1.15;
  }

  .hero-panel__description {
    max-width: 720px;
    margin: 14px 0 0;
    font-size: 15px;
    line-height: 1.8;
    color: rgb(239 246 255 / 88%);
  }

  .hero-panel__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
    margin-top: 18px;
    font-size: 13px;
    color: rgb(219 234 254 / 84%);
  }

  .hero-panel__aside {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-end;
    max-width: 340px;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  padding: 20px;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--summary-accent) 32%, white);
    box-shadow: 0 24px 40px rgb(15 23 42 / 12%);
    transform: translateY(-4px);
  }

  &::before {
    position: absolute;
    top: -24px;
    right: -14px;
    width: 120px;
    height: 120px;
    content: "";
    background: color-mix(in srgb, var(--summary-accent) 14%, transparent);
    border-radius: 50%;
  }

  .summary-card__header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .summary-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 20px;
    color: var(--summary-accent);
    background: color-mix(in srgb, var(--summary-accent) 14%, white);
    border-radius: 14px;
  }

  .summary-card__label {
    position: relative;
    z-index: 1;
    margin-top: 20px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .summary-card__value {
    position: relative;
    z-index: 1;
    margin-top: 10px;
    font-size: 34px;
    font-weight: 700;
    line-height: 1;
  }

  .summary-card__delta {
    position: relative;
    z-index: 1;
    margin-top: 12px;
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
    position: relative;
    z-index: 1;
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.75;
    color: var(--el-text-color-secondary);
  }
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
  gap: 18px;
}

.content-grid--bottom {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.panel__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.panel__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.panel__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
  border: 1px solid #e0ebff;
  border-radius: 18px;

  .metric-card__label {
    display: block;
    font-size: 13px;
    color: #64748b;
  }

  .metric-card__value {
    display: block;
    margin-top: 8px;
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
  }
}

.trend-chart {
  width: 100%;
  min-height: 340px;
}

.quick-entry-list,
.todo-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.quick-entry {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--quick-accent) 5%, white);
    border-color: color-mix(in srgb, var(--quick-accent) 28%, white);
    transform: translateY(-2px);
  }

  .quick-entry__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 20px;
    color: var(--quick-accent);
    background: color-mix(in srgb, var(--quick-accent) 12%, white);
    border-radius: 14px;
  }

  .quick-entry__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;

    strong {
      font-size: 15px;
      font-weight: 700;
      color: var(--el-text-color-primary);
    }

    span {
      font-size: 13px;
      line-height: 1.7;
      color: var(--el-text-color-secondary);
    }
  }
}

.todo-card {
  padding: 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 14px 28px rgb(59 130 246 / 10%);
    transform: translateY(-2px);
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
    font-size: 16px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }

  .todo-card__description {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--el-text-color-secondary);
  }

  .todo-card__footer {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    font-size: 13px;
    color: #64748b;
  }

  .todo-card__action {
    font-weight: 600;
    color: var(--el-color-primary);
  }
}

.activity-timeline {
  padding-top: 6px;
}

.activity-card {
  padding: 0 0 0 6px;

  .activity-card__title {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 15px;
    color: var(--el-text-color-primary);
  }

  .activity-card__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    font-size: 16px;
    color: #2563eb;
    background: #dbeafe;
    border-radius: 12px;
  }

  .activity-card__description {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.75;
    color: var(--el-text-color-secondary);
  }

  .activity-card__operator {
    display: inline-block;
    margin-top: 10px;
    font-size: 12px;
    color: #475569;
  }
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
    padding: 14px;
  }

  .hero-panel {
    padding: 24px 20px;

    .hero-panel__content {
      flex-direction: column;
    }

    .hero-panel__aside {
      justify-content: flex-start;
      max-width: none;
    }
  }

  .summary-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .panel,
  .summary-card {
    padding: 18px;
  }

  .panel__header,
  .todo-card__header,
  .todo-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .trend-chart {
    min-height: 300px;
  }
}
</style>
