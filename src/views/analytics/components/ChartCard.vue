<script setup lang="ts">
import PanelCard from "@/components/PanelCard/index.vue";
import AnalyticsChart from "./AnalyticsChart.vue";

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** 统计周期标注，例如「近 30 天」，让每张图的口径一目了然 */
    scope?: string;
    /** 传入则渲染图表；不传则渲染默认插槽（表格等） */
    option?: Record<string, any>;
    height?: number;
    /** 图表的文字摘要，供屏幕阅读器使用 */
    chartLabel?: string;
    clickable?: boolean;
    loading?: boolean;
    error?: string;
    empty?: boolean;
    emptyText?: string;
    minHeight?: number;
  }>(),
  {
    description: "",
    scope: "",
    option: undefined,
    height: 280,
    chartLabel: "",
    clickable: false,
    loading: false,
    error: "",
    empty: false,
    emptyText: "当前周期暂无数据",
    minHeight: undefined
  }
);

const emit = defineEmits<{
  retry: [];
  "chart-click": [params: any];
}>();
</script>

<template>
  <PanelCard
    :title="title"
    :description="description"
    :loading="loading"
    :error="error"
    :empty="empty"
    :empty-text="emptyText"
    :min-height="minHeight ?? (option ? height : 120)"
    @retry="emit('retry')"
  >
    <template #extra>
      <span v-if="scope" class="chart-card__scope">{{ scope }}</span>
      <slot name="extra" />
    </template>
    <AnalyticsChart
      v-if="option"
      :option="option"
      :height="height"
      :label="chartLabel || title"
      :clickable="clickable"
      @chart-click="emit('chart-click', $event)"
    />
    <slot v-else />
    <div v-if="$slots.footer" class="chart-card__footer">
      <slot name="footer" />
    </div>
  </PanelCard>
</template>

<style scoped lang="scss">
.chart-card__scope {
  padding: 2px 8px;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  background: var(--el-fill-color-light);
  border-radius: var(--ra-radius-pill);
}

.chart-card__footer {
  margin-top: var(--ra-space-sm);
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}
</style>
