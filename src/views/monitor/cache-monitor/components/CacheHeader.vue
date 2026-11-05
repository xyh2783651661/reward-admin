<script setup lang="ts">
defineProps<{
  statusText: string;
  statusType: string;
  statusMessage: string;
  cacheType: string;
  uptimeText: string;
  updatedText: string;
  loading: boolean;
}>();

defineEmits<{ refresh: [] }>();
</script>

<template>
  <header class="cache-header">
    <div class="cache-header__main">
      <div class="cache-header__title">
        <h1>缓存监控</h1>
        <span
          class="cache-header__status"
          :class="`is-${statusType}`"
          :title="statusMessage"
        >
          <i aria-hidden="true" />
          {{ statusText }}
        </span>
      </div>
      <ul class="cache-header__meta">
        <li>
          <IconifyIconOnline icon="ri:database-2-line" />
          {{ cacheType }}
        </li>
        <li v-if="uptimeText">
          <IconifyIconOnline icon="ri:time-line" />
          运行 {{ uptimeText }}
        </li>
        <li>
          <IconifyIconOnline icon="ri:refresh-line" />
          {{ updatedText }}
        </li>
      </ul>
    </div>
    <el-button
      type="primary"
      :loading="loading"
      aria-label="刷新缓存监控数据"
      @click="$emit('refresh')"
    >
      <IconifyIconOnline v-if="!loading" icon="ri:refresh-line" />
      <span class="cache-header__btn-text">刷新数据</span>
    </el-button>
  </header>
</template>

<style scoped lang="scss">
.cache-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.cache-header__main {
  min-width: 0;
}

.cache-header__title {
  display: flex;
  gap: 12px;
  align-items: center;

  h1 {
    margin: 0;
    font-size: var(--ra-font-xl);
    font-weight: 600;
    line-height: 1.3;
    color: var(--el-text-color-primary);
  }
}

.cache-header__status {
  --status-color: var(--el-color-info);

  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 2px 10px;
  font-size: var(--ra-font-xs);
  font-weight: 600;
  color: var(--status-color);
  background: color-mix(in srgb, var(--status-color) 12%, transparent);
  border-radius: var(--ra-radius-pill);

  i {
    width: 6px;
    height: 6px;
    background: var(--status-color);
    border-radius: 50%;
  }

  &.is-success {
    --status-color: var(--el-color-success);

    i {
      animation: cache-pulse 2s ease-in-out infinite;
    }
  }

  &.is-danger {
    --status-color: var(--el-color-danger);
  }

  &.is-warning {
    --status-color: var(--el-color-warning);
  }
}

.cache-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  padding: 0;
  margin: 6px 0 0;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
  list-style: none;

  li {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
}

@keyframes cache-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cache-header__status i {
    animation: none !important;
  }
}

@media (width <= 640px) {
  .cache-header {
    align-items: flex-start;
  }

  .cache-header__btn-text {
    display: none;
  }
}
</style>
