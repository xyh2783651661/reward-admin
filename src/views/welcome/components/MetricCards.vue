<script setup lang="ts">
import type { SummaryTrend, WorkbenchSummaryCard } from "@/api/workbench";

defineProps<{
  cards: WorkbenchSummaryCard[];
  loading: boolean;
  error: string;
}>();

defineEmits<{ navigate: [path?: string]; retry: [] }>();

function formatValue(card: WorkbenchSummaryCard) {
  const number = Number(card.value);
  const value = Number.isInteger(number) ? number : number.toFixed(1);
  return `${value}${card.unit ?? ""}`;
}

function formatDelta(card: WorkbenchSummaryCard) {
  const value = Math.abs(card.delta);
  const number =
    Number.isInteger(value) || value >= 10 ? value : value.toFixed(1);
  return `${number}${card.unit ?? ""}`;
}

const trendIcon: Record<SummaryTrend, string> = {
  up: "ri:arrow-up-line",
  down: "ri:arrow-down-line",
  flat: "ri:subtract-line"
};
</script>

<template>
  <section v-loading="loading" class="metrics" aria-label="核心指标">
    <div v-if="error" class="metrics__error">
      <IconifyIconOnline icon="ri:error-warning-line" />
      <span>{{ error }}</span>
      <el-button size="small" type="primary" text @click="$emit('retry')">
        重试
      </el-button>
    </div>

    <template v-else>
      <component
        :is="card.path ? 'button' : 'div'"
        v-for="card in cards"
        :key="card.key"
        class="metric"
        :class="{ 'is-clickable': card.path }"
        @click="$emit('navigate', card.path)"
      >
        <span
          class="metric__icon"
          :style="{
            color: card.color,
            background: `color-mix(in srgb, ${card.color} 12%, transparent)`
          }"
        >
          <IconifyIconOnline :icon="card.icon" />
        </span>
        <span class="metric__body">
          <span class="metric__label">{{ card.label }}</span>
          <strong class="metric__value">{{ formatValue(card) }}</strong>
          <span class="metric__foot">
            <span class="metric__delta" :class="`is-${card.trend}`">
              <IconifyIconOnline :icon="trendIcon[card.trend]" />
              {{ formatDelta(card) }}
            </span>
            <span class="metric__desc">{{ card.description }}</span>
          </span>
        </span>
      </component>
      <p v-if="!loading && !cards.length" class="metrics__empty">
        暂无指标数据
      </p>
    </template>
  </section>
</template>

<style scoped lang="scss">
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  min-height: 112px;
}

.metric {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  font: inherit;
  text-align: left;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 6px 18px rgb(0 0 0 / 6%);
      transform: translateY(-2px);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}

.metric__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 22px;
  border-radius: 12px;
}

.metric__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.metric__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric__value {
  margin: 2px 0 8px;
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.metric__foot {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
}

.metric__delta {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
  padding: 1px 7px 1px 4px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;

  &.is-up {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  &.is-down {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
}

.metric__desc {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.metrics__error,
.metrics__empty {
  display: flex;
  grid-column: 1 / -1;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 32px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color-overlay);
  border: 1px dashed var(--el-border-color);
  border-radius: 14px;
}
</style>
