<script setup lang="ts">
import { computed } from "vue";
import Sparkline from "./Sparkline.vue";
import { formatParts, type Tone, type ValueKind } from "../utils/format";

const props = withDefaults(
  defineProps<{
    label: string;
    value: number | null | undefined;
    kind?: ValueKind;
    tone?: Tone;
    /** lead：页面主读数；base：行内读数 */
    size?: "lead" | "base";
    /** 数值下方的事实说明 */
    caption?: string;
    /** 指标口径 */
    hint?: string;
    spark?: Array<number | null | undefined>;
  }>(),
  {
    kind: "number",
    tone: "neutral",
    size: "base",
    caption: "",
    hint: "",
    spark: undefined
  }
);

const parts = computed(() => formatParts(props.value, props.kind));
</script>

<template>
  <div class="readout" :class="[`size-${size}`, `tone-${tone}`]">
    <div class="readout__label">
      <span>{{ label }}</span>
      <el-tooltip v-if="hint" :content="hint" placement="top">
        <IconifyIconOnline icon="ri:question-line" class="readout__hint" />
      </el-tooltip>
    </div>
    <div class="readout__value">
      <span class="readout__main">{{ parts.main }}</span>
      <span v-if="parts.unit" class="readout__unit">{{ parts.unit }}</span>
    </div>
    <div v-if="caption || spark" class="readout__foot">
      <Sparkline
        v-if="spark"
        :values="spark"
        :tone="tone === 'neutral' ? 'neutral' : tone"
        :width="size === 'lead' ? 132 : 84"
        :height="size === 'lead' ? 34 : 24"
        :label="`${label}趋势`"
      />
      <span v-if="caption" class="readout__caption">{{ caption }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.readout {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.readout__label {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  letter-spacing: 0.04em;
}

.readout__hint {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  cursor: help;
}

.readout__value {
  display: flex;
  gap: 4px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.readout__main {
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.readout__unit {
  font-size: var(--ra-font-base);
  color: var(--el-text-color-secondary);
}

.readout__foot {
  display: flex;
  gap: var(--ra-space-xs);
  align-items: center;
  min-height: 24px;
}

.readout__caption {
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.size-lead .readout__main {
  font-size: 44px;
}

.size-base .readout__main {
  font-size: 28px;
}

.tone-warning .readout__main {
  color: var(--el-color-warning);
}

.tone-negative .readout__main {
  color: var(--el-color-danger);
}
</style>
