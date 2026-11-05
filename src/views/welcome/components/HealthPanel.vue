<script setup lang="ts">
import { computed } from "vue";
import type { WorkbenchHealthLight } from "@/api/workbench";
import PanelCard from "@/components/PanelCard/index.vue";

const props = defineProps<{
  lights: WorkbenchHealthLight[];
  loading: boolean;
  error: string;
}>();

defineEmits<{ navigate: [path?: string]; retry: [] }>();

const rank = { down: 0, warn: 1, up: 2 } as const;
const sorted = computed(() =>
  props.lights
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) => rank[a.item.status] - rank[b.item.status] || a.index - b.index
    )
    .map(({ item }) => item)
);
const attentionCount = computed(
  () => props.lights.filter(item => item.status !== "up").length
);
</script>

<template>
  <PanelCard
    title="运行状态"
    description="核心服务实时监测"
    :loading="loading"
    :error="error"
    :empty="!loading && !lights.length"
    empty-text="暂无运行状态数据"
    empty-icon="ri:pulse-line"
    @retry="$emit('retry')"
  >
    <template #extra>
      <span v-if="attentionCount" class="badge is-alert">
        {{ attentionCount }} 项需关注
      </span>
      <span v-else-if="lights.length" class="badge is-ok">全部正常</span>
    </template>

    <ul class="lights">
      <li v-for="light in sorted" :key="light.key">
        <component
          :is="light.path ? 'button' : 'div'"
          class="light"
          :class="[`is-${light.status}`, { 'is-clickable': light.path }]"
          @click="$emit('navigate', light.path)"
        >
          <span class="light__icon">
            <IconifyIconOnline :icon="light.icon" />
          </span>
          <span class="light__text">
            <span class="light__label">{{ light.label }}</span>
            <strong>{{ light.primary }}</strong>
            <em v-if="light.status !== 'up' && light.secondary">
              {{ light.secondary }}
            </em>
          </span>
          <i class="light__dot" />
        </component>
      </li>
    </ul>
  </PanelCard>
</template>

<style scoped lang="scss">
.badge {
  padding: 2px 10px;
  font-size: var(--ra-font-xs);
  font-weight: 600;
  border-radius: var(--ra-radius-pill);

  &.is-alert {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  &.is-ok {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }
}

.lights {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.light {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  font: inherit;
  text-align: left;
  background: var(--el-fill-color-extra-light);
  border: 1px solid transparent;
  border-radius: var(--ra-radius-lg);
  transition: border-color 0.2s;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--el-border-color);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }

  &.is-warn {
    background: var(--el-color-warning-light-9);
  }

  &.is-down {
    background: var(--el-color-danger-light-9);
  }
}

.light__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: var(--ra-font-md);
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-radius: var(--ra-radius-md);

  .is-warn & {
    color: var(--el-color-warning);
    background: var(--el-bg-color-overlay);
  }

  .is-down & {
    color: var(--el-color-danger);
    background: var(--el-bg-color-overlay);
  }
}

.light__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ra-font-base);
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }

  em {
    margin-top: 2px;
    font-size: var(--ra-font-xs);
    font-style: normal;
    line-height: 1.4;
    color: var(--el-text-color-regular);
  }
}

.light__label {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.light__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  background: var(--el-color-success);
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--el-color-success-light-8);

  .is-warn & {
    background: var(--el-color-warning);
    box-shadow: 0 0 0 3px var(--el-color-warning-light-7);
  }

  .is-down & {
    background: var(--el-color-danger);
    box-shadow: 0 0 0 3px var(--el-color-danger-light-7);
  }
}
</style>
