<script setup lang="ts">
import type { DetailSummaryItem } from "./types";

defineOptions({ name: "DetailSummary" });

defineProps<{
  items: DetailSummaryItem[];
}>();

const isEmpty = (value: DetailSummaryItem["value"]) =>
  value == null || value === "";
</script>

<template>
  <section class="detail-summary">
    <div v-for="item in items" :key="item.label" class="detail-summary__card">
      <span class="detail-summary__label">{{ item.label }}</span>
      <el-tag
        v-if="item.tagType && !isEmpty(item.value)"
        :type="item.tagType"
        effect="light"
        class="detail-summary__tag"
      >
        {{ item.value }}
      </el-tag>
      <strong
        v-else
        class="detail-summary__value"
        :class="{ 'is-empty': isEmpty(item.value) }"
      >
        {{ isEmpty(item.value) ? "-" : item.value }}
      </strong>
      <span v-if="item.hint" class="detail-summary__hint">{{ item.hint }}</span>
    </div>
  </section>
</template>

<style scoped>
.detail-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.detail-summary__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.detail-summary__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-summary__value {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.detail-summary__value.is-empty {
  font-weight: 400;
  color: var(--el-text-color-placeholder);
}

.detail-summary__tag {
  width: fit-content;
}

.detail-summary__hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
