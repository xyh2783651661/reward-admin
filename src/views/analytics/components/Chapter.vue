<script setup lang="ts">
defineProps<{
  /** 章节序号，例如 "01" */
  index: string;
  /** 本章要回答的业务问题 */
  question: string;
}>();
</script>

<template>
  <section class="chapter" :aria-label="question">
    <header class="chapter__rail">
      <span class="chapter__index">{{ index }}</span>
      <h2 class="chapter__question">{{ question }}</h2>
      <div v-if="$slots.facts" class="chapter__facts">
        <slot name="facts" />
      </div>
    </header>
    <div class="chapter__body">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.chapter {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--ra-space-xl);
  padding: var(--ra-space-xl) 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.chapter__rail {
  align-self: start;
}

.chapter__index {
  font-family: var(--ra-font-mono);
  font-size: var(--ra-font-xs);
  font-variant-numeric: tabular-nums;
  color: var(--el-color-primary);
  letter-spacing: 0.08em;
}

.chapter__question {
  margin: 6px 0 0;
  font-size: var(--ra-font-lg);
  font-weight: 600;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  text-wrap: balance;
}

.chapter__facts {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-sm);
  margin-top: var(--ra-space-md);
  font-size: var(--ra-font-sm);
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.chapter__body {
  min-width: 0;
}

@media (width <= 1100px) {
  .chapter {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--ra-space-md);
  }
}
</style>
