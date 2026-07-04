<script setup lang="ts">
import { computed, ref } from "vue";
import dayjs from "dayjs";
import type { TaskLogDetail } from "@/api/logs";

const props = defineProps<{
  detail: TaskLogDetail;
}>();

const totalTime = computed(() => props.detail?.timeCost ?? 0);

const steps = computed(() => props.detail?.steps ?? []);

const failedSteps = computed(() => steps.value.filter(s => !s.success));

const exception = computed(() => props.detail?.exception);

// 只看失败步骤开关
const onlyFailed = ref(false);
// 步骤名关键字过滤
const keyword = ref("");

// 步骤拆细后可能有几十步，识别耗时最长的若干步以便高亮定位瓶颈
const SLOW_TOP_N = 3;
const slowThreshold = computed(() => {
  const costs = steps.value
    .map(s => s.costMs ?? 0)
    .filter(c => c > 0)
    .sort((a, b) => b - a);
  if (costs.length <= SLOW_TOP_N) return Infinity;
  // 取第 N 名的耗时作为阈值（>= 它的即为 TopN 慢步骤）
  return costs[SLOW_TOP_N - 1];
});

function isSlow(ms?: number) {
  if (!ms || ms <= 0) return false;
  return ms >= slowThreshold.value;
}

// 应用「只看失败」+「关键字」两个过滤条件后的步骤（保留原始序号）
const visibleSteps = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return steps.value
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => {
      if (onlyFailed.value && step.success) return false;
      if (kw && !(step.stepName ?? "").toLowerCase().includes(kw)) return false;
      return true;
    });
});

function formatTime(t?: string) {
  if (!t) return "-";
  return dayjs(t).format("YYYY-MM-DD HH:mm:ss");
}

function formatMs(ms?: number) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function percent(ms?: number) {
  if (!ms || totalTime.value === 0) return 0;
  return Math.min(100, Math.round((ms / totalTime.value) * 100));
}
</script>

<template>
  <div class="task-detail">
    <!-- 概要信息 -->
    <el-descriptions :column="3" border size="small" class="mb-4">
      <el-descriptions-item label="任务名">
        {{ detail?.taskName || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="描述">
        {{ detail?.description || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="detail?.success ? 'success' : 'danger'" size="small">
          {{ detail?.success ? "成功" : "失败" }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="总耗时">
        <span class="font-bold">{{ formatMs(detail?.timeCost) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="开始时间">
        {{ formatTime(detail?.startTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="结束时间">
        {{ formatTime(detail?.endTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="调用方法" :span="3">
        <code class="class-method">{{ detail?.classMethod || "-" }}</code>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 步骤时间轴 -->
    <div v-if="steps.length > 0" class="section">
      <div class="section-title">
        <span>执行步骤</span>
        <el-tag size="small" effect="plain">{{ steps.length }} 个步骤</el-tag>
        <el-tag
          v-if="failedSteps.length > 0"
          size="small"
          type="danger"
          effect="plain"
        >
          {{ failedSteps.length }} 个失败
        </el-tag>
      </div>

      <!-- 步骤过滤工具栏：步骤拆细后可能几十步，支持只看失败 + 关键字定位 -->
      <div class="step-toolbar mt-3">
        <el-input
          v-model="keyword"
          placeholder="搜索步骤名（如收件人、供应商）"
          clearable
          size="small"
          class="step-search"
        />
        <el-switch
          v-model="onlyFailed"
          :disabled="failedSteps.length === 0"
          size="small"
          inline-prompt
          active-text="只看失败"
          inactive-text="全部步骤"
        />
        <span class="step-count-hint">
          显示 {{ visibleSteps.length }} / {{ steps.length }}
        </span>
      </div>

      <el-empty
        v-if="visibleSteps.length === 0"
        :image-size="60"
        description="没有匹配的步骤"
      />
      <el-timeline v-else class="mt-3">
        <el-timeline-item
          v-for="{ step, index } in visibleSteps"
          :key="index"
          :type="step.success ? 'success' : 'danger'"
          :timestamp="`步骤 ${index + 1}`"
          placement="top"
        >
          <div
            class="step-card"
            :class="{
              'is-fail': !step.success,
              'is-slow': isSlow(step.costMs)
            }"
          >
            <div class="step-header">
              <span class="step-name">{{ step.stepName }}</span>
              <div class="step-tags">
                <el-tag
                  v-if="isSlow(step.costMs)"
                  size="small"
                  type="warning"
                  effect="dark"
                >
                  耗时较长
                </el-tag>
                <el-tag
                  size="small"
                  :type="step.success ? 'success' : 'danger'"
                  effect="plain"
                >
                  {{ step.success ? "成功" : "失败" }}
                </el-tag>
              </div>
            </div>
            <div class="step-meta">
              <span class="step-cost"> 耗时 {{ formatMs(step.costMs) }} </span>
              <span class="step-pct">占比 {{ percent(step.costMs) }}%</span>
              <el-progress
                :percentage="percent(step.costMs)"
                :stroke-width="6"
                :color="step.success ? '#67c23a' : '#f56c6c'"
                :show-text="false"
                class="step-bar"
              />
            </div>
            <div v-if="step.errorMessage" class="step-error">
              <el-alert
                :title="step.errorMessage"
                type="error"
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- 异常信息 -->
    <div v-if="exception" class="section">
      <div class="section-title">
        <span>异常信息</span>
        <el-tag size="small" type="danger" effect="plain">异常</el-tag>
      </div>
      <div class="exception-block mt-3">
        <div class="exception-type">
          <span class="label">异常类型：</span>
          <code>{{ exception.type || "-" }}</code>
        </div>
        <div class="exception-message">
          <span class="label">异常消息：</span>
          <span>{{ exception.message || "-" }}</span>
        </div>
        <div v-if="exception.stackTrace" class="exception-stack">
          <div class="label">堆栈信息：</div>
          <pre class="stack-pre">{{ exception.stackTrace }}</pre>
        </div>
      </div>
    </div>

    <el-empty
      v-if="steps.length === 0 && !exception"
      description="暂无执行详情"
    />
  </div>
</template>

<style scoped>
.task-detail {
  width: 100%;
  max-height: 75vh;
  padding: 0 4px;
  overflow-y: auto;
}

.class-method {
  padding: 2px 6px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-card {
  padding: 12px 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.step-card.is-fail {
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-5);
}

.step-card.is-slow {
  border-color: var(--el-color-warning-light-5);
}

.step-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.step-search {
  width: 260px;
}

.step-count-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.step-tags {
  display: flex;
  gap: 6px;
  align-items: center;
}

.step-header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.step-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.step-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.step-bar {
  flex: 1;
  max-width: 200px;
}

.step-error {
  margin-top: 8px;
}

.exception-block {
  padding: 16px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 8px;
}

.exception-type,
.exception-message {
  margin-bottom: 8px;
  font-size: 13px;
}

.exception-type code {
  padding: 2px 6px;
  font-size: 12px;
  color: var(--el-color-danger);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.label {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.stack-pre {
  max-height: 300px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #f0f0f0;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 6px;
}
</style>
