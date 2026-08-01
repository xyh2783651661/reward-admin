<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import ReJsonField from "@/components/ReJsonField/index.vue";
import type { TaskLogDetail, TaskLogStep, TaskLogBatchItem } from "@/api/logs";

const props = defineProps<{
  detail: TaskLogDetail;
}>();

/* ==================== 基础数据 ==================== */

const steps = computed<TaskLogStep[]>(() => props.detail?.steps ?? []);
const totalTime = computed(() => props.detail?.timeCost ?? 0);
const exception = computed(() => props.detail?.exception);
const failedSteps = computed(() => steps.value.filter(s => !s.success));

/** 瀑布图基准：步骤耗时之和与总耗时取大者，保证条形不越界 */
const timelineTotal = computed(() => {
  const sum = steps.value.reduce((acc, s) => acc + (s.costMs ?? 0), 0);
  return Math.max(sum, totalTime.value, 1);
});

/** 单步最大耗时，用于耗时降序模式的条形归一化 */
const maxCost = computed(() =>
  steps.value.reduce((max, s) => Math.max(max, s.costMs ?? 0), 0)
);

/** 最慢步骤，定位性能瓶颈 */
const slowestStep = computed<{ step: TaskLogStep; index: number } | null>(
  () => {
    let target: { step: TaskLogStep; index: number } | null = null;
    steps.value.forEach((step, index) => {
      if (!target || (step.costMs ?? 0) > (target.step.costMs ?? 0)) {
        target = { step, index };
      }
    });
    return target;
  }
);

const avgCost = computed(() => {
  if (steps.value.length === 0) return 0;
  const sum = steps.value.reduce((acc, s) => acc + (s.costMs ?? 0), 0);
  return Math.round(sum / steps.value.length);
});

/** 批处理汇总：把所有带 total 的步骤合并成一个业务口径 */
const batchSummary = computed(() => {
  const batchSteps = steps.value.filter(s => s.total != null);
  if (batchSteps.length === 0) return null;
  const total = batchSteps.reduce((acc, s) => acc + (s.total ?? 0), 0);
  const success = batchSteps.reduce((acc, s) => acc + (s.successCount ?? 0), 0);
  const failed = batchSteps.reduce((acc, s) => acc + (s.failedCount ?? 0), 0);
  const skipped = batchSteps.reduce((acc, s) => acc + (s.skippedCount ?? 0), 0);
  return {
    total,
    success,
    failed,
    skipped,
    rate: total > 0 ? Math.round((success / total) * 100) : 0
  };
});

/* ==================== 瀑布布局 ==================== */

interface StepEntry {
  step: TaskLogStep;
  index: number;
  cost: number;
  offset: number;
  offsetPct: number;
  widthPct: number;
}

/** 步骤串行执行，按累加偏移生成瀑布/甘特条 */
const stepEntries = computed<StepEntry[]>(() => {
  let acc = 0;
  return steps.value.map((step, index) => {
    const cost = step.costMs ?? 0;
    const offset = acc;
    acc += cost;
    return {
      step,
      index,
      cost,
      offset,
      offsetPct: (offset / timelineTotal.value) * 100,
      widthPct: Math.max((cost / timelineTotal.value) * 100, 0.8)
    };
  });
});

/* ==================== 过滤 / 排序 ==================== */

const keyword = ref("");
const onlyFailed = ref(false);
const onlyMetrics = ref(false);
const sortMode = ref<"order" | "cost">("order");

/** 步骤是否携带批处理 / 指标等结构化信息 */
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

const visibleSteps = computed<StepEntry[]>(() => {
  const kw = keyword.value.trim().toLowerCase();
  const list = stepEntries.value.filter(({ step }) => {
    if (onlyFailed.value && step.success) return false;
    if (onlyMetrics.value && !hasStructured(step)) return false;
    if (kw) {
      const haystack = `${step.stepName ?? ""} ${step.action ?? ""} ${
        step.errorMessage ?? ""
      }`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
  if (sortMode.value === "cost") {
    return [...list].sort((a, b) => b.cost - a.cost);
  }
  return list;
});

function resetFilters() {
  keyword.value = "";
  onlyFailed.value = false;
  onlyMetrics.value = false;
  sortMode.value = "order";
}

/* ==================== 选中步骤 ==================== */

const activeIndex = ref(-1);

/** 默认定位首个失败步骤，打开即进入排障上下文 */
function pickDefaultIndex() {
  const firstFailed = steps.value.findIndex(s => !s.success);
  if (firstFailed >= 0) {
    activeIndex.value = firstFailed;
  } else {
    activeIndex.value = steps.value.length > 0 ? 0 : -1;
  }
}

watch(
  () => props.detail,
  () => {
    resetFilters();
    pickDefaultIndex();
  },
  { immediate: true }
);

const activeEntry = computed<StepEntry | null>(
  () => stepEntries.value.find(e => e.index === activeIndex.value) ?? null
);

function selectStep(index: number) {
  activeIndex.value = index;
}

function scrollRowIntoView(index: number, smooth = false) {
  nextTick(() => {
    document.querySelector(`[data-step-row="${index}"]`)?.scrollIntoView({
      block: smooth ? "center" : "nearest",
      behavior: smooth ? "smooth" : "auto"
    });
  });
}

/** 键盘上下键在可见列表内连续排查 */
function moveActive(delta: number) {
  const list = visibleSteps.value;
  if (list.length === 0) return;
  const pos = list.findIndex(e => e.index === activeIndex.value);
  const nextPos =
    pos < 0 ? 0 : Math.min(list.length - 1, Math.max(0, pos + delta));
  activeIndex.value = list[nextPos].index;
  scrollRowIntoView(activeIndex.value);
}

/** 从指标条跳转到目标步骤，同时解除会挡住它的过滤条件 */
function focusStep(index: number) {
  const target = steps.value[index];
  if (!target) return;
  if (onlyMetrics.value && !hasStructured(target)) onlyMetrics.value = false;
  if (onlyFailed.value && target.success) onlyFailed.value = false;
  keyword.value = "";
  activeIndex.value = index;
  scrollRowIntoView(index, true);
}

/* ==================== 异常区 ==================== */

const exceptionOpen = ref(false);

function toggleException() {
  exceptionOpen.value = !exceptionOpen.value;
  if (exceptionOpen.value) {
    nextTick(() => {
      document
        .querySelector("[data-exception-block]")
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }
}

/* ==================== 工具函数 ==================== */

function formatTime(t?: string) {
  if (!t) return "-";
  return dayjs(t).format("YYYY-MM-DD HH:mm:ss");
}

function formatMs(ms?: number) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** 步骤在整次执行中的耗时占比 */
function percentOfTotal(ms?: number) {
  if (!ms || timelineTotal.value === 0) return 0;
  return Math.round((ms / timelineTotal.value) * 100);
}

/** 耗时降序模式下按最慢步骤归一化条宽 */
function costBarWidth(cost: number) {
  if (maxCost.value <= 0) return 0.8;
  return Math.max((cost / maxCost.value) * 100, 0.8);
}

/** 步骤对应的真实时钟时间，便于和其他系统日志对齐 */
function clockAt(offsetMs: number) {
  if (!props.detail?.startTime) return null;
  return dayjs(props.detail.startTime)
    .add(offsetMs, "millisecond")
    .format("HH:mm:ss.SSS");
}

function successRate(step: TaskLogStep) {
  const total = step.total ?? 0;
  if (total <= 0) return 0;
  return Math.round(((step.successCount ?? 0) / total) * 100);
}

const ACTION_COLORS: Record<string, string> = {
  QUERY: "info",
  PROCESS: "primary",
  NOTIFY: "success",
  AI: "warning"
};

function actionType(action?: string) {
  if (!action) return "info";
  return ACTION_COLORS[action.toUpperCase()] || "info";
}

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

function formatMetaValue(v: any): string {
  if (v == null) return "-";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function isLongValue(v: any) {
  if (typeof v === "object" && v != null) return true;
  return formatMetaValue(v).length > 48;
}

function batchItemLabel(item: TaskLogBatchItem) {
  if (item.note) return item.note;
  const idPart = item.id != null && item.id !== "" ? `[${item.id}] ` : "";
  return `${idPart}${item.reason ?? ""}`;
}

/** 复制文本，便于把调用方法 / 堆栈 / 步骤数据贴进工单 */
async function copyText(text?: string, label = "内容") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    message(`${label}已复制`, { type: "success" });
  } catch {
    message("复制失败，请手动选择文本", { type: "error" });
  }
}

function copyStepJson() {
  if (!activeEntry.value) return;
  copyText(JSON.stringify(activeEntry.value.step, null, 2), "步骤数据");
}

/** 选中步骤是否除了耗时与结果外没有任何额外信息 */
const activeStepHasExtra = computed(() => {
  const step = activeEntry.value?.step;
  if (!step) return false;
  return !!(
    step.errorMessage ||
    step.total != null ||
    step.failures?.length ||
    step.skips?.length ||
    (step.metadata && Object.keys(step.metadata).length > 0)
  );
});
</script>

<template>
  <div class="task-detail">
    <!-- ========== 概要带 ========== -->
    <header class="summary">
      <div class="summary__main">
        <span
          class="status-pill"
          :class="detail?.success ? 'is-success' : 'is-fail'"
        >
          <i class="status-pill__dot" />
          {{ detail?.success ? "执行成功" : "执行失败" }}
        </span>
        <div class="summary__title">
          <h2>{{ detail?.taskName || "未命名任务" }}</h2>
          <p v-if="detail?.description">{{ detail.description }}</p>
        </div>
      </div>

      <dl class="summary__facts">
        <div class="fact">
          <dt>总耗时</dt>
          <dd class="fact__strong">{{ formatMs(detail?.timeCost) }}</dd>
        </div>
        <div class="fact">
          <dt>开始</dt>
          <dd>{{ formatTime(detail?.startTime) }}</dd>
        </div>
        <div class="fact">
          <dt>结束</dt>
          <dd>{{ formatTime(detail?.endTime) }}</dd>
        </div>
        <div class="fact fact--wide">
          <dt>调用方法</dt>
          <dd class="fact__code">
            <code :title="detail?.classMethod">
              {{ detail?.classMethod || "-" }}
            </code>
            <el-button
              v-if="detail?.classMethod"
              link
              type="primary"
              size="small"
              @click="copyText(detail.classMethod, '调用方法')"
            >
              复制
            </el-button>
          </dd>
        </div>
      </dl>
    </header>

    <!-- ========== 指标条 ========== -->
    <section class="metrics" aria-label="执行指标概览">
      <div class="metric">
        <span class="metric__label">步骤总数</span>
        <span class="metric__value">{{ steps.length }}</span>
      </div>

      <button
        type="button"
        class="metric metric--action"
        :class="{ 'is-danger': failedSteps.length > 0 }"
        :disabled="failedSteps.length === 0"
        @click="onlyFailed = true"
      >
        <span class="metric__label">失败步骤</span>
        <span class="metric__value">{{ failedSteps.length }}</span>
        <span class="metric__hint">
          {{ failedSteps.length > 0 ? "点击只看失败" : "全部步骤成功" }}
        </span>
      </button>

      <button
        v-if="slowestStep"
        type="button"
        class="metric metric--action"
        @click="focusStep(slowestStep.index)"
      >
        <span class="metric__label">最慢步骤</span>
        <span class="metric__value metric__value--sm">
          {{ formatMs(slowestStep.step.costMs) }}
        </span>
        <span class="metric__hint" :title="slowestStep.step.stepName">
          {{ slowestStep.step.stepName }}
        </span>
      </button>

      <div class="metric">
        <span class="metric__label">平均步骤耗时</span>
        <span class="metric__value metric__value--sm">
          {{ formatMs(avgCost) }}
        </span>
        <span class="metric__hint">共 {{ steps.length }} 步</span>
      </div>

      <div v-if="batchSummary" class="metric">
        <span class="metric__label">批处理成功率</span>
        <span class="metric__value metric__value--sm">
          {{ batchSummary.rate }}%
        </span>
        <span class="metric__hint">
          {{ batchSummary.success }}/{{ batchSummary.total }}
          <template v-if="batchSummary.failed">
            · 失败 {{ batchSummary.failed }}
          </template>
          <template v-if="batchSummary.skipped">
            · 跳过 {{ batchSummary.skipped }}
          </template>
        </span>
      </div>

      <button
        v-if="exception"
        type="button"
        class="metric metric--action is-danger"
        @click="toggleException"
      >
        <span class="metric__label">异常</span>
        <span class="metric__value metric__value--sm">
          {{ exception.type || "未知类型" }}
        </span>
        <span class="metric__hint">点击查看堆栈</span>
      </button>
    </section>

    <!-- ========== 主体：瀑布列表 + 步骤详情 ========== -->
    <div v-if="steps.length > 0" class="workspace">
      <!-- 左：步骤瀑布 -->
      <section class="pane pane--list" aria-label="执行步骤列表">
        <div class="pane__head">
          <el-input
            v-model="keyword"
            placeholder="搜索步骤名 / 类型 / 错误"
            clearable
            size="small"
            class="pane__search"
          />
          <el-radio-group v-model="sortMode" size="small">
            <el-radio-button value="order">执行顺序</el-radio-button>
            <el-radio-button value="cost">耗时降序</el-radio-button>
          </el-radio-group>
          <el-checkbox
            v-model="onlyFailed"
            :disabled="failedSteps.length === 0"
            size="small"
          >
            只看失败
          </el-checkbox>
          <el-checkbox v-model="onlyMetrics" size="small">
            只看有指标
          </el-checkbox>
          <span class="pane__count">
            {{ visibleSteps.length }} / {{ steps.length }}
          </span>
        </div>

        <!-- 时间刻度：让瀑布条可读 -->
        <div v-if="sortMode === 'order'" class="ruler">
          <span>0</span>
          <span>{{ formatMs(Math.round(timelineTotal / 2)) }}</span>
          <span>{{ formatMs(timelineTotal) }}</span>
        </div>

        <el-empty
          v-if="visibleSteps.length === 0"
          :image-size="60"
          description="没有匹配的步骤"
        >
          <el-button size="small" @click="resetFilters">清除筛选</el-button>
        </el-empty>

        <ul
          v-else
          class="step-list"
          tabindex="0"
          @keydown.down.prevent="moveActive(1)"
          @keydown.up.prevent="moveActive(-1)"
        >
          <li v-for="entry in visibleSteps" :key="entry.index">
            <button
              type="button"
              class="step-row"
              :class="{
                'is-active': entry.index === activeIndex,
                'is-fail': !entry.step.success
              }"
              :data-step-row="entry.index"
              @click="selectStep(entry.index)"
            >
              <span class="step-row__no">{{ entry.index + 1 }}</span>
              <i
                class="step-row__dot"
                :class="entry.step.success ? 'is-success' : 'is-fail'"
              />
              <span class="step-row__name" :title="entry.step.stepName">
                {{ entry.step.stepName }}
              </span>
              <el-tag
                v-if="entry.step.action"
                size="small"
                :type="actionType(entry.step.action) as any"
                effect="plain"
                class="step-row__action"
              >
                {{ entry.step.action }}
              </el-tag>
              <span v-if="entry.step.total != null" class="step-row__batch">
                {{ entry.step.successCount ?? 0 }}/{{ entry.step.total }}
                <em v-if="entry.step.failedCount" class="is-fail-text">
                  失败 {{ entry.step.failedCount }}
                </em>
              </span>

              <!-- 瀑布条：执行顺序按时间偏移定位，耗时模式左对齐比长短 -->
              <span class="step-row__track">
                <span
                  class="step-row__bar"
                  :class="{
                    'is-fail': !entry.step.success,
                    'is-slowest': slowestStep?.index === entry.index
                  }"
                  :style="{
                    left: sortMode === 'order' ? `${entry.offsetPct}%` : '0%',
                    width:
                      sortMode === 'order'
                        ? `${entry.widthPct}%`
                        : `${costBarWidth(entry.cost)}%`
                  }"
                />
              </span>
              <span class="step-row__cost">{{ formatMs(entry.cost) }}</span>
            </button>
          </li>
        </ul>

        <p class="pane__tip">
          点击任意步骤查看右侧详情，选中列表后可用 ↑ / ↓ 键连续排查
        </p>
      </section>

      <!-- 右：选中步骤详情 -->
      <section class="pane pane--detail" aria-label="步骤详情">
        <template v-if="activeEntry">
          <div class="detail__head">
            <div class="detail__title">
              <span class="detail__no">步骤 {{ activeEntry.index + 1 }}</span>
              <h3>{{ activeEntry.step.stepName }}</h3>
            </div>
            <div class="detail__badges">
              <el-tag
                size="small"
                :type="activeEntry.step.success ? 'success' : 'danger'"
              >
                {{ activeEntry.step.success ? "成功" : "失败" }}
              </el-tag>
              <el-tag
                v-if="activeEntry.step.action"
                size="small"
                :type="actionType(activeEntry.step.action) as any"
                effect="plain"
              >
                {{ activeEntry.step.action }}
              </el-tag>
              <el-button link type="primary" size="small" @click="copyStepJson">
                复制数据
              </el-button>
            </div>
          </div>

          <!-- 时间定位 -->
          <div class="detail__timing">
            <div class="timing-item">
              <span class="timing-item__label">耗时</span>
              <span class="timing-item__value">
                {{ formatMs(activeEntry.cost) }}
              </span>
            </div>
            <div class="timing-item">
              <span class="timing-item__label">占总耗时</span>
              <span class="timing-item__value">
                {{ percentOfTotal(activeEntry.cost) }}%
              </span>
            </div>
            <div class="timing-item">
              <span class="timing-item__label">起始偏移</span>
              <span class="timing-item__value">
                T+{{ formatMs(activeEntry.offset) }}
              </span>
            </div>
            <div v-if="clockAt(activeEntry.offset)" class="timing-item">
              <span class="timing-item__label">约发生于</span>
              <span class="timing-item__value">
                {{ clockAt(activeEntry.offset) }}
              </span>
            </div>
          </div>
          <el-progress
            :percentage="percentOfTotal(activeEntry.cost)"
            :stroke-width="4"
            :show-text="false"
            :color="activeEntry.step.success ? undefined : '#f56c6c'"
          />

          <!-- 错误信息优先展示 -->
          <el-alert
            v-if="activeEntry.step.errorMessage"
            :title="activeEntry.step.errorMessage"
            type="error"
            :closable="false"
            show-icon
            class="detail__error"
          />

          <!-- 批处理统计 -->
          <div v-if="activeEntry.step.total != null" class="detail__block">
            <h4 class="block__title">批处理结果</h4>
            <div class="batch-grid">
              <div class="batch-cell">
                <span class="batch-cell__label">总数</span>
                <span class="batch-cell__value">
                  {{ activeEntry.step.total }}
                </span>
              </div>
              <div class="batch-cell">
                <span class="batch-cell__label">成功</span>
                <span class="batch-cell__value is-success">
                  {{ activeEntry.step.successCount ?? 0 }}
                </span>
              </div>
              <div class="batch-cell">
                <span class="batch-cell__label">失败</span>
                <span
                  class="batch-cell__value"
                  :class="{ 'is-fail': activeEntry.step.failedCount }"
                >
                  {{ activeEntry.step.failedCount ?? 0 }}
                </span>
              </div>
              <div class="batch-cell">
                <span class="batch-cell__label">跳过</span>
                <span class="batch-cell__value is-muted">
                  {{ activeEntry.step.skippedCount ?? 0 }}
                </span>
              </div>
              <div class="batch-cell">
                <span class="batch-cell__label">成功率</span>
                <span class="batch-cell__value is-primary">
                  {{ successRate(activeEntry.step) }}%
                </span>
              </div>
            </div>
            <el-progress
              :percentage="successRate(activeEntry.step)"
              :stroke-width="4"
              :show-text="false"
              :color="activeEntry.step.failedCount ? '#e6a23c' : '#67c23a'"
            />
          </div>

          <!-- 指标 metadata -->
          <div
            v-if="
              activeEntry.step.metadata &&
              Object.keys(activeEntry.step.metadata).length > 0
            "
            class="detail__block"
          >
            <h4 class="block__title">步骤���标</h4>
            <div class="meta-grid">
              <div
                v-for="(v, k) in activeEntry.step.metadata"
                :key="k"
                class="meta-row"
                :class="{ 'meta-row--block': isLongValue(v) }"
              >
                <span class="meta-row__key">{{ metaKeyLabel(k) }}</span>
                <ReJsonField
                  v-if="isLongValue(v)"
                  :data="v"
                  readonly
                  :deep="2"
                  max-height="240px"
                  class="meta-row__json"
                />
                <span v-else class="meta-row__value">
                  {{ formatMetaValue(v) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 失败明细 -->
          <div
            v-if="activeEntry.step.failures?.length"
            class="detail__block detail__block--fail"
          >
            <h4 class="block__title">
              失败明细
              <span class="block__count">
                {{ activeEntry.step.failures.length }} 条
              </span>
            </h4>
            <ul class="item-list">
              <li v-for="(item, i) in activeEntry.step.failures" :key="'f' + i">
                {{ batchItemLabel(item) }}
              </li>
            </ul>
          </div>

          <!-- 跳过明细 -->
          <div v-if="activeEntry.step.skips?.length" class="detail__block">
            <h4 class="block__title">
              跳过明细
              <span class="block__count">
                {{ activeEntry.step.skips.length }} 条
              </span>
            </h4>
            <ul class="item-list item-list--muted">
              <li v-for="(item, i) in activeEntry.step.skips" :key="'s' + i">
                {{ batchItemLabel(item) }}
              </li>
            </ul>
          </div>

          <p v-if="!activeStepHasExtra" class="detail__empty-hint">
            该步骤未上报额外指标，仅记录了执行结果与耗时。
          </p>
        </template>

        <el-empty
          v-else
          :image-size="60"
          description="从左侧选择一个步骤查看详情"
        />
      </section>
    </div>

    <!-- ========== 异常区 ========== -->
    <section v-if="exception" data-exception-block class="exception">
      <button type="button" class="exception__head" @click="toggleException">
        <span class="exception__title">
          异常信息
          <code>{{ exception.type || "-" }}</code>
        </span>
        <span class="exception__toggle">
          {{ exceptionOpen ? "收起" : "展开堆栈" }}
        </span>
      </button>
      <p class="exception__message">{{ exception.message || "-" }}</p>
      <template v-if="exceptionOpen && exception.stackTrace">
        <div class="exception__bar">
          <span>堆栈信息</span>
          <el-button
            link
            type="primary"
            size="small"
            @click="copyText(exception.stackTrace, '堆栈信息')"
          >
            复制堆栈
          </el-button>
        </div>
        <pre class="exception__stack">{{ exception.stackTrace }}</pre>
      </template>
    </section>

    <el-empty
      v-if="steps.length === 0 && !exception"
      description="暂无执行详情"
    />
  </div>
</template>

<style scoped lang="scss">
/* ========== 窄屏降级 ========== */
@media (width <= 1200px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .pane--detail {
    position: static;
    max-height: none;
  }

  .step-list {
    max-height: 40vh;
  }

  .step-row__track {
    flex-basis: 80px;
  }
}

@media (width <= 768px) {
  .summary {
    position: static;
  }

  .step-row__batch,
  .step-row__action {
    display: none;
  }
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-height: 78vh;
  padding: 0 4px 4px;
  overflow-y: auto;
  font-variant-numeric: tabular-nums;
}

/* ========== 概要带 ========== */
.summary {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.summary__main {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;

  &.is-success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  &.is-fail {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.summary__title {
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 2px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }
}

.summary__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
}

.fact {
  display: flex;
  flex-direction: column;
  gap: 2px;

  dt {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-primary);
  }
}

.fact__strong {
  font-size: 15px;
  font-weight: 700;
}

.fact--wide {
  max-width: 420px;
}

.fact__code {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;

  code {
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--el-font-family-mono, monospace);
    font-size: 12px;
    color: var(--el-color-primary);
    white-space: nowrap;
  }
}

/* ========== 指标条 ========== */
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  text-align: left;
  background: var(--el-fill-color-lighter);
  border: 1px solid transparent;
  border-radius: 8px;
}

.metric--action {
  font: inherit;
  cursor: pointer;
  transition:
    border-color 0.18s,
    background 0.18s;

  &:hover:not(:disabled) {
    background: var(--el-fill-color);
    border-color: var(--el-color-primary-light-5);
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.metric.is-danger .metric__value {
  color: var(--el-color-danger);
}

.metric__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.metric__value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.metric__value--sm {
  font-size: 15px;
}

.metric__hint {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

/* ========== 主体双栏 ========== */
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.pane {
  padding: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.pane__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.pane__search {
  width: 200px;
}

.pane__count {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pane__tip {
  padding-top: 8px;
  margin: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.ruler {
  display: flex;
  justify-content: space-between;
  padding: 6px 74px 4px 0;
  margin-left: auto;
  font-size: 10px;
  color: var(--el-text-color-disabled);
}

/* ========== 步骤行 ========== */
.step-list {
  max-height: 52vh;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.step-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-fail .step-row__name {
    color: var(--el-color-danger);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.step-row__no {
  flex-shrink: 0;
  width: 26px;
  font-size: 11px;
  color: var(--el-text-color-disabled);
  text-align: right;
}

.step-row__dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;

  &.is-success {
    background: var(--el-color-success);
  }

  &.is-fail {
    background: var(--el-color-danger);
  }
}

.step-row__name {
  flex: 1 1 auto;
  min-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.step-row__action {
  flex-shrink: 0;
}

.step-row__batch {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);

  em {
    font-style: normal;
  }

  .is-fail-text {
    margin-left: 4px;
    color: var(--el-color-danger);
  }
}

.step-row__track {
  position: relative;
  flex: 0 0 130px;
  height: 8px;
  background: var(--el-fill-color);
  border-radius: 4px;
}

.step-row__bar {
  position: absolute;
  top: 0;
  min-width: 2px;
  height: 8px;
  background: var(--el-color-primary);
  border-radius: 4px;

  &.is-slowest {
    background: var(--el-color-warning);
  }

  &.is-fail {
    background: var(--el-color-danger);
  }
}

.step-row__cost {
  flex: 0 0 66px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  text-align: right;
}

/* ========== 右栏详情 ========== */
.pane--detail {
  position: sticky;
  top: 92px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 66vh;
  overflow-y: auto;
}

.detail__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.detail__title {
  min-width: 0;

  h3 {
    margin: 2px 0 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--el-text-color-primary);
    word-break: break-all;
  }
}

.detail__no {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.detail__badges {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

.detail__timing {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.timing-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timing-item__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.timing-item__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail__error {
  align-items: flex-start;
}

.detail__block {
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.detail__block--fail .item-list {
  color: var(--el-color-danger);
}

.block__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.block__count {
  font-size: 11px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.batch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.batch-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.batch-cell__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.batch-cell__value {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary);

  &.is-success {
    color: var(--el-color-success);
  }

  &.is-fail {
    color: var(--el-color-danger);
  }

  &.is-primary {
    color: var(--el-color-primary);
  }

  &.is-muted {
    color: var(--el-text-color-secondary);
  }
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px 14px;
}

.meta-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.6;
}

.meta-row--block {
  flex-direction: column;
  grid-column: 1 / -1;
  gap: 4px;
  align-items: stretch;
}

.meta-row__key {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.meta-row__value {
  font-weight: 500;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.meta-row__json {
  width: 100%;
  font-size: 12px;
}

.item-list {
  max-height: 180px;
  padding-left: 18px;
  margin: 0;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-regular);

  li {
    word-break: break-all;
  }
}

.item-list--muted {
  color: var(--el-text-color-secondary);
}

.detail__empty-hint {
  padding: 8px 0 0;
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ========== 异常区 ========== */
.exception {
  padding: 12px 16px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 10px;
}

.exception__head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
}

.exception__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-danger);

  code {
    padding: 2px 6px;
    font-family: var(--el-font-family-mono, monospace);
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }
}

.exception__toggle {
  font-size: 12px;
  color: var(--el-color-primary);
}

.exception__message {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.exception__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.exception__stack {
  max-height: 300px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  line-height: 1.6;
  color: #f0f0f0;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 6px;
}
</style>
