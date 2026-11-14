<script setup lang="ts">
export interface RangeOption {
  label: string;
  value: number;
}

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** 当前统计周期（天）；不传则不展示周期选择器 */
    range?: number;
    rangeOptions?: RangeOption[];
    loading?: boolean;
  }>(),
  {
    description: "",
    range: undefined,
    rangeOptions: () => [
      { label: "近 7 天", value: 7 },
      { label: "近 30 天", value: 30 },
      { label: "近 90 天", value: 90 }
    ],
    loading: false
  }
);

const emit = defineEmits<{
  "update:range": [value: number];
  refresh: [];
}>();
</script>

<template>
  <header class="analytics-header">
    <div class="analytics-header__title">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="analytics-header__actions">
      <slot name="actions" />
      <el-radio-group
        v-if="range !== undefined"
        :model-value="range"
        aria-label="统计周期"
        @update:model-value="emit('update:range', Number($event))"
      >
        <el-radio-button
          v-for="opt in rangeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
      <el-tooltip content="重新加载数据" placement="bottom">
        <el-button
          :loading="loading"
          aria-label="刷新数据"
          @click="emit('refresh')"
        >
          <IconifyIconOnline icon="ri:refresh-line" />
        </el-button>
      </el-tooltip>
    </div>
  </header>
</template>

<style scoped lang="scss">
.analytics-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ra-space-md);
  align-items: flex-end;
  justify-content: space-between;
}

.analytics-header__title h1 {
  margin: 0;
  font-size: var(--ra-font-xl);
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.analytics-header__title p {
  margin: 2px 0 0;
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.analytics-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ra-space-xs);
  align-items: center;
}
</style>
