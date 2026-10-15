<script setup lang="ts">
defineOptions({ name: "DetailSection" });

defineProps<{
  title: string;
  /** 标题右侧的补充说明（如数量） */
  description?: string;
  /** 去掉内容区内边距（内容为表格 / 预览时使用） */
  flush?: boolean;
}>();
</script>

<template>
  <section class="detail-section">
    <header class="detail-section__header">
      <div class="detail-section__heading">
        <h3 class="detail-section__title">{{ title }}</h3>
        <span v-if="description" class="detail-section__desc">
          {{ description }}
        </span>
      </div>
      <div v-if="$slots.extra" class="detail-section__extra">
        <slot name="extra" />
      </div>
    </header>
    <div class="detail-section__body" :class="{ 'is-flush': flush }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.detail-section {
  min-width: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.detail-section__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-section__heading {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.detail-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-section__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-section__extra {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.detail-section__body {
  padding: 16px;
}

.detail-section__body.is-flush {
  padding: 0;
}
</style>
