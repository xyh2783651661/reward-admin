<script setup lang="ts">
import { computed } from "vue";
import { formatPercent, type Tone } from "../utils/format";

const props = withDefaults(
  defineProps<{
    /** 0–100 */
    value: number | null | undefined;
    tone?: Tone;
    digits?: number;
  }>(),
  { tone: "neutral", digits: 1 }
);

const width = computed(() =>
  Math.min(
    100,
    Math.max(0, Number.isFinite(props.value) ? (props.value as number) : 0)
  )
);
</script>

<template>
  <div class="rate-bar" :class="`tone-${tone}`">
    <span class="rate-bar__text">{{ formatPercent(value, digits) }}</span>
    <span class="rate-bar__track" aria-hidden="true">
      <span class="rate-bar__fill" :style="{ width: `${width}%` }" />
    </span>
  </div>
</template>

<style scoped lang="scss">
.rate-bar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rate-bar__text {
  min-width: 48px;
  font-variant-numeric: tabular-nums;
}

.rate-bar__track {
  flex: 1;
  min-width: 32px;
  max-width: 80px;
  height: 4px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: var(--ra-radius-pill);
}

.rate-bar__fill {
  display: block;
  height: 100%;
  background: var(--el-text-color-placeholder);
  border-radius: var(--ra-radius-pill);
}

.tone-positive .rate-bar__fill {
  background: var(--el-color-success);
}

.tone-warning .rate-bar__fill {
  background: var(--el-color-warning);
}

.tone-negative .rate-bar__fill {
  background: var(--el-color-danger);
}

.tone-negative .rate-bar__text {
  color: var(--el-color-danger);
}
</style>
