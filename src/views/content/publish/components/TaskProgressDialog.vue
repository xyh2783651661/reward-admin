<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { PublishTaskState } from "@/api/publish-package";

import Loading from "~icons/ep/loading";
import CircleCheckFilled from "~icons/ep/circle-check-filled";
import CircleCloseFilled from "~icons/ep/circle-close-filled";
import Clock from "~icons/ep/clock";
import RemoveFilled from "~icons/ep/remove-filled";

defineOptions({ name: "TaskProgressDialog" });

const props = defineProps<{
  /** 当前任务状态；为空时弹窗关闭 */
  state: PublishTaskState | null;
}>();

const TASK_TITLES: Record<string, string> = {
  PREPARE: "正在选图",
  GENERATE: "正在生成文案"
};

const STEP_TEXT: Record<string, string> = {
  pending: "等待中",
  running: "生成中",
  success: "已完成",
  failed: "失败",
  skipped: "已跳过"
};

const visible = computed(() => !!props.state);
const title = computed(
  () => TASK_TITLES[props.state?.type ?? ""] ?? "任务处理中"
);

const percent = computed(() =>
  Math.min(100, Math.max(0, Math.round(props.state?.percent ?? 0)))
);

const progressStatus = computed(() => {
  if (props.state?.status === "FAILED") return "exception";
  if (props.state?.status === "SUCCESS") return "success";
  return undefined;
});

const isRunning = computed(
  () =>
    props.state?.status === "PENDING" ||
    props.state?.status === "RUNNING" ||
    !props.state?.status
);

const headline = computed(() => {
  const s = props.state;
  if (!s) return "";
  if (s.status === "SUCCESS") return "处理完成";
  if (s.status === "FAILED") return s.error || "处理失败";
  return s.message || "任务已提交，正在排队…";
});

const steps = computed(() => props.state?.platforms ?? []);
const doneCount = computed(
  () =>
    steps.value.filter(p => ["success", "failed", "skipped"].includes(p.status))
      .length
);

// ========== 已耗时 ==========
const elapsed = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

watch(
  () => props.state?.taskId,
  taskId => {
    stopTimer();
    if (!taskId) return;
    elapsed.value = 0;
    timer = setInterval(() => elapsed.value++, 1000);
  },
  { immediate: true }
);

onBeforeUnmount(stopTimer);

const elapsedText = computed(() => {
  const m = Math.floor(elapsed.value / 60);
  const s = elapsed.value % 60;
  return m ? `${m} 分 ${s} 秒` : `${s} 秒`;
});

function stepIcon(status: string) {
  const map: Record<string, any> = {
    running: Loading,
    success: CircleCheckFilled,
    failed: CircleCloseFilled,
    skipped: RemoveFilled
  };
  return map[status] ?? Clock;
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="460px"
    align-center
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="task-dialog">
      <div class="headline" :class="{ error: state?.status === 'FAILED' }">
        <el-icon v-if="isRunning" class="is-loading spinner">
          <Loading />
        </el-icon>
        <span class="text">{{ headline }}</span>
      </div>

      <el-progress
        :percentage="percent"
        :status="progressStatus"
        :stroke-width="12"
        :striped="isRunning"
        :striped-flow="isRunning"
        :duration="12"
        text-inside
      />

      <div class="meta">
        <span v-if="steps.length"
          >已处理 {{ doneCount }} / {{ steps.length }}</span
        >
        <span v-else-if="state?.total">
          进度 {{ state?.current ?? 0 }} / {{ state.total }}
        </span>
        <span>已耗时 {{ elapsedText }}</span>
      </div>

      <ul v-if="steps.length" class="steps">
        <li
          v-for="p in steps"
          :key="p.code"
          class="step"
          :class="`is-${p.status}`"
        >
          <el-icon
            class="step-icon"
            :class="{ 'is-loading': p.status === 'running' }"
          >
            <component :is="stepIcon(p.status)" />
          </el-icon>
          <div class="step-body">
            <div class="step-name">{{ p.name || p.code }}</div>
            <div v-if="p.message" class="step-msg">{{ p.message }}</div>
          </div>
          <span class="step-status">{{ STEP_TEXT[p.status] ?? p.status }}</span>
        </li>
      </ul>

      <p class="tip">
        AI 生成通常需要几十秒到数分钟，任务在服务端运行，请耐心等待。
      </p>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.task-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.headline {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: var(--ra-font-md);
  font-weight: 500;
  color: var(--el-text-color-primary);

  &.error {
    color: var(--el-color-danger);
  }

  .spinner {
    font-size: var(--ra-font-lg);
    color: var(--el-color-primary);
  }

  .text {
    word-break: break-all;
  }
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.steps {
  padding: 0;
  margin: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-md);
}

.step {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;

  & + & {
    border-top: 1px solid var(--el-border-color-extra-light);
  }

  .step-icon {
    font-size: var(--ra-font-lg);
    color: var(--el-text-color-placeholder);
  }

  .step-body {
    flex: 1;
    min-width: 0;
  }

  .step-name {
    font-size: var(--ra-font-base);
    color: var(--el-text-color-primary);
  }

  .step-msg {
    margin-top: 2px;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
    word-break: break-all;
  }

  .step-status {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  &.is-running {
    background: var(--el-color-primary-light-9);

    .step-icon,
    .step-status {
      color: var(--el-color-primary);
    }
  }

  &.is-success {
    .step-icon,
    .step-status {
      color: var(--el-color-success);
    }
  }

  &.is-failed {
    .step-icon,
    .step-status,
    .step-msg {
      color: var(--el-color-danger);
    }
  }
}

.tip {
  margin: 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-placeholder);
}
</style>
