<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { TaskLogStep } from "@/api/logs";
import { formatMs } from "../format";
import StepInspector from "./StepInspector.vue";
import { actionType, hasStructured, type StepEntry } from "./step-utils";

const props = defineProps<{
  steps: TaskLogStep[];
  totalTime: number;
  startTime?: string | null;
  emptyText: string;
}>();

const listRef = ref<HTMLElement>();
const keyword = ref("");
const onlyFailed = ref(false);
const onlyMetrics = ref(false);
const sortMode = ref<"order" | "cost">("order");
const activeIndex = ref(-1);

/** 瀑布图基准：步骤耗时之和与总耗时取大者，保证条形不越界 */
const timelineTotal = computed(() => {
  const sum = props.steps.reduce((acc, s) => acc + (s.costMs ?? 0), 0);
  return Math.max(sum, props.totalTime, 1);
});

const maxCost = computed(() =>
  props.steps.reduce((max, s) => Math.max(max, s.costMs ?? 0), 0)
);

const slowestIndex = computed(() => {
  let target = -1;
  let cost = -1;
  props.steps.forEach((step, index) => {
    if ((step.costMs ?? 0) > cost) {
      cost = step.costMs ?? 0;
      target = index;
    }
  });
  return target;
});

/** 步骤串行执行，按累加偏移生成瀑布 / 甘特条 */
const entries = computed<StepEntry[]>(() => {
  let acc = 0;
  return props.steps.map((step, index) => {
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

const failedCount = computed(() => props.steps.filter(s => !s.success).length);

const visible = computed<StepEntry[]>(() => {
  const kw = keyword.value.trim().toLowerCase();
  const list = entries.value.filter(({ step }) => {
    if (onlyFailed.value && step.success) return false;
    if (onlyMetrics.value && !hasStructured(step)) return false;
    if (kw) {
      const haystack =
        `${step.stepName ?? ""} ${step.action ?? ""} ${step.errorMessage ?? ""}`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
  return sortMode.value === "cost"
    ? [...list].sort((a, b) => b.cost - a.cost)
    : list;
});

const activeEntry = computed(
  () => entries.value.find(e => e.index === activeIndex.value) ?? null
);

function barStyle(entry: StepEntry) {
  if (sortMode.value === "order") {
    return { left: `${entry.offsetPct}%`, width: `${entry.widthPct}%` };
  }
  const width =
    maxCost.value > 0 ? Math.max((entry.cost / maxCost.value) * 100, 0.8) : 0.8;
  return { left: "0%", width: `${width}%` };
}

function resetFilters() {
  keyword.value = "";
  onlyFailed.value = false;
  onlyMetrics.value = false;
  sortMode.value = "order";
}

/** 默认定位首个失败步骤，打开即进入排障上下文 */
function pickDefault() {
  const firstFailed = props.steps.findIndex(s => !s.success);
  if (firstFailed >= 0) activeIndex.value = firstFailed;
  else activeIndex.value = props.steps.length > 0 ? 0 : -1;
}

watch(
  () => props.steps,
  () => {
    resetFilters();
    pickDefault();
  },
  { immediate: true }
);

function scrollRowIntoView(index: number, smooth = false) {
  nextTick(() => {
    listRef.value?.querySelector(`[data-step-row="${index}"]`)?.scrollIntoView({
      block: smooth ? "center" : "nearest",
      behavior: smooth ? "smooth" : "auto"
    });
  });
}

/** 键盘上下键在可见列表内连续排查 */
function moveActive(delta: number) {
  const list = visible.value;
  if (list.length === 0) return;
  const pos = list.findIndex(e => e.index === activeIndex.value);
  const next =
    pos < 0 ? 0 : Math.min(list.length - 1, Math.max(0, pos + delta));
  activeIndex.value = list[next].index;
  scrollRowIntoView(activeIndex.value);
}

/** 从指标卡跳转：解除会挡住目标步骤的过滤条件后定位 */
function focusStep(index: number) {
  const target = props.steps[index];
  if (!target) return;
  if (onlyMetrics.value && !hasStructured(target)) onlyMetrics.value = false;
  if (onlyFailed.value && target.success) onlyFailed.value = false;
  keyword.value = "";
  activeIndex.value = index;
  scrollRowIntoView(index, true);
}

function showFailedOnly() {
  keyword.value = "";
  onlyFailed.value = true;
  const firstFailed = props.steps.findIndex(s => !s.success);
  if (firstFailed >= 0) {
    activeIndex.value = firstFailed;
    scrollRowIntoView(firstFailed, true);
  }
}

defineExpose({ focusStep, showFailedOnly });
</script>

<template>
  <el-empty
    v-if="steps.length === 0"
    :image-size="72"
    :description="emptyText"
  />

  <div v-else class="workspace">
    <section class="list-pane" aria-label="执行步骤列表">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索步骤名 / 类型 / 错误"
          clearable
        >
          <template #prefix>
            <IconifyIconOnline icon="ri:search-line" />
          </template>
        </el-input>
        <div class="toolbar__row">
          <el-radio-group v-model="sortMode" size="small">
            <el-radio-button value="order">执行顺序</el-radio-button>
            <el-radio-button value="cost">耗时降序</el-radio-button>
          </el-radio-group>
          <el-checkbox v-model="onlyFailed" :disabled="failedCount === 0">
            只看失败
          </el-checkbox>
          <el-checkbox v-model="onlyMetrics">只看有指标</el-checkbox>
          <span class="toolbar__count"
            >{{ visible.length }} / {{ steps.length }}</span
          >
        </div>
      </div>

      <div v-if="sortMode === 'order'" class="ruler" aria-hidden="true">
        <span>0</span>
        <span>{{ formatMs(Math.round(timelineTotal / 2)) }}</span>
        <span>{{ formatMs(timelineTotal) }}</span>
      </div>

      <el-empty
        v-if="visible.length === 0"
        :image-size="56"
        description="没有匹配的步骤"
      >
        <el-button size="small" @click="resetFilters">清除筛选</el-button>
      </el-empty>

      <ul
        v-else
        ref="listRef"
        class="step-list"
        tabindex="0"
        aria-label="步骤列表，可使用上下方向键切换"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
      >
        <li v-for="entry in visible" :key="entry.index">
          <button
            type="button"
            class="step-row"
            :class="{
              'is-active': entry.index === activeIndex,
              'is-fail': !entry.step.success
            }"
            :data-step-row="entry.index"
            :aria-current="entry.index === activeIndex"
            @click="activeIndex = entry.index"
          >
            <span class="step-row__head">
              <i
                class="step-row__dot"
                :class="entry.step.success ? 'is-success' : 'is-fail'"
              />
              <span class="step-row__no">{{ entry.index + 1 }}</span>
              <span class="step-row__name" :title="entry.step.stepName">
                {{ entry.step.stepName }}
              </span>
              <el-tag
                v-if="entry.step.action"
                :type="actionType(entry.step.action)"
                effect="plain"
                size="small"
              >
                {{ entry.step.action }}
              </el-tag>
              <span class="step-row__cost">{{ formatMs(entry.cost) }}</span>
            </span>
            <span class="step-row__track">
              <span
                class="step-row__bar"
                :class="{
                  'is-fail': !entry.step.success,
                  'is-slowest': slowestIndex === entry.index
                }"
                :style="barStyle(entry)"
              />
            </span>
            <span
              v-if="entry.step.total != null || entry.step.errorMessage"
              class="step-row__sub"
            >
              <template v-if="entry.step.total != null">
                {{ entry.step.successCount ?? 0 }}/{{ entry.step.total }} 成功
                <em v-if="entry.step.failedCount" class="is-fail">
                  失败 {{ entry.step.failedCount }}
                </em>
                <em v-if="entry.step.skippedCount">
                  跳过 {{ entry.step.skippedCount }}
                </em>
              </template>
              <em v-else class="is-fail">{{ entry.step.errorMessage }}</em>
            </span>
          </button>
        </li>
      </ul>

      <p class="list-pane__tip">
        点击步骤查看右侧详情，聚焦列表后可用 ↑ / ↓ 连续排查
      </p>
    </section>

    <StepInspector
      class="workspace__inspector"
      :entry="activeEntry"
      :timeline-total="timelineTotal"
      :start-time="startTime"
    />
  </div>
</template>

<style scoped lang="scss">
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.workspace__inspector {
  position: sticky;
  top: 0;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.list-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar__row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  align-items: center;
}

.toolbar__count {
  margin-left: auto;
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.ruler {
  display: flex;
  justify-content: space-between;
  padding: 0 12px;
  font-size: var(--ra-font-2xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-placeholder);
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 240px;
  max-height: calc(100vh - 360px);
  padding: 0;
  margin: 0;
  overflow-y: auto;
  outline: none;
  list-style: none;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 2px;
    border-radius: var(--ra-radius-lg);
  }
}

.step-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ra-radius-lg);
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.is-active {
    background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
    border-color: color-mix(in srgb, var(--el-color-primary) 40%, transparent);
  }

  &.is-fail.is-active {
    background: color-mix(in srgb, var(--el-color-danger) 8%, transparent);
    border-color: color-mix(in srgb, var(--el-color-danger) 40%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.step-row__head {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.step-row__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &.is-success {
    background: var(--el-color-success);
  }

  &.is-fail {
    background: var(--el-color-danger);
  }
}

.step-row__no {
  flex: none;
  min-width: 18px;
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-placeholder);
}

.step-row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--ra-font-sm);
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.step-row__cost {
  flex: none;
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.step-row__track {
  position: relative;
  display: block;
  height: 6px;
  background: var(--el-fill-color);
  border-radius: var(--ra-radius-pill);
}

.step-row__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--el-color-primary-light-3);
  border-radius: var(--ra-radius-pill);

  &.is-fail {
    background: var(--el-color-danger);
  }

  &.is-slowest:not(.is-fail) {
    background: var(--el-color-warning);
  }
}

.step-row__sub {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  white-space: nowrap;

  em {
    margin-left: 8px;
    font-style: normal;

    &:first-child {
      margin-left: 0;
    }

    &.is-fail {
      color: var(--el-color-danger);
    }
  }
}

.list-pane__tip {
  margin: 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-placeholder);
}

@media (width <= 1200px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace__inspector {
    position: static;
    max-height: none;
  }

  .step-list {
    max-height: 420px;
  }
}

@media (width <= 640px) {
  .toolbar__count {
    margin-left: 0;
  }
}
</style>
