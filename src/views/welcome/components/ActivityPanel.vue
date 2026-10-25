<script setup lang="ts">
import type { WorkbenchActivityItem } from "@/api/workbench";
import PanelCard from "@/components/PanelCard/index.vue";

defineProps<{
  activities: WorkbenchActivityItem[];
  loading: boolean;
  error: string;
}>();

defineEmits<{ navigate: [path?: string]; retry: [] }>();
</script>

<template>
  <PanelCard
    title="最近动态"
    description="系统最新操作记录"
    :loading="loading"
    :error="error"
    :empty="!loading && !activities.length"
    empty-text="暂无最新动态"
    empty-icon="ri:history-line"
    :min-height="96"
    @retry="$emit('retry')"
  >
    <ul class="timeline">
      <li v-for="item in activities" :key="item.id">
        <component
          :is="item.path ? 'button' : 'div'"
          class="activity"
          :class="{ 'is-clickable': item.path }"
          @click="$emit('navigate', item.path)"
        >
          <span class="activity__icon">
            <IconifyIconOnline :icon="item.icon" />
          </span>
          <span class="activity__text">
            <strong>{{ item.title }}</strong>
            <span class="activity__desc">{{ item.description }}</span>
            <small>{{ item.operator }} · {{ item.time }}</small>
          </span>
        </component>
      </li>
    </ul>
  </PanelCard>
</template>

<style scoped lang="scss">
.timeline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 4px 24px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.activity {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 10px;
  font: inherit;
  text-align: left;
  background: none;
  border: 0;
  border-radius: var(--ra-radius-lg);

  &.is-clickable {
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color-light);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}

.activity__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: var(--ra-font-md);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 50%;
}

.activity__text {
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    font-size: var(--ra-font-base);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  small {
    margin-top: 2px;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-placeholder);
  }
}

.activity__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: var(--ra-font-xs);
  line-height: 1.6;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
}
</style>
