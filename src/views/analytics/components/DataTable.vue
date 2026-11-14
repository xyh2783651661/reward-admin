<script setup lang="ts">
withDefaults(
  defineProps<{
    data: any[] | undefined;
    emptyText?: string;
    /** 行可点击（下钻 / 详情）时显示手型光标 */
    clickable?: boolean;
  }>(),
  { emptyText: "当前周期暂无数据", clickable: false }
);
</script>

<template>
  <el-table
    v-bind="$attrs"
    :data="data ?? []"
    size="small"
    :empty-text="emptyText"
    class="analytics-table"
    :class="{ 'is-clickable': clickable }"
    :header-cell-class-name="() => 'analytics-table__head'"
  >
    <slot />
  </el-table>
</template>

<style lang="scss">
.analytics-table {
  --el-table-header-bg-color: var(--el-fill-color-lighter);

  font-variant-numeric: tabular-nums;

  .analytics-table__head {
    font-size: var(--ra-font-xs);
    font-weight: 500;
    color: var(--el-text-color-secondary);
  }

  &.is-clickable .el-table__row {
    cursor: pointer;
  }
}
</style>
