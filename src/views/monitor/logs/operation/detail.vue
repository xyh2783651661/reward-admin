<script setup lang="ts">
import { computed, ref } from "vue";
import dayjs from "dayjs";
import type { TaskLogDetail, TaskLogStep, TaskLogBatchItem } from "@/api/logs";

const props = defineProps<{
  detail: TaskLogDetail;
}>();

const totalTime = computed(() => props.detail?.timeCost ?? 0);

const steps = computed<TaskLogStep[]>(() => props.detail?.steps ?? []);

const failedSteps = computed(() => steps.value.filter(s => !s.success));

const exception = computed(() => props.detail?.exception);

// 只看失败步骤开关
const onlyFailed = ref(false);
// 步骤名关键字过滤
const keyword = ref("");
// 只看有 metadata 的步骤（运维排查产出时最常用）
const onlyMetadata = ref(false);

// 步骤拆细后可能有几十步，识别耗时最长的若干步以便高亮定位瓶颈
const SLOW_TOP_N = 3;
const slowThreshold = computed(() => {
  const costs = steps.value
    .map(s => s.costMs ?? 0)
    .filter(c => c > 0)
    .sort((a, b) => b - a);
  if (costs.length <= SLOW_TOP_N) return Infinity;
  return costs[SLOW_TOP_N - 1];
});

function isSlow(ms?: number) {
  if (!ms || ms <= 0) return false;
  return ms >= slowThreshold.value;
}

/** 判断步骤是否携带任意"批处理/指标"结构化信息 */
function hasStructured(step: TaskLogStep) {
  return !!(
    step.total != null ||
    step.successCount != null ||
    step.failedCount != null ||
    step.skippedCount != null ||
    (step.metadata && Object.keys(step.metadata).length > 0) ||
    (step.failures && step.failures.length > 0) ||
    (step.skips && step.skips.length > 0)
  );
}

// 应用「只看失败」+「关键字」+「只看指标」过滤后的步骤（保留原始序号）
const visibleSteps = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return steps.value
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => {
      if (onlyFailed.value && step.success) return false;
      if (kw && !(step.stepName ?? "").toLowerCase().includes(kw)) return false;
      if (onlyMetadata.value && !hasStructured(step)) return false;
      return true;
    });
});

/** action chip 映射：不同类型给不同色调 */
const ACTION_COLORS: Record<string, string> = {
  QUERY: "info",
  PROCESS: "primary",
  NOTIFY: "success",
  AI: "warning"
};

function actionType(action?: string) {
  if (!action) return "";
  return ACTION_COLORS[action.toUpperCase()] || "";
}

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

/** 批处理成功率 */
function successRate(step: TaskLogStep) {
  const t = step.total ?? 0;
  if (t <= 0) return 0;
  return Math.round(((step.successCount ?? 0) / t) * 100);
}

/** metadata 值格式化 —— 数字/布尔/字符串直接展示，对象/数组转 JSON */
function formatMetaValue(v: any): string {
  if (v == null) return "-";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** metadata 值是否过长需要用等宽显示 */
function isLongValue(v: any) {
  const s = formatMetaValue(v);
  return s.length > 60 || (typeof v === "object" && v != null);
}

/** metadata 键的友好中文映射，可按需扩展 */
const META_KEY_LABEL: Record<string, string> = {
  total: "总数",
  success: "成功",
  failed: "失败",
  skipped: "跳过",
  successCount: "成功",
  failedCount: "失败",
  skippedCount: "跳过",
  recipientCount: "收件人数",
  imageCount: "图片数",
  uploaded: "上传数",
  attempted: "尝试数",
  candidateCount: "候选数",
  hasResult: "有结果",
  provider: "供应商",
  forceRewrite: "强制覆盖",
  daysLeft: "剩余天数",
  memoryCount: "回忆条数",
  holidayName: "节日",
  termName: "节气",
  vacationName: "假期",
  amount: "金额",
  downloadedBytes: "下载字节",
  sizeBytes: "文件大小",
  reloaded: "已热重载",
  hit: "命中",
  bySource: "按来源分布"
};

function metaKeyLabel(k: string) {
  return META_KEY_LABEL[k] || k;
}

function batchItemLabel(item: TaskLogBatchItem) {
  if (item.note) return item.note;
  const idPart = item.id != null && item.id !== "" ? `[${item.id}] ` : "";
  return `${idPart}${item.reason ?? ""}`;
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

      <!-- 步骤过滤工具栏 -->
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
        <el-switch
          v-model="onlyMetadata"
          size="small"
          inline-prompt
          active-text="只看指标"
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
                  v-if="step.action"
                  size="small"
                  :type="(actionType(step.action) as any) || 'info'"
                  effect="light"
                >
                  {{ step.action }}
                </el-tag>
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

            <!-- 批处理指标：total/success/failed/skipped -->
            <div v-if="step.total != null" class="batch-stats">
              <div class="batch-numbers">
                <span class="batch-item">
                  总数 <b>{{ step.total }}</b>
                </span>
                <span class="batch-item batch-success">
                  成功 <b>{{ step.successCount ?? 0 }}</b>
                </span>
                <span v-if="step.failedCount" class="batch-item batch-fail">
                  失败 <b>{{ step.failedCount }}</b>
                </span>
                <span v-if="step.skippedCount" class="batch-item batch-skip">
                  跳过 <b>{{ step.skippedCount }}</b>
                </span>
                <span class="batch-item batch-rate">
                  成功率 <b>{{ successRate(step) }}%</b>
                </span>
              </div>
              <el-progress
                :percentage="successRate(step)"
                :stroke-width="4"
                :color="step.failedCount ? '#f56c6c' : '#67c23a'"
                :show-text="false"
                class="batch-bar"
              />
            </div>

            <!-- 步骤 metadata 折叠面板 -->
            <el-collapse
              v-if="
                (step.metadata && Object.keys(step.metadata).length > 0) ||
                (step.failures && step.failures.length > 0) ||
                (step.skips && step.skips.length > 0)
              "
              class="step-extras"
            >
              <el-collapse-item name="metadata">
                <template #title>
                  <span class="collapse-title">
                    <span class="collapse-dot" />
                    步骤指标
                    <el-tag
                      v-if="step.failures?.length"
                      size="small"
                      type="danger"
                      effect="plain"
                    >
                      {{ step.failures.length }} 条失败
                    </el-tag>
                    <el-tag
                      v-if="step.skips?.length"
                      size="small"
                      type="info"
                      effect="plain"
                    >
                      {{ step.skips.length }} 条跳过
                    </el-tag>
                  </span>
                </template>

                <div
                  v-if="step.metadata && Object.keys(step.metadata).length > 0"
                  class="meta-grid"
                >
                  <div
                    v-for="(v, k) in step.metadata"
                    :key="k"
                    class="meta-row"
                    :class="{ 'meta-row-block': isLongValue(v) }"
                  >
                    <span class="meta-key">{{ metaKeyLabel(k) }}</span>
                    <span class="meta-value">
                      <pre v-if="isLongValue(v)" class="meta-pre">{{
                        formatMetaValue(v)
                      }}</pre>
                      <template v-else>{{ formatMetaValue(v) }}</template>
                    </span>
                  </div>
                </div>

                <div
                  v-if="step.failures && step.failures.length > 0"
                  class="batch-items"
                >
                  <div class="batch-items-title batch-items-fail">
                    失败明细（前 {{ step.failures.length }} 条）
                  </div>
                  <ul class="batch-items-list">
                    <li v-for="(item, i) in step.failures" :key="'f' + i">
                      {{ batchItemLabel(item) }}
                    </li>
                  </ul>
                </div>

                <div
                  v-if="step.skips && step.skips.length > 0"
                  class="batch-items"
                >
                  <div class="batch-items-title batch-items-skip">
                    跳过明细（前 {{ step.skips.length }} 条）
                  </div>
                  <ul class="batch-items-list">
                    <li v-for="(item, i) in step.skips" :key="'s' + i">
                      {{ batchItemLabel(item) }}
                    </li>
                  </ul>
                </div>
              </el-collapse-item>
            </el-collapse>

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

/* 批处理指标 */
.batch-stats {
  padding: 8px 10px;
  margin-top: 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.batch-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.batch-item b {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.batch-success b {
  color: var(--el-color-success);
}

.batch-fail b {
  color: var(--el-color-danger);
}

.batch-skip b {
  color: var(--el-color-info);
}

.batch-rate b {
  color: var(--el-color-primary);
}

.batch-bar {
  margin-top: 6px;
}

/* metadata 折叠 */
.step-extras {
  margin-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.collapse-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.collapse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--el-color-primary);
  border-radius: 50%;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px 16px;
  padding: 4px 0 8px;
}

.meta-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.6;
}

.meta-row-block {
  flex-direction: column;
  grid-column: 1 / -1;
  gap: 4px;
  align-items: stretch;
}

.meta-key {
  min-width: 74px;
  color: var(--el-text-color-secondary);
}

.meta-value {
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.meta-pre {
  max-height: 160px;
  padding: 8px 10px;
  margin: 0;
  overflow: auto;
  font-family:
    "Fira Code", "JetBrains Mono", Menlo, Consolas, "Courier New", monospace;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--el-fill-color-darker);
  border-radius: 4px;
}

.batch-items {
  padding-top: 6px;
  margin-top: 6px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.batch-items-title {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
}

.batch-items-fail {
  color: var(--el-color-danger);
}

.batch-items-skip {
  color: var(--el-color-info);
}

.batch-items-list {
  padding-left: 20px;
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.batch-items-list li {
  padding: 2px 0;
  word-break: break-all;
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
