<script setup lang="ts">
withDefaults(defineProps<{ type?: "info" | "warning"; title?: string }>(), {
  type: "info",
  title: ""
});
</script>

<template>
  <div class="analytics-note" :class="`is-${type}`" role="note">
    <IconifyIconOnline
      :icon="type === 'warning' ? 'ri:alert-line' : 'ri:information-line'"
      class="analytics-note__icon"
    />
    <div>
      <strong v-if="title">{{ title }}</strong>
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.analytics-note {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  font-size: var(--ra-font-xs);
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-md);

  strong {
    margin-right: 6px;
    color: var(--el-text-color-primary);
  }

  &.is-warning {
    background: var(--el-color-warning-light-9);
  }
}

.analytics-note__icon {
  flex: none;
  margin-top: 2px;
  font-size: var(--ra-font-base);
  color: var(--el-text-color-secondary);
}

.is-warning .analytics-note__icon {
  color: var(--el-color-warning);
}
</style>
