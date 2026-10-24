<script setup lang="ts">
import { ref } from "vue";
import { useOperationLog as useRole } from "./hook";
import { getTaskLogDetailActionText } from "./status";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import LogStats from "./components/LogStats.vue";

import AntDesignExceptionOutlined from "~icons/ant-design/exception-outlined";
import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({
  name: "OperationLog"
});

const tableRef = ref();

const {
  form,
  loading,
  stats,
  statsLoading,
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
    <LogStats :stats="stats" :loading="statsLoading" />

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
          align-whole="left"
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

:deep(.log-empty) {
  color: var(--el-text-color-placeholder);
}

/* 任务 */
:deep(.log-task) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: 1.4;
}

:deep(.log-task__name) {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

:deep(.log-task__sub) {
  display: flex;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.log-task__id) {
  flex: none;
  font-variant-numeric: tabular-nums;
}

:deep(.log-task__code) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  white-space: nowrap;
}

/* 状态 */
:deep(.log-status-cell) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

:deep(.log-status-cell__trigger) {
  padding-left: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.log-status) {
  --tone: var(--el-color-info);

  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  color: var(--tone);
  white-space: nowrap;
  background: color-mix(in srgb, var(--tone) 12%, transparent);
  border-radius: 999px;

  i {
    width: 6px;
    height: 6px;
    background: var(--tone);
    border-radius: 50%;
  }

  &.is-success {
    --tone: var(--el-color-success);
  }

  &.is-warning {
    --tone: var(--el-color-warning);
  }

  &.is-danger {
    --tone: var(--el-color-danger);
  }

  &.is-primary {
    --tone: var(--el-color-primary);
  }
}

/* 迷你进度条（业务结果 / 耗时共用） */
:deep(.log-bar) {
  height: 4px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  .is-success,
  .is-fast {
    background: var(--el-color-success);
  }

  .is-warning,
  .is-slow {
    background: var(--el-color-warning);
  }

  .is-normal {
    background: var(--el-color-primary);
  }
}

/* 业务结果 */
:deep(.log-counts) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 96px;
  font-size: 12px;
  line-height: 1.3;
}

:deep(.log-counts__line) {
  display: flex;
  gap: 4px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;

  b {
    font-size: 14px;
    color: var(--el-color-success);
  }

  span {
    color: var(--el-text-color-secondary);
  }

  em {
    margin-left: auto;
    font-style: normal;
    color: var(--el-text-color-secondary);
  }
}

:deep(.log-counts__sub) {
  display: flex;
  gap: 8px;
  color: var(--el-text-color-secondary);

  em {
    font-style: normal;
  }
}

:deep(.is-danger) {
  color: var(--el-color-danger);
}

/* 步骤 */
:deep(.log-steps) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;

  em {
    margin-left: 6px;
    font-style: normal;
  }
}

:deep(.log-steps__slowest) {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

/* 耗时 */
:deep(.log-cost) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
}

:deep(.log-cost__text) {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;

  &.is-fast {
    color: var(--el-color-success);
  }

  &.is-normal {
    color: var(--el-text-color-primary);
  }

  &.is-slow {
    color: var(--el-color-warning);
  }
}

/* 执行时间 */
:deep(.log-time) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

:deep(.log-time__end) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 执行节点 */
:deep(.log-node) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.log-node__host) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.log-node__sub) {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
</style>
