<script setup lang="ts">
import { ref } from "vue";
import { useSysNotice } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({
  name: "SystemNotice"
});

const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  searchFields,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  handlePublish,
  handleWithdraw,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useSysNotice(tableRef);

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main notice-page">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="公告列表" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'notice:sysNotice:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增公告
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
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <el-empty description="暂无公告，点击右上角新增第一条公告" />
          </template>
          <template #operation="{ row }">
            <el-button
              v-perms="'notice:sysNotice:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="Number(row.status) === 0 || Number(row.status) === 2"
              v-perms="'notice:sysNotice:publish'"
              class="reset-margin"
              link
              type="success"
              :size="size"
              @click="handlePublish(row)"
            >
              发布
            </el-button>
            <el-button
              v-if="Number(row.status) === 1"
              v-perms="'notice:sysNotice:withdraw'"
              class="reset-margin"
              link
              type="warning"
              :size="size"
              @click="handleWithdraw(row)"
            >
              撤回
            </el-button>
            <el-popconfirm
              :title="`是否确认删除「${row.title || row.id}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'notice:sysNotice:delete'"
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.notice-title-cell) {
  min-width: 0;
  text-align: left;
}

:deep(.notice-title-line) {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

:deep(.notice-title-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

:deep(.notice-content-preview) {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  font-size: var(--ra-font-xs);
  line-height: 20px;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
}

:deep(.notice-priority-cell),
:deep(.notice-status-cell),
:deep(.notice-time-cell) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

:deep(.notice-platform-cell) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

:deep(.notice-time-cell em) {
  font-style: normal;
  color: var(--el-text-color-placeholder);
}

:deep(.notice-empty-text) {
  color: var(--el-text-color-placeholder);
}
</style>
