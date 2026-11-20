<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 读屏标签 */
    label?: string;
    /** 单个读数的最小宽度 */
    minWidth?: number;
  }>(),
  { label: "核心读数", minWidth: 190 }
);
</script>

<template>
  <section
    class="lead-strip"
    :aria-label="label"
    :style="{ '--lead-min': `${minWidth}px` }"
  >
    <slot />
  </section>
</template>

<style scoped lang="scss">
.lead-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--lead-min), 1fr));
  padding: var(--ra-space-lg) 0;

  > :deep(*) {
    padding: 0 var(--ra-space-lg);
    border-left: 1px solid var(--el-border-color-lighter);

    &:first-child {
      padding-left: 0;
      border-left: 0;
    }
  }
}
</style>
