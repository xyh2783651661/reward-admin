<script setup lang="ts">
import { useAiPrompt } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "~icons/ri/add-circle-line";
import EditPen from "~icons/ep/edit-pen";
import View from "~icons/ep/view";
import Delete from "~icons/ep/delete";
import Download from "~icons/ep/download";
import RefreshRight from "~icons/ep/refresh-right";

defineOptions({
  name: "AiPrompt"
});

const {
  form,
  loading,
  dataList,
  columns,
  pagination,
  searchFields,
  selectedRows,
  onSearch,
  resetForm,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  onSelectionChange,
  goCreate,
  goEdit,
  goDetail,
  handleSearch,
  handleExport,
  handleRefreshAll
} = useAiPrompt();
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="4"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="AI 提示词管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:aiPrompt:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="goCreate"
        >
          新建提示词
        </el-button>
        <el-button
          v-perms="'config:aiPrompt:export'"
          type="success"
          plain
          :icon="useRenderIcon(Download)"
          @click="handleExport"
        >
          {{
            selectedRows.length > 0
              ? `导出选中 (${selectedRows.length})`
              : "导出全部"
          }}
        </el-button>
        <el-button
          v-perms="'config:aiPrompt:refresh'"
          :icon="useRenderIcon(RefreshRight)"
          @click="handleRefreshAll"
        >
          刷新缓存
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
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
          @selection-change="onSelectionChange"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'config:aiPrompt:query'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(View)"
              @click="goDetail(row)"
            >
              查看
            </el-button>
            <el-button
              v-perms="'config:aiPrompt:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="goEdit(row)"
            >
              编辑
            </el-button>
            <el-popconfirm
              :title="`是否确认删除「${row.name || row.code}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:aiPrompt:delete'"
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
