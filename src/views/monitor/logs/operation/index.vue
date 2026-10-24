<script setup lang="ts">
import { ref } from "vue";
import { useOperationLog as useRole } from "./hook";
import { getTaskLogDetailActionText } from "./status";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AntDesignExceptionOutlined from "~icons/ant-design/exception-outlined";
import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({
  name: "OperationLog"
});

const tableRef = ref();

const {
  form,
  loading,
  statsLoading,
  statCards,
  columns,
  dataList,
  pagination,
  searchFields,
  onSearch,
  refreshAll,
  resetForm,
  exportExcel,
  exportLoading,
  handleSizeChange,
  handleCurrentChange,
  onDetail
} = useRole(tableRef);

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main">
    <el-card v-loading="statsLoading" shadow="never" class="mb-4! min-h-[96px]">
      <div class="flex flex-wrap items-center gap-x-10 gap-y-3">
        <div v-for="item in statCards" :key="item.key" class="min-w-[84px]">
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            {{ item.label }}
          </div>
          <div
            class="text-2xl leading-8 font-medium"
            :style="{ color: item.color }"
          >
            {{ item.value }}
          </div>
          <div
            v-if="item.hint"
            class="text-xs text-[var(--el-text-color-secondary)]"
          >
            {{ item.hint }}
          </div>
        </div>
        <el-text v-if="!statsLoading && !statCards.length" type="info">
          暂无统计数据
        </el-text>
        <el-text type="info" size="small" class="ml-auto">
          近 7 天 · 全部任务
        </el-text>
      </div>
    </el-card>

    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="4"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="任务执行日志" :columns="columns" @refresh="refreshAll">
      <template #buttons>
        <el-button
          v-perms="'monitor:operationLog:export'"
          type="primary"
          :loading="exportLoading"
          :icon="useRenderIcon(HugeiconsDownload01)"
          @click="exportExcel"
        >
          导出
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="id"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(AntDesignExceptionOutlined)"
              @click="onDetail(row)"
            >
              {{ getTaskLogDetailActionText(row.status, row.success) }}
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}
</style>
