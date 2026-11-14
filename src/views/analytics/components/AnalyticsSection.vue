<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <section class="analytics-section">
    <header class="analytics-section__header">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>

<style scoped lang="scss">
.analytics-section {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-sm);
  margin-top: var(--ra-space-xs);
}

.analytics-section__header {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--ra-space-md);
  align-items: baseline;

  h2 {
    margin: 0;
    font-size: var(--ra-font-lg);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }
}
</style>
