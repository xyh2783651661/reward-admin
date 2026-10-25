<script setup lang="ts">
import { usePublishPlatform } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import EditPen from "~icons/ep/edit-pen";
import Delete from "~icons/ep/delete";
import DocumentCopy from "~icons/ep/document-copy";

defineOptions({
  name: "PublishPlatform"
});

const {
  loading,
  filteredList,
  form,
  searchFields,
  columns,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  copyPromptCode
} = usePublishPlatform();
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="onSearch"
      @reset="resetForm"
    />

    <PureTableBar title="发布平台管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'publishPlatform:index:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增平台
        </el-button>
      </template>

      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          row-key="id"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="filteredList"
          :columns="dynamicColumns"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'publishPlatform:index:edit'"
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(DocumentCopy)"
              @click="copyPromptCode(row)"
            >
              提示词编码
            </el-button>
            <el-popconfirm
              width="300"
              :title="`确认删除平台「${row.name}」？历史内容包中的该平台文案会保留，但后续生成任务将不再包含它。`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'publishPlatform:index:delete'"
                  class="reset-margin outline-hidden!"
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

          <template #empty>
            <el-empty :image-size="80" description="暂无发布平台">
              <el-button
                v-perms="'publishPlatform:index:add'"
                type="primary"
                :icon="useRenderIcon(AddFill)"
                @click="openDialog()"
              >
                新增平台
              </el-button>
            </el-empty>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>
