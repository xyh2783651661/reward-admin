<script setup lang="ts">
import { ref } from "vue";
import { useMenu } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import AddFill from "~icons/ri/add-circle-line";
import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({ name: "SysMenu" });

const {
  loading,
  exportLoading,
  columns,
  dataList,
  onSearch,
  exportExcel,
  openDialog,
  handleDelete
} = useMenu();
</script>

<template>
  <div class="main">
    <PureTableBar title="菜单管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'permission:menu:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增菜单
        </el-button>
        <el-button
          v-perms="'permission:menu:export'"
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
          row-key="id"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          default-expand-all
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList"
          :columns="dynamicColumns"
          :tree-props="{
            children: 'children',
            hasChildren: 'hasChildren',
            checkStrictly: false
          }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'permission:menu:edit'"
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
              :title="`是否确认删除「${row.menuName}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'permission:menu:delete'"
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
