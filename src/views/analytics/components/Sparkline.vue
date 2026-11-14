<script setup lang="ts">
import { computed } from "vue";
import type { Tone } from "../utils/format";

const props = withDefaults(
  defineProps<{
    values: Array<number | null | undefined>;
    tone?: Tone;
    width?: number;
    height?: number;
    /** 屏幕阅读器摘要 */
    label?: string;
  }>(),
  { tone: "neutral", width: 96, height: 28, label: "" }
);

const PAD = 3;

const geometry = computed(() => {
  const points = props.values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => Number.isFinite(p.v));
  if (points.length < 2) return null;
  const min = Math.min(...points.map(p => p.v));
  const max = Math.max(...points.map(p => p.v));
  const span = max - min || 1;
  const last = props.values.length - 1 || 1;
  const x = (i: number) => PAD + (i / last) * (props.width - PAD * 2);
  const y = (v: number) =>
    props.height - PAD - ((v - min) / span) * (props.height - PAD * 2);
  const coords = points.map(p => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`);
  const tail = points[points.length - 1];
  return {
    line: coords.join(" "),
    area: `${x(points[0].i).toFixed(1)},${props.height} ${coords.join(" ")} ${x(tail.i).toFixed(1)},${props.height}`,
    tailX: x(tail.i),
    tailY: y(tail.v)
  };
});
</script>

<template>
  <svg
    v-if="geometry"
    class="sparkline"
    :class="`tone-${tone}`"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    role="img"
    :aria-label="label || '趋势'"
  >
    <polygon :points="geometry.area" class="sparkline__area" />
    <polyline :points="geometry.line" class="sparkline__line" />
    <circle
      :cx="geometry.tailX"
      :cy="geometry.tailY"
      r="2.5"
      class="sparkline__dot"
    />
  </svg>
  <span
    v-else
    class="sparkline-empty"
    :style="{ width: `${width}px` }"
    title="数据点不足，无法绘制趋势"
  >
    —
  </span>
</template>

<style scoped lang="scss">
.sparkline {
  --spark-color: var(--el-color-primary);

  flex: none;
  overflow: visible;

  &.tone-positive {
    --spark-color: var(--el-color-success);
  }

  &.tone-warning {
    --spark-color: var(--el-color-warning);
  }

  &.tone-negative {
    --spark-color: var(--el-color-danger);
  }

  &.tone-neutral {
    --spark-color: var(--el-text-color-secondary);
  }
}

.sparkline__line {
  fill: none;
  stroke: var(--spark-color);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sparkline__area {
  opacity: 0.1;
  fill: var(--spark-color);
}

.sparkline__dot {
  fill: var(--spark-color);
}

.sparkline-empty {
  display: inline-block;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-placeholder);
  text-align: center;
}
</style>
