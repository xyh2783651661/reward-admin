<script setup lang="ts">
import type { WorkbenchQuickEntry } from "@/api/workbench";
import PanelCard from "@/components/PanelCard/index.vue";

defineProps<{
  entries: WorkbenchQuickEntry[];
  loading: boolean;
}>();

defineEmits<{ navigate: [path?: string] }>();
</script>

<template>
  <PanelCard
    title="快速开始"
    description="常用功能一键直达"
    :loading="loading"
    :empty="!loading && !entries.length"
    empty-text="暂无常用功能"
    empty-icon="ri:apps-2-line"
    :min-height="96"
  >
    <div class="entries">
      <button
        v-for="entry in entries"
        :key="entry.key"
        class="entry"
        @click="$emit('navigate', entry.path)"
      >
        <span
          class="entry__icon"
          :style="{
            color: entry.accent,
            background: `color-mix(in srgb, ${entry.accent} 12%, transparent)`
          }"
        >
          <IconifyIconOnline :icon="entry.icon" />
        </span>
        <span class="entry__text">
          <strong>{{ entry.title }}</strong>
          <small>{{ entry.description }}</small>
        </span>
      </button>
    </div>
  </PanelCard>
</template>

<style scoped lang="scss">
.entries {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.entry {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-extra-light);
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    background 0.2s,
    border-color 0.2s;

  &:hover {
    background: var(--el-bg-color-overlay);
    border-color: var(--el-color-primary-light-5);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.entry__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: 19px;
  border-radius: 10px;
}

.entry__text {
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}
</style>
