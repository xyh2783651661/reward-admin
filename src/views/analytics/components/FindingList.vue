<script setup lang="ts">
import type { Finding } from "./types";

withDefaults(
  defineProps<{
    items: Finding[];
    /** 规则说明，保证每个提示可追溯 */
    rules?: string;
    emptyText?: string;
  }>(),
  { rules: "", emptyText: "当前周期内未触发任何关注规则" }
);

const LEVEL_TEXT: Record<Finding["level"], string> = {
  critical: "严重",
  warning: "关注",
  info: "提示"
};
</script>

<template>
  <div class="findings">
    <p v-if="!items.length" class="findings__empty">
      <IconifyIconOnline icon="ri:checkbox-circle-line" />
      {{ emptyText }}
    </p>
    <ol v-else class="findings__list">
      <li
        v-for="(item, i) in items"
        :key="`${item.module}-${item.title}-${i}`"
        class="finding"
        :class="`level-${item.level}`"
      >
        <span class="finding__marker" :title="LEVEL_TEXT[item.level]" />
        <div class="finding__main">
          <div class="finding__head">
            <span v-if="item.module" class="finding__module">{{
              item.module
            }}</span>
            <strong>{{ item.title }}</strong>
          </div>
          <p class="finding__evidence">{{ item.evidence }}</p>
        </div>
        <el-button
          v-if="item.onAction"
          size="small"
          text
          type="primary"
          @click="item.onAction"
        >
          {{ item.actionLabel ?? "查看" }}
          <IconifyIconOnline icon="ri:arrow-right-s-line" />
        </el-button>
      </li>
    </ol>
    <p v-if="rules" class="findings__rules">判断规则：{{ rules }}</p>
  </div>
</template>

<style scoped lang="scss">
.findings__list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.finding {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: var(--ra-space-sm);
  align-items: start;
  padding: var(--ra-space-sm) 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: 0;
  }
}

.finding__marker {
  width: 8px;
  height: 8px;
  margin-top: 7px;
  background: var(--el-color-info);
  border-radius: 50%;

  .level-warning & {
    background: var(--el-color-warning);
  }

  .level-critical & {
    background: var(--el-color-danger);
  }
}

.finding__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  font-size: var(--ra-font-base);
  color: var(--el-text-color-primary);
}

.finding__module {
  padding: 0 6px;
  font-size: var(--ra-font-2xs);
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-radius: var(--ra-radius-sm);
}

.finding__evidence {
  margin: 2px 0 0;
  font-size: var(--ra-font-xs);
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.findings__empty {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.findings__rules {
  margin: var(--ra-space-sm) 0 0;
  font-size: var(--ra-font-2xs);
  line-height: 1.6;
  color: var(--el-text-color-placeholder);
}
</style>
