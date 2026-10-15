<script setup lang="ts">
defineOptions({ name: "DetailHeader" });

defineProps<{
  /** 主标题：详情对象的名称 / 主题 */
  title: string;
  /** 副标题：编码、类型、业务标识等辅助信息 */
  subtitle?: string;
}>();
</script>

<template>
  <header class="detail-header">
    <div class="detail-header__main">
      <div class="detail-header__heading">
        <h2 class="detail-header__title" :title="title">{{ title }}</h2>
        <div v-if="$slots.tags" class="detail-header__tags">
          <slot name="tags" />
        </div>
      </div>
      <div v-if="subtitle || $slots.subtitle" class="detail-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>
    <div v-if="$slots.actions" class="detail-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.detail-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 8px;
}

.detail-header__main {
  flex: 1;
  min-width: 0;
}

.detail-header__heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.detail-header__title {
  max-width: 100%;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.detail-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.detail-header__subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.detail-header__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

@media (width <= 768px) {
  .detail-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
