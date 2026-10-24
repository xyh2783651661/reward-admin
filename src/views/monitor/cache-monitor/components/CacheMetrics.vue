<script setup lang="ts">
import type { CacheMetricItem } from "../../cache/utils/types";

defineProps<{ cards: CacheMetricItem[] }>();
</script>

<template>
  <section class="cache-metrics" aria-label="核心指标">
    <article
      v-for="card in cards"
      :key="card.label"
      class="cache-metric"
      :title="card.description"
    >
      <div class="cache-metric__head">
        <span class="cache-metric__label">{{ card.label }}</span>
        <span
          class="cache-metric__icon"
          :style="{
            color: card.color,
            background: `color-mix(in srgb, ${card.color} 12%, transparent)`
          }"
        >
          <IconifyIconOnline :icon="card.icon" />
        </span>
      </div>
      <strong class="cache-metric__value">{{ card.value }}</strong>
      <div
        v-if="card.progress != null"
        class="cache-metric__bar"
        role="progressbar"
        :aria-label="card.label"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(card.progress)"
      >
        <span
          :style="{
            width: `${Math.min(100, Math.max(0, card.progress))}%`,
            background: card.color
          }"
        />
      </div>
      <p v-if="card.sub" class="cache-metric__sub">{{ card.sub }}</p>
    </article>
  </section>
</template>

<style scoped lang="scss">
.cache-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.cache-metric {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px 20px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

.cache-metric__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cache-metric__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.cache-metric__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: 18px;
  border-radius: 10px;
}

.cache-metric__value {
  margin-top: 6px;
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.cache-metric__bar {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.4s ease;
  }
}

.cache-metric__sub {
  margin: 10px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
</style>
