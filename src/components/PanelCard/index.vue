<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    loading?: boolean;
    error?: string;
    empty?: boolean;
    emptyText?: string;
    emptyIcon?: string;
    minHeight?: number;
  }>(),
  {
    description: "",
    loading: false,
    error: "",
    empty: false,
    emptyText: "暂无数据",
    emptyIcon: "ri:inbox-line",
    minHeight: 120
  }
);

defineEmits<{ retry: [] }>();
</script>

<template>
  <section class="panel-card">
    <header class="panel-card__header">
      <div class="panel-card__title">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div class="panel-card__extra"><slot name="extra" /></div>
    </header>

    <div
      v-loading="loading"
      class="panel-card__body"
      :style="{ minHeight: `${minHeight}px` }"
    >
      <div v-if="error" class="panel-card__state is-error">
        <IconifyIconOnline icon="ri:error-warning-line" />
        <span>{{ error }}</span>
        <el-button size="small" type="primary" text @click="$emit('retry')">
          重试
        </el-button>
      </div>
      <div v-else-if="empty" class="panel-card__state">
        <IconifyIconOnline :icon="emptyIcon" />
        <span>{{ emptyText }}</span>
      </div>
      <div v-show="!error && !empty" class="panel-card__content">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}

.panel-card__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 0;
}

.panel-card__title h2 {
  margin: 0;
  font-size: var(--ra-font-md);
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.panel-card__title p {
  margin: 2px 0 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.panel-card__extra {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.panel-card__body {
  position: relative;
  flex: 1;
  padding: 16px 20px 20px;
}

.panel-card__state {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);

  > svg,
  > .iconify {
    font-size: var(--ra-font-display);
    opacity: 0.7;
  }

  &.is-error {
    color: var(--el-color-danger);
  }
}
</style>
