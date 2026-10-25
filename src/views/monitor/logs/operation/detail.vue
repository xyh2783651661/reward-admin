<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { TaskLogDetail, TaskLogException, TaskLogStep } from "@/api/logs";
import { getTaskLogStatusMeta, getTaskLogTriggerMeta } from "./status";
import DetailHeader, { type DetailNotice } from "./components/DetailHeader.vue";
import DetailMetrics, {
  type BusinessSummary
} from "./components/DetailMetrics.vue";
import ExceptionCard from "./components/ExceptionCard.vue";
import StepsWorkspace from "./components/StepsWorkspace.vue";
import InfoPanels from "./components/InfoPanels.vue";
import PayloadPanel, { type PayloadTab } from "./components/PayloadPanel.vue";

const props = defineProps<{
  detail: TaskLogDetail;
}>();

const steps = computed<TaskLogStep[]>(() => props.detail?.steps ?? []);
const failedSteps = computed(() => steps.value.filter(s => !s.success));

/** 状态以 status 为准，历史行才回退到 success */
const statusCode = computed(
  () => props.detail?.status || (props.detail?.success ? "SUCCESS" : "FAILED")
);
const statusMeta = computed(() =>
  getTaskLogStatusMeta(statusCode.value, props.detail?.success)
);
const triggerMeta = computed(() =>
  getTaskLogTriggerMeta(props.detail?.triggerType)
);
const stepCount = computed(() => props.detail?.stepCount ?? steps.value.length);
const failedStepCount = computed(
  () => props.detail?.failedStepCount ?? failedSteps.value.length
);

/**
 * 异常信息：优先后端组装好的 exception，缺失时用新列兜底，
 * 兼容只返回新列、没有 exception 对象的旧接口版本。
 */
const exception = computed<TaskLogException | null>(() => {
  const detail = props.detail;
  if (!detail) return null;
  const legacy = detail.exception;
  if (legacy && (legacy.type || legacy.message || legacy.stackTrace)) {
    return legacy;
  }
  if (
    detail.exceptionClass ||
    detail.exceptionMessage ||
    detail.exceptionStackTrace
  ) {
    return {
      type: detail.exceptionClass,
      message: detail.exceptionMessage,
      stackTrace: detail.exceptionStackTrace
    };
  }
  return null;
});

/** 状态说明横幅：部分成功 / 超时 / 未执行等不能只靠一个颜色表达 */
const notice = computed<DetailNotice | null>(() => {
  const detail = props.detail;
  switch (statusCode.value) {
    case "PARTIAL_SUCCESS":
      return {
        tone: "warning",
        title: "部分成功",
        description: failedStepCount.value
          ? `任务未抛异常，但有 ${failedStepCount.value} 个步骤失败或业务降级，业务产物可能不完整；请检查失败步骤与业务结果。`
          : "任务未抛异常，但业务结果被标记为部分成功 / 降级，请检查业务结果与步骤明细。"
      };
    case "FAILED":
      return {
        tone: "danger",
        title: "执行失败",
        description: "任务因业务或系统异常失败，请查看异常信息与失败步骤。"
      };
    case "TIMEOUT":
      return {
        tone: "danger",
        title: "执行超时",
        description: detail?.timeoutMinutes
          ? `任务执行超过 ${detail.timeoutMinutes} 分钟被强制中断，本次结果可能不完整。`
          : "任务执行超过配置时限被强制中断，本次结果可能不完整。"
      };
    case "LOCKED":
      return {
        tone: "warning",
        title: "本次未执行",
        description:
          "分布式锁被其他实例占用，本次没有真正执行；如需补跑请使用「定时任务补偿」。"
      };
    case "SKIPPED":
      return {
        tone: "info",
        title: "本次已跳过",
        description: "业务条件不满足，任务主动跳过，不代表执行异常。"
      };
    case "CANCELLED":
      return {
        tone: "info",
        title: "本次已取消",
        description: "任务被主动取消，未产生完整执行结果。"
      };
    case "RUNNING":
      return {
        tone: "primary",
        title: "执行中",
        description: "任务正在执行，当前记录可能尚未写入最终结果。"
      };
    case "WAITING":
      return {
        tone: "info",
        title: "等待执行",
        description: "任务已进入队列，尚未开始执行。"
      };
    default:
      return null;
  }
});

const slowest = computed(() => {
  let target: { name: string; cost: number; index: number } | null = null;
  steps.value.forEach((step, index) => {
    const cost = step.costMs ?? 0;
    if (!target || cost > target.cost) {
      target = { name: step.stepName, cost, index };
    }
  });
  return target;
});

const avgCost = computed(() => {
  if (steps.value.length === 0) return 0;
  const sum = steps.value.reduce((acc, s) => acc + (s.costMs ?? 0), 0);
  return Math.round(sum / steps.value.length);
});

function toSummary(
  total: number,
  success: number,
  failed: number,
  skipped: number
): BusinessSummary {
  return {
    total,
    success,
    failed,
    skipped,
    rate: total > 0 ? Math.round((success / total) * 100) : 0
  };
}

/** 批处理汇总：把所有带 total 的步骤合并成一个业务口径 */
const batchSummary = computed<BusinessSummary | null>(() => {
  const batchSteps = steps.value.filter(s => s.total != null);
  if (batchSteps.length === 0) return null;
  const sum = (pick: (s: TaskLogStep) => number | undefined) =>
    batchSteps.reduce((acc, s) => acc + (pick(s) ?? 0), 0);
  return toSummary(
    sum(s => s.total),
    sum(s => s.successCount),
    sum(s => s.failedCount),
    sum(s => s.skippedCount)
  );
});

/**
 * 任务级业务结果：优先使用后端落库的 total/success/failed/skipped 列；
 * 历史数据没有这些列时退回按步骤汇总的 batchSummary。
 */
const hasTaskBusinessCounts = computed(() => {
  const detail = props.detail;
  return Boolean(
    detail &&
    (detail.totalCount != null ||
      detail.successCount != null ||
      detail.failedCount != null ||
      detail.skippedCount != null)
  );
});

const businessSummary = computed<BusinessSummary | null>(() => {
  const detail = props.detail;
  if (!detail) return null;
  if (!hasTaskBusinessCounts.value) return batchSummary.value;
  return toSummary(
    detail.totalCount ?? 0,
    detail.successCount ?? 0,
    detail.failedCount ?? 0,
    detail.skippedCount ?? 0
  );
});

/** 执行载荷：结果摘要 / 脱敏参数 / 配置快照，三者有值才展示 */
const payloadTabs = computed<PayloadTab[]>(() => {
  const detail = props.detail;
  const tabs: PayloadTab[] = [];
  if (detail?.resultSummary) {
    tabs.push({
      name: "result",
      label: "结果摘要",
      value: detail.resultSummary
    });
  }
  if (detail?.paramJson) {
    tabs.push({ name: "params", label: "任务参数", value: detail.paramJson });
  }
  if (detail?.configSnapshot) {
    tabs.push({
      name: "config",
      label: "配置快照",
      value: detail.configSnapshot
    });
  }
  return tabs;
});

/** 没有步骤时的空态文案要能解释「为什么没有步骤」 */
const emptyStepsText = computed(() => {
  switch (statusCode.value) {
    case "LOCKED":
      return "本次未执行：分布式锁被其他实例占用";
    case "SKIPPED":
      return "本次未执行：业务条件不满足，任务主动跳过";
    case "CANCELLED":
      return "本次执行已取消，没有步骤明细";
    case "TIMEOUT":
      return "任务超时中断，没有记录到完整步骤";
    case "WAITING":
      return "任务尚未开始执行";
    case "RUNNING":
      return "任务执行中，步骤明细可能稍后写入";
    default:
      return "暂无执行详情";
  }
});

/* ==================== 标签页与跨区跳转 ==================== */

const activeTab = ref("steps");
const workspaceRef = ref<InstanceType<typeof StepsWorkspace>>();
const exceptionRef = ref<InstanceType<typeof ExceptionCard>>();

watch(
  () => props.detail,
  () => {
    activeTab.value = steps.value.length > 0 ? "steps" : "info";
  },
  { immediate: true }
);

async function showFailedSteps() {
  activeTab.value = "steps";
  await nextTick();
  workspaceRef.value?.showFailedOnly();
}

async function focusStep(index: number) {
  activeTab.value = "steps";
  await nextTick();
  workspaceRef.value?.focusStep(index);
}

function showException() {
  exceptionRef.value?.reveal();
}
</script>

<template>
  <div class="task-detail">
    <DetailHeader
      :detail="detail"
      :status-meta="statusMeta"
      :trigger-meta="triggerMeta"
      :notice="notice"
    />

    <DetailMetrics
      :step-count="stepCount"
      :failed-step-count="failedStepCount"
      :slowest="slowest"
      :avg-cost="avgCost"
      :business="businessSummary"
      :exception-type="exception ? (exception.type ?? '') : null"
      @show-failed="showFailedSteps"
      @focus-step="focusStep"
      @show-exception="showException"
    />

    <ExceptionCard v-if="exception" ref="exceptionRef" :exception="exception" />

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane name="steps">
        <template #label>
          <span class="tab-label">
            步骤追踪
            <em
              v-if="steps.length"
              :class="{ 'is-danger': failedSteps.length }"
            >
              {{ steps.length }}
            </em>
          </span>
        </template>
        <StepsWorkspace
          ref="workspaceRef"
          :steps="steps"
          :total-time="detail?.timeCost ?? 0"
          :start-time="detail?.startTime"
          :empty-text="emptyStepsText"
        />
      </el-tab-pane>

      <el-tab-pane label="执行信息" name="info">
        <InfoPanels
          :detail="detail"
          :trigger-meta="triggerMeta"
          :business="businessSummary"
          :business-from-task="hasTaskBusinessCounts"
        />
      </el-tab-pane>

      <el-tab-pane v-if="payloadTabs.length" name="payload">
        <template #label>
          <span class="tab-label">
            配置与结果
            <em>{{ payloadTabs.length }}</em>
          </span>
        </template>
        <PayloadPanel :tabs="payloadTabs" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
.task-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-height: calc(100vh - 110px);
  padding: 0 4px 8px;
  overflow-y: auto;
  font-variant-numeric: tabular-nums;
}

.detail-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
}

.tab-label {
  display: inline-flex;
  gap: 6px;
  align-items: center;

  em {
    min-width: 18px;
    padding: 0 6px;
    font-size: 12px;
    font-style: normal;
    line-height: 18px;
    color: var(--el-text-color-secondary);
    text-align: center;
    background: var(--el-fill-color);
    border-radius: 999px;

    &.is-danger {
      color: var(--el-color-danger);
      background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
    }
  }
}
</style>
