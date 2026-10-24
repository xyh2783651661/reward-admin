<script setup lang="ts">
import type { CacheInsight } from "../../cache/utils/types";

defineProps<{ items: CacheInsight[] }>();
</script>

<template>
  <section class="cache-insights" aria-label="运行诊断">
    <div
      v-for="item in items"
      :key="item.title"
      class="cache-insight"
      :class="`is-${item.type}`"
      :role="item.type === 'danger' ? 'alert' : undefined"
    >
      <IconifyIconOnline :icon="item.icon" class="cache-insight__icon" />
      <div class="cache-insight__body">
        <strong>{{ item.title }}</strong>
        <span>{{ item.description }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cache-insights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.cache-insight {
  --tone: var(--el-color-info);

  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--tone) 8%, var(--el-bg-color-overlay));
  border: 1px solid color-mix(in srgb, var(--tone) 25%, transparent);
  border-radius: 12px;

  &.is-success {
    --tone: var(--el-color-success);
  }

  &.is-warning {
    --tone: var(--el-color-warning);
  }

  &.is-danger {
    --tone: var(--el-color-danger);
  }
}

.cache-insight__icon {
  flex: 0 0 auto;
  margin-top: 1px;
  font-size: 18px;
  color: var(--tone);
}

.cache-insight__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);

  strong {
    font-size: 13px;
    color: var(--el-text-color-primary);
  }
}
</style>
