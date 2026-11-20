<script setup lang="ts">
export interface Fact {
  label: string;
  value: string;
  hint?: string;
}

defineProps<{
  items?: Fact[];
  /** 没有结构化事实时，用一段说明文字解释怎么读这张图 */
  note?: string;
}>();
</script>

<template>
  <dl v-if="items?.length" class="fact-list">
    <div v-for="f in items" :key="f.label">
      <dt>{{ f.label }}</dt>
      <dd>{{ f.value }}</dd>
      <p v-if="f.hint">{{ f.hint }}</p>
    </div>
  </dl>
  <p v-if="note" class="fact-note">{{ note }}</p>
</template>

<style scoped lang="scss">
.fact-list {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-md);
  margin: var(--ra-space-md) 0 0;

  dt {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-size: var(--ra-font-lg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 2px 0 0;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }
}

.fact-note {
  margin: var(--ra-space-sm) 0 0;
  font-size: var(--ra-font-xs);
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}
</style>
