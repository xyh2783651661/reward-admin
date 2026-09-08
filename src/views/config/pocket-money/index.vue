<script setup lang="ts">
import { usePocketMoneyRule } from "./utils/hook";
import { ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";
import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({
  name: "PocketMoney"
});

const tableRef = ref();

const {
  form,
  loading,
  exportLoading,
  searchFields,
  columns,
  dataList,
  pagination,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  exportExcel,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = usePocketMoneyRule();

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar
      title="零花钱规则"
      class="w-full"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button
          v-perms="'config:pocketMoney:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增规则
        </el-button>
        <el-button
          v-perms="'config:pocketMoney:export'"
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
          <template #operation="{ row }">
            <el-button
              v-perms="'config:pocketMoney:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              修改
            </el-button>
            <el-popconfirm
              :title="`是否确认删除「${row.ruleKey}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:pocketMoney:delete'"
                  class="reset-margin"
                  link
                  type="primary"
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
