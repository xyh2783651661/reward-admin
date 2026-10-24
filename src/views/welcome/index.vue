<script setup lang="ts">
import dayjs from "dayjs";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStoreHook } from "@/store/modules/user";
import { message } from "@/utils/message";
import { navigateTo as navigate } from "@/utils/navigation";
import {
  getWorkbenchActivities,
  getWorkbenchHealthOverview,
  getWorkbenchSummary,
  getWorkbenchTodos,
  getWorkbenchTrends
} from "@/api/workbench";
import type {
  WorkbenchActivityItem,
  WorkbenchHealthData,
  WorkbenchSummaryData,
  WorkbenchTodoItem,
  WorkbenchTrendData,
  WorkbenchTrendRange
} from "@/api/workbench";
import ActivityPanel from "./components/ActivityPanel.vue";
import HealthPanel from "./components/HealthPanel.vue";
import MetricCards from "./components/MetricCards.vue";
import QuickEntries from "./components/QuickEntries.vue";
import TodoPanel from "./components/TodoPanel.vue";
import TrendPanel from "./components/TrendPanel.vue";
import WelcomeHero from "./components/WelcomeHero.vue";

defineOptions({ name: "Welcome" });

type ModuleKey = "summary" | "health" | "todos" | "activities" | "trend";

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
const activeRange = ref<WorkbenchTrendRange>("7d");
const summary = ref<WorkbenchSummaryData>(emptySummary);
const trendData = ref<WorkbenchTrendData>(emptyTrend);
const health = ref<WorkbenchHealthData>(emptyHealth);
const todoList = ref<WorkbenchTodoItem[]>([]);
const activityList = ref<WorkbenchActivityItem[]>([]);
const lastLoadedAt = ref("");
const refreshing = ref(false);
const loading = ref<Record<ModuleKey, boolean>>({
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

function navigateTo(path?: string) {
  navigate(router, path);
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
function handleRangeChange(range: WorkbenchTrendRange) {
  activeRange.value = range;
  void loadTrend(range);
}

onMounted(() => void loadWorkbench());
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
      <el-button size="small" @click="loadWorkbench()">重新加载</el-button>
    </el-alert>

    <WelcomeHero
      :greeting="greeting"
      :display-name="displayName"
      :headline="headline"
      :focus-items="focusItems"
      :status="overallStatus"
      :status-text="statusText"
      :updated-at="updatedAtText"
      :refreshing="refreshing"
      @refresh="loadWorkbench(true)"
    />

    <MetricCards
      :cards="summaryCards"
      :loading="loading.summary"
      :error="errors.summary"
      @navigate="navigateTo"
      @retry="loadSummary"
    />

    <div class="workbench__grid">
      <div class="workbench__main">
        <TrendPanel
          :data="trendData"
          :range="activeRange"
          :loading="loading.trend"
          :error="errors.trend"
          @update:range="handleRangeChange"
          @retry="loadTrend()"
        />
        <QuickEntries
          :entries="quickEntries"
          :loading="loading.summary"
          @navigate="navigateTo"
        />
        <ActivityPanel
          :activities="activityList"
          :loading="loading.activities"
          :error="errors.activities"
          @navigate="navigateTo"
          @retry="loadActivities"
        />
      </div>

      <aside class="workbench__side">
        <HealthPanel
          :lights="healthLights"
          :loading="loading.health"
          :error="errors.health"
          @navigate="navigateTo"
          @retry="loadHealth"
        />
        <TodoPanel
          :todos="todoList"
          :loading="loading.todos"
          :error="errors.todos"
          @navigate="navigateTo"
          @retry="loadTodos"
        />
      </aside>
    </div>
  </main>
</template>

<style scoped lang="scss">
.workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 20px 24px 28px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-page);
}

.workbench__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
  align-items: start;
}

.workbench__main,
.workbench__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (width <= 1200px) {
  .workbench__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .workbench__side {
    order: -1;
  }
}

@media (width <= 640px) {
  .workbench {
    padding: 12px;
  }
}
</style>
