<script setup lang="ts">
import { computed } from "vue";
import {
  formatParts,
  formatNumber,
  type Tone,
  type ValueKind
} from "../utils/format";

const props = withDefaults(
  defineProps<{
    label: string;
    value: number | null | undefined;
    kind?: ValueKind;
    digits?: number;
    /** 数值的语义：影响状态点颜色；negative / warning 同时让数值变色 */
    tone?: Tone;
    size?: "hero" | "default" | "compact";
    /** 指标口径说明，悬停图标显示 */
    hint?: string;
    /** 数值下方的补充说明，例如「成功 120 · 失败 8」 */
    caption?: string;
    /** 相对变化（%），null / undefined 不展示 */
    delta?: number | null;
    deltaLabel?: string;
    /** up-good：上升为好；down-good：下降为好；neutral：不做好坏判断 */
    polarity?: "up-good" | "down-good" | "neutral";
    clickable?: boolean;
  }>(),
  {
    kind: "number",
    digits: undefined,
    tone: "neutral",
    size: "default",
    hint: "",
    caption: "",
    delta: undefined,
    deltaLabel: "",
    polarity: "neutral",
    clickable: false
  }
);

const emit = defineEmits<{ click: [] }>();

const parts = computed(() =>
  formatParts(props.value, props.kind, props.digits)
);

const deltaView = computed(() => {
  const d = props.delta;
  if (d === null || d === undefined || !Number.isFinite(d)) return null;
  const flat = Math.abs(d) < 0.05;
  const up = d > 0;
  let state: "good" | "bad" | "flat" = "flat";
  if (!flat && props.polarity !== "neutral") {
    state = (props.polarity === "up-good") === up ? "good" : "bad";
  }
  return {
    state,
    icon: flat
      ? "ri:subtract-line"
      : up
        ? "ri:arrow-up-line"
        : "ri:arrow-down-line",
    text: flat ? "持平" : `${formatNumber(Math.abs(d), 1)}%`
  };
});
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    class="metric-card"
    :class="[`is-${size}`, `tone-${tone}`, { 'is-clickable': clickable }]"
    @click="clickable && emit('click')"
  >
    <div class="metric-card__label">
      <span class="metric-card__dot" aria-hidden="true" />
      <span>{{ label }}</span>
      <el-tooltip v-if="hint" :content="hint" placement="top">
        <IconifyIconOnline
          icon="ri:question-line"
          class="metric-card__hint"
          tabindex="0"
          aria-label="指标口径说明"
        />
      </el-tooltip>
    </div>
    <div class="metric-card__value">
      <span class="metric-card__number">{{ parts.main }}</span>
      <span v-if="parts.unit" class="metric-card__unit">{{ parts.unit }}</span>
      <span
        v-if="deltaView"
        class="metric-card__delta"
        :class="`is-${deltaView.state}`"
      >
        <IconifyIconOnline :icon="deltaView.icon" />
        {{ deltaView.text }}
        <span v-if="deltaLabel" class="metric-card__delta-label">
          {{ deltaLabel }}
        </span>
      </span>
    </div>
    <div v-if="caption || $slots.caption" class="metric-card__caption">
      <slot name="caption">{{ caption }}</slot>
    </div>
  </component>
</template>

<style scoped lang="scss">
.metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 16px 20px;
  font: inherit;
  color: inherit;
  text-align: left;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);

  &.is-hero {
    padding: 20px 24px;
  }

  &.is-compact {
    padding: 12px 16px;
  }

  &.is-clickable {
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: var(--ra-shadow-card);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}

.metric-card__label {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.metric-card__dot {
  width: 6px;
  height: 6px;
  background: var(--el-text-color-placeholder);
  border-radius: var(--ra-radius-pill);
}

.tone-positive .metric-card__dot {
  background: var(--el-color-success);
}

.tone-warning .metric-card__dot {
  background: var(--el-color-warning);
}

.tone-negative .metric-card__dot {
  background: var(--el-color-danger);
}

.metric-card__hint {
  font-size: var(--ra-font-base);
  cursor: help;
  opacity: 0.7;

  &:hover,
  &:focus-visible {
    opacity: 1;
  }
}

.metric-card__value {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  align-items: baseline;
  color: var(--el-text-color-primary);
}

.metric-card__number {
  font-size: var(--ra-font-2xl);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.is-hero .metric-card__number {
  font-size: 34px;
}

.is-compact .metric-card__number {
  font-size: var(--ra-font-xl);
}

.tone-warning .metric-card__number {
  color: var(--el-color-warning);
}

.tone-negative .metric-card__number {
  color: var(--el-color-danger);
}

.metric-card__unit {
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.metric-card__delta {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  margin-left: 4px;
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);

  &.is-good {
    color: var(--el-color-success);
  }

  &.is-bad {
    color: var(--el-color-danger);
  }
}

.metric-card__delta-label {
  margin-left: 2px;
  color: var(--el-text-color-placeholder);
}

.metric-card__caption {
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
