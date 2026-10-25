<script setup lang="ts">
import { usePublishPlatform } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import EditPen from "~icons/ep/edit-pen";
import Delete from "~icons/ep/delete";
import DocumentCopy from "~icons/ep/document-copy";

defineOptions({
  name: "PublishPlatform"
});

const {
  loading,
  filteredList,
  statItems,
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
    <!-- ==================== 概览 ==================== -->
    <el-card v-loading="loading" shadow="never" class="mb-4! min-h-[92px]">
      <div class="flex flex-wrap items-center gap-x-10 gap-y-3">
        <div v-for="item in statItems" :key="item.key" class="min-w-[84px]">
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            {{ item.label }}
          </div>
          <div
            class="text-2xl leading-8 font-medium"
            :style="{ color: item.color }"
          >
            {{ item.value }}
          </div>
        </div>
        <el-text type="info" size="small" class="ml-auto">
          平台配置驱动文案生成，新增平台后需同步提示词
        </el-text>
      </div>
    </el-card>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-4!"
      title="平台是配置驱动的，不是硬编码枚举"
    >
      <template #default>
        新增平台后，请到「AI 提示词」确认存在
        <code class="inline-code">content.publish.copy.{平台代码}</code>
        模板，否则该平台文案生成会失败；删除为逻辑删除，不会删除历史文案，也不会释放平台代码，暂时不用建议优先停用。
      </template>
    </el-alert>

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
        <el-button :icon="useRenderIcon(Refresh)" @click="onSearch">
          刷新
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

<style scoped lang="scss">
.inline-code {
  padding: 1px 4px;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
}
</style>
