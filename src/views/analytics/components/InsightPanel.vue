<script setup lang="ts">
export interface Insight {
  level: "critical" | "warning" | "info";
  title: string;
  /** 触发依据：必须包含真实数据与阈值，保证洞察可追溯 */
  evidence: string;
  actionLabel?: string;
  onAction?: () => void;
}

withDefaults(
  defineProps<{
    insights: Insight[];
    /** 规则说明，例如「失败率 > 15% 或存在状态不一致的供应商」 */
    rules?: string;
    loading?: boolean;
  }>(),
  { rules: "", loading: false }
);

const ICONS: Record<Insight["level"], string> = {
  critical: "ri:error-warning-fill",
  warning: "ri:alert-fill",
  info: "ri:information-fill"
};
const LEVEL_TEXT: Record<Insight["level"], string> = {
  critical: "严重",
  warning: "关注",
  info: "提示"
};
</script>

<template>
  <section class="insight-panel" aria-label="需要关注">
    <header class="insight-panel__header">
      <h2>需要关注</h2>
      <span v-if="rules" class="insight-panel__rules">规则：{{ rules }}</span>
    </header>
    <el-skeleton v-if="loading" :rows="2" animated />
    <p v-else-if="!insights.length" class="insight-panel__ok">
      <IconifyIconOnline icon="ri:checkbox-circle-fill" />
      当前周期内未触发任何关注规则
    </p>
    <ul v-else class="insight-panel__list">
      <li
        v-for="item in insights"
        :key="item.title"
        class="insight-item"
        :class="`is-${item.level}`"
      >
        <IconifyIconOnline
          :icon="ICONS[item.level]"
          class="insight-item__icon"
        />
        <div class="insight-item__body">
          <div class="insight-item__title">
            <span class="sr-only">{{ LEVEL_TEXT[item.level] }}：</span>
            {{ item.title }}
          </div>
          <div class="insight-item__evidence">{{ item.evidence }}</div>
        </div>
        <el-button
          v-if="item.actionLabel && item.onAction"
          size="small"
          link
          type="primary"
          @click="item.onAction"
        >
          {{ item.actionLabel }}
        </el-button>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.insight-panel {
  padding: 16px 20px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}

.insight-panel__header {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--ra-space-md);
  align-items: baseline;
  margin-bottom: var(--ra-space-sm);

  h2 {
    margin: 0;
    font-size: var(--ra-font-md);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.insight-panel__rules {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.insight-panel__ok {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-regular);

  svg {
    color: var(--el-color-success);
  }
}

.insight-panel__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--ra-space-xs) var(--ra-space-md);
  padding: 0;
  margin: 0;
  list-style: none;
}

.insight-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-md);

  &.is-critical .insight-item__icon {
    color: var(--el-color-danger);
  }

  &.is-warning .insight-item__icon {
    color: var(--el-color-warning);
  }

  &.is-info .insight-item__icon {
    color: var(--el-color-info);
  }
}

.insight-item__icon {
  flex: none;
  margin-top: 2px;
  font-size: var(--ra-font-md);
}

.insight-item__body {
  flex: 1;
  min-width: 0;
}

.insight-item__title {
  font-size: var(--ra-font-base);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.insight-item__evidence {
  margin-top: 2px;
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
