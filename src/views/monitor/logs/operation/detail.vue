<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import dayjs from "dayjs";
<<<<<<< HEAD
import type { TaskLogDetail, TaskLogStep, TaskLogBatchItem } from "@/api/logs";
=======
import type { TaskLogDetail } from "@/api/logs";
import { message } from "@/utils/message";
import { ElIcon } from "element-plus";
import {
  CircleCheckFilled,
  CircleCloseFilled,
  CopyDocument,
  Search,
  Timer
} from "@element-plus/icons-vue";
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)

const props = defineProps<{
  detail: TaskLogDetail;
}>();

/* ========== 基础数据 ========== */
const totalTime = computed(() => props.detail?.timeCost ?? 0);
<<<<<<< HEAD

const steps = computed<TaskLogStep[]>(() => props.detail?.steps ?? []);

=======
const steps = computed(() => props.detail?.steps ?? []);
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
const failedSteps = computed(() => steps.value.filter(s => !s.success));
const exception = computed(() => props.detail?.exception);

<<<<<<< HEAD
// 只看失败步骤开关
const onlyFailed = ref(false);
// 步骤名关键字过滤
const keyword = ref("");
// 只看有 metadata 的步骤（运维排查产出时最常用）
const onlyMetadata = ref(false);
=======
/* ========== 指标 ========== */
const slowestStep = computed(() => {
  let best: { name: string; cost: number; index: number } | null = null;
  steps.value.forEach((s, i) => {
    const c = s.costMs ?? 0;
    if (c > 0 && (!best || c > best.cost)) {
      best = { name: s.stepName, cost: c, index: i };
    }
  });
  return best;
});
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)

const avgCost = computed(() => {
  const costs = steps.value.map(s => s.costMs ?? 0).filter(c => c > 0);
  if (costs.length === 0) return 0;
  return Math.round(costs.reduce((a, b) => a + b, 0) / costs.length);
});

const maxCost = computed(() => slowestStep.value?.cost ?? 0);

// Top3 慢步骤阈值（步骤多时帮助定位瓶颈）
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

<<<<<<< HEAD
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
=======
/* ========== 过滤 / 排序 ========== */
const onlyFailed = ref(false);
const keyword = ref("");
const sortMode = ref<"order" | "cost">("order");

>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
const visibleSteps = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const list = steps.value
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => {
      if (onlyFailed.value && step.success) return false;
      if (kw && !(step.stepName ?? "").toLowerCase().includes(kw)) return false;
      if (onlyMetadata.value && !hasStructured(step)) return false;
      return true;
    });
  if (sortMode.value === "cost") {
    return [...list].sort(
      (a, b) => (b.step.costMs ?? 0) - (a.step.costMs ?? 0)
    );
  }
  return list;
});

<<<<<<< HEAD
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

=======
/* ========== 交互 ========== */
const listRef = ref<HTMLElement>();
const highlightIndex = ref(-1);

function toggleOnlyFailed() {
  if (failedSteps.value.length === 0) return;
  onlyFailed.value = !onlyFailed.value;
}

async function locateSlowest() {
  if (!slowestStep.value) return;
  // 定位需要目标行可见：清掉过滤条件并回到执行顺序
  onlyFailed.value = false;
  keyword.value = "";
  sortMode.value = "order";
  await nextTick();
  const el = listRef.value?.querySelector<HTMLElement>(
    `[data-step-index="${slowestStep.value.index}"]`
  );
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  highlightIndex.value = slowestStep.value.index;
  setTimeout(() => {
    highlightIndex.value = -1;
  }, 2000);
}

async function copyText(text?: string, label = "内容") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message(`${label}已复制`, { type: "success" });
  } catch {
    message("复制失败", { type: "error" });
  }
}

/* ========== 格式化 ========== */
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
function formatTime(t?: string) {
  if (!t) return "-";
  return dayjs(t).format("YYYY-MM-DD HH:mm:ss");
}

function formatMs(ms?: number) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function barWidth(ms?: number) {
  if (!ms || maxCost.value === 0) return 0;
  return Math.max(2, Math.round((ms / maxCost.value) * 100));
}

function pctOfTotal(ms?: number) {
  if (!ms || totalTime.value === 0) return null;
  const p = (ms / totalTime.value) * 100;
  if (p < 1) return "<1%";
  return `${Math.round(p)}%`;
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
    <!-- ===== 顶部概要带 ===== -->
    <header class="summary" :class="detail?.success ? 'is-ok' : 'is-fail'">
      <div class="summary__main">
        <ElIcon :size="34" class="summary__status-icon">
          <CircleCheckFilled v-if="detail?.success" />
          <CircleCloseFilled v-else />
        </ElIcon>
        <div class="summary__titles">
          <div class="summary__task">
            <span class="summary__name">{{ detail?.taskName || "-" }}</span>
            <el-tag
              size="small"
              :type="detail?.success ? 'success' : 'danger'"
              effect="dark"
            >
              {{ detail?.success ? "执行成功" : "执行失败" }}
            </el-tag>
          </div>
          <p v-if="detail?.description" class="summary__desc">
            {{ detail.description }}
          </p>
          <button
            v-if="detail?.classMethod"
            type="button"
            class="summary__method"
            title="点击复制调用方法"
            @click="copyText(detail.classMethod, '调用方法')"
          >
            <code>{{ detail.classMethod }}</code>
            <ElIcon :size="13"><CopyDocument /></ElIcon>
          </button>
        </div>
      </div>
      <div class="summary__side">
        <div class="summary__cost">
          <span class="summary__cost-value">{{ formatMs(totalTime) }}</span>
          <span class="summary__cost-label">总耗时</span>
        </div>
        <div class="summary__times">
          <span>{{ formatTime(detail?.startTime) }}</span>
          <span class="summary__times-sep">→</span>
          <span>{{ formatTime(detail?.endTime) }}</span>
        </div>
      </div>
    </header>

<<<<<<< HEAD
      <!-- 步骤过滤工具栏 -->
      <div class="step-toolbar mt-3">
=======
    <!-- ===== 指标条 ===== -->
    <div v-if="steps.length > 0" class="stats">
      <div class="stat">
        <span class="stat__value">{{ steps.length }}</span>
        <span class="stat__label">步骤总数</span>
      </div>
      <button
        type="button"
        class="stat"
        :class="{
          'is-danger': failedSteps.length > 0,
          'is-active': onlyFailed
        }"
        :disabled="failedSteps.length === 0"
        :title="failedSteps.length > 0 ? '点击只看失败步骤' : ''"
        @click="toggleOnlyFailed"
      >
        <span class="stat__value">{{ failedSteps.length }}</span>
        <span class="stat__label">失败步骤</span>
      </button>
      <button
        type="button"
        class="stat is-clickable"
        :disabled="!slowestStep"
        title="点击定位最慢步骤"
        @click="locateSlowest"
      >
        <span class="stat__value">{{ formatMs(slowestStep?.cost) }}</span>
        <span class="stat__label stat__label--ellipsis">
          最慢·{{ slowestStep?.name || "-" }}
        </span>
      </button>
      <div class="stat">
        <span class="stat__value">{{ formatMs(avgCost) }}</span>
        <span class="stat__label">平均步骤耗时</span>
      </div>
    </div>

    <!-- ===== 步骤列表 ===== -->
    <section v-if="steps.length > 0" class="steps-section">
      <div class="steps-toolbar">
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
        <el-input
          v-model="keyword"
          placeholder="搜索步骤名"
          clearable
          size="small"
          class="steps-toolbar__search"
          :prefix-icon="Search"
        />
        <el-switch
          v-model="onlyFailed"
          :disabled="failedSteps.length === 0"
          size="small"
          inline-prompt
          active-text="只看失败"
          inactive-text="全部"
        />
<<<<<<< HEAD
        <el-switch
          v-model="onlyMetadata"
          size="small"
          inline-prompt
          active-text="只看指标"
          inactive-text="全部步骤"
        />
        <span class="step-count-hint">
          显示 {{ visibleSteps.length }} / {{ steps.length }}
=======
        <el-segmented
          v-model="sortMode"
          size="small"
          :options="[
            { label: '执行顺序', value: 'order' },
            { label: '耗时降序', value: 'cost' }
          ]"
        />
        <span class="steps-toolbar__count">
          {{ visibleSteps.length }} / {{ steps.length }}
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
        </span>
      </div>

      <el-empty
        v-if="visibleSteps.length === 0"
        :image-size="60"
        description="没有匹配的步骤"
      />
      <ol v-else ref="listRef" class="step-list">
        <li
          v-for="{ step, index } in visibleSteps"
          :key="index"
          class="step-row"
          :class="{
            'is-fail': !step.success,
            'is-highlight': highlightIndex === index
          }"
          :data-step-index="index"
        >
<<<<<<< HEAD
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
=======
          <span class="step-row__no">{{ index + 1 }}</span>
          <span
            class="step-row__dot"
            :class="step.success ? 'is-ok' : 'is-fail'"
            :aria-label="step.success ? '成功' : '失败'"
          />
          <div class="step-row__body">
            <div class="step-row__line">
              <span class="step-row__name">{{ step.stepName }}</span>
              <span
                v-if="isSlow(step.costMs)"
                class="step-row__slow"
                title="耗时 Top3"
              >
                <ElIcon :size="12"><Timer /></ElIcon>慢
              </span>
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
            </div>
            <p v-if="step.errorMessage" class="step-row__error">
              {{ step.errorMessage }}
            </p>
          </div>
          <div class="step-row__cost">
            <span class="step-row__bar-track">
              <span
                class="step-row__bar"
                :class="step.success ? 'is-ok' : 'is-fail'"
                :style="{ width: `${barWidth(step.costMs)}%` }"
              />
            </span>
            <span class="step-row__ms">{{ formatMs(step.costMs) }}</span>
            <span class="step-row__pct">{{
              pctOfTotal(step.costMs) ?? ""
            }}</span>
          </div>
        </li>
      </ol>
    </section>

    <!-- ===== 异常信息 ===== -->
    <section v-if="exception" class="exception">
      <div class="exception__head">
        <div class="exception__title">
          <ElIcon :size="16" class="exception__icon">
            <CircleCloseFilled />
          </ElIcon>
          <span>异常信息</span>
          <code class="exception__type">{{ exception.type || "-" }}</code>
        </div>
        <el-button
          v-if="exception.stackTrace"
          size="small"
          :icon="CopyDocument"
          @click="copyText(exception.stackTrace, '堆栈信息')"
        >
          复制堆栈
        </el-button>
      </div>
      <p class="exception__message">{{ exception.message || "-" }}</p>
      <el-collapse v-if="exception.stackTrace" class="exception__collapse">
        <el-collapse-item title="堆栈信息" name="stack">
          <pre class="exception__stack">{{ exception.stackTrace }}</pre>
        </el-collapse-item>
      </el-collapse>
    </section>

    <el-empty
      v-if="steps.length === 0 && !exception"
      description="暂无执行详情"
    />
  </div>
</template>

<style scoped>
/* ===== 响应式 ===== */
@media (width <= 768px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .summary__side {
    align-items: flex-start;
  }

  .step-row {
    flex-wrap: wrap;
  }

  .step-row__cost {
    width: 100%;
    padding-left: 46px;
  }
}

.task-detail {
  width: 100%;
  max-width: 1080px;
  max-height: 82vh;
  padding: 0 4px 16px;
  margin: 0 auto;
  overflow-y: auto;
}

/* ===== 顶部概要带 ===== */
.summary {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-left-width: 4px;
  border-radius: 10px;
}

.summary.is-ok {
  border-left-color: var(--el-color-success);
}

.summary.is-fail {
  border-left-color: var(--el-color-danger);
}

.summary__main {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
}

.summary.is-ok .summary__status-icon {
  color: var(--el-color-success);
}

.summary.is-fail .summary__status-icon {
  color: var(--el-color-danger);
}

.summary__titles {
  min-width: 0;
}

.summary__task {
  display: flex;
  gap: 10px;
  align-items: center;
}

.summary__name {
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.summary__desc {
  margin-top: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary__method {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0;
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: none;
  border: none;
}

.summary__method:hover {
  color: var(--el-color-primary);
}

.summary__method code {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-color-primary);
  word-break: break-all;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.summary__side {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.summary__cost {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.summary__cost-value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.summary__cost-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary__times {
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.summary__times-sep {
  color: var(--el-text-color-placeholder);
}

/* ===== 指标条 ===== */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  min-width: 0;
  padding: 10px 14px;
  font: inherit;
  text-align: left;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
  border-radius: 8px;
}

button.stat {
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

button.stat:disabled {
  cursor: default;
}

button.stat:not(:disabled):hover {
  border-color: var(--el-color-primary-light-5);
}

.stat.is-danger .stat__value {
  color: var(--el-color-danger);
}

.stat.is-active {
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-5);
}

.stat__value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.stat__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat__label--ellipsis {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 步骤列表 ===== */
.steps-section {
  margin-bottom: 16px;
}

.steps-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px 8px 0 0;
}

.steps-toolbar__search {
  width: 220px;
}

.steps-toolbar__count {
  margin-left: auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.step-list {
  padding: 0;
  margin: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.step-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  transition: background 0.3s;
}

.step-row:first-child {
  border-top: none;
}

.step-row:hover {
  background: var(--el-fill-color-light);
}

.step-row.is-fail {
  background: var(--el-color-danger-light-9);
}

.step-row.is-highlight {
  background: var(--el-color-warning-light-8);
}

.step-row__no {
  min-width: 28px;
  padding-top: 2px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-placeholder);
  text-align: right;
}

.step-row__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
}

.step-row__dot.is-ok {
  background: var(--el-color-success);
}

.step-row__dot.is-fail {
  background: var(--el-color-danger);
}

.step-row__body {
  flex: 1;
  min-width: 0;
}

.step-row__line {
  display: flex;
  gap: 8px;
  align-items: center;
}

.step-row__name {
  font-size: 13px;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.step-row.is-fail .step-row__name {
  font-weight: 600;
}

.step-row__slow {
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
<<<<<<< HEAD
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
=======
  padding: 0 6px;
  font-size: 11px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
>>>>>>> 1accd8e (refactor: redesign task log step detail with ops-focused layout)
  border-radius: 4px;
}

.step-row__error {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-danger);
  word-break: break-all;
}

.step-row__cost {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  width: 240px;
  padding-top: 2px;
}

.step-row__bar-track {
  flex: 1;
  height: 6px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: 3px;
}

.step-row__bar {
  display: block;
  height: 100%;
  border-radius: 3px;
}

.step-row__bar.is-ok {
  background: var(--el-color-primary);
}

.step-row__bar.is-fail {
  background: var(--el-color-danger);
}

.step-row__ms {
  min-width: 64px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);
  text-align: right;
}

.step-row__pct {
  min-width: 34px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-placeholder);
  text-align: right;
}

/* ===== 异常区 ===== */
.exception {
  padding: 14px 16px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-5);
  border-radius: 10px;
}

.exception__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.exception__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.exception__icon {
  color: var(--el-color-danger);
}

.exception__type {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-color-danger);
  word-break: break-all;
  background: var(--el-bg-color);
  border-radius: 4px;
}

.exception__message {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.exception__collapse {
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;

  margin-top: 8px;
  border: none;
}

.exception__collapse :deep(.el-collapse-item__header) {
  font-size: 13px;
  background: transparent;
  border: none;
}

.exception__collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

.exception__stack {
  max-height: 320px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #e5e5e5;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 6px;
}
</style>
