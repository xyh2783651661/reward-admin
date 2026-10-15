<script setup lang="ts">
defineOptions({ name: "DetailLayout" });

withDefaults(
  defineProps<{
    /** 侧栏宽度（宽屏下生效） */
    asideWidth?: number;
  }>(),
  { asideWidth: 400 }
);
</script>

<template>
  <div
    class="detail-layout"
    :style="{ '--detail-aside-width': `${asideWidth}px` }"
  >
    <div class="detail-layout__main">
      <slot />
    </div>
    <aside class="detail-layout__aside">
      <slot name="aside" />
    </aside>
  </div>
</template>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--detail-aside-width);
  gap: 16px;
  align-items: start;
}

.detail-layout__main,
.detail-layout__aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (width <= 1200px) {
  .detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
