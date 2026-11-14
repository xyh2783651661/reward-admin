<script setup lang="ts">
import { computed } from "vue";
import type { StatsMeta } from "@/api/analytics";

const props = defineProps<{ meta: StatsMeta | null }>();

const items = computed(() => {
  const m = props.meta;
  if (!m) return [];
  return [
    {
      label: "统计区间",
      value: m.startDate && m.endDate ? `${m.startDate} ~ ${m.endDate}` : ""
    },
    { label: "数据截至", value: m.dataThrough },
    { label: "计算于", value: m.calculatedAt },
    { label: "口径版本", value: m.metricVersion }
  ].filter(i => i.value);
});
</script>

<template>
  <ul v-if="items.length" class="stats-meta">
    <li v-for="item in items" :key="item.label">
      <span class="stats-meta__label">{{ item.label }}</span>
      <span class="stats-meta__value">{{ item.value }}</span>
    </li>
    <li v-if="meta?.timezone">
      <span class="stats-meta__label">时区</span>
      <span class="stats-meta__value">{{ meta.timezone }}</span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.stats-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--ra-space-lg);
  padding: 0;
  margin: 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  list-style: none;
}

.stats-meta__label {
  margin-right: 6px;
}

.stats-meta__value {
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);
}
</style>
