<script setup lang="ts">
withDefaults(
  defineProps<{
    loading: boolean;
    error: string;
    /** 已有数据时只在局部显示加载，不整页替换 */
    hasData: boolean;
    emptyText?: string;
  }>(),
  { emptyText: "当前周期暂无数据" }
);

defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="!hasData" class="analytics-state">
    <el-skeleton v-if="loading" :rows="6" animated />
    <el-result
      v-else-if="error"
      icon="error"
      title="数据加载失败"
      :sub-title="error"
    >
      <template #extra>
        <el-button type="primary" @click="$emit('retry')">重新加载</el-button>
      </template>
    </el-result>
    <el-empty v-else :description="emptyText" />
  </div>
</template>

<style scoped>
.analytics-state {
  padding: var(--ra-space-lg);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}
</style>
