<script setup lang="ts">
import { useMailRecipient } from "./utils/hook";
import { ref, nextTick, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useIconClass } from "@/hooks/usePublicHooks";
import {
  delay,
  subBefore,
  deviceDetection,
  useResizeObserver
} from "@pureadmin/utils";

import { transformI18n } from "@/plugins/i18n";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import FluentPersonMail20Regular from "~icons/fluent/person-mail-20-regular";
import AddFill from "~icons/ri/add-circle-line";
import Close from "~icons/ep/close";
import Check from "~icons/ep/check";

defineOptions({
  name: "Mail"
});

const iconClass = useIconClass();

const treeRef = ref();
const tableRef = ref();
const contentRef = ref();
const treeHeight = ref();

const {
  form,
  isShow,
  curRow,
  loading,
  columns,
  rowStyle,
  dataList,
  treeData,
  treeProps,
  isLinkage,
  pagination,
  isExpandAll,
  isSelectAll,
  treeSearchValue,
  searchFields,
  saveLoading,
  onSearch,
  resetForm,
  openDialog,
  handleMenu,
  handleSave,
  handleDelete,
  filterMethod,
  onQueryChanged,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useMailRecipient(treeRef);

function handleSearch() {
  form.current = 1;
  onSearch();
}

onMounted(() => {
  useResizeObserver(contentRef, async () => {
    await nextTick();
    delay(60).then(() => {
      treeHeight.value = parseFloat(
        subBefore(tableRef.value.getTableDoms().tableWrapper.style.height, "px")
      );
    });
  });
});
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

    <div
      ref="contentRef"
      :class="['flex', deviceDetection() ? 'flex-wrap' : '']"
    >
      <PureTableBar
        title="邮件收件人"
        :class="[isShow && !deviceDetection() ? 'w-[60vw]!' : 'w-full']"
        style="transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1)"
        :columns="columns"
        @refresh="onSearch"
      >
        <template #buttons>
          <el-button
            v-perms="'config:mail:add'"
            type="primary"
            :icon="useRenderIcon(AddFill)"
            @click="openDialog()"
          >
            新增邮件配置
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
            :row-style="rowStyle"
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
                v-perms="'config:mail:edit'"
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
                :title="`是否确认删除「${row.name}」？`"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button
                    v-perms="'config:mail:delete'"
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
              <el-button
                class="reset-margin"
                link
                type="primary"
                :size="size"
                :icon="useRenderIcon(FluentPersonMail20Regular)"
                @click="handleMenu(row)"
              >
                人员
              </el-button>
            </template>
          </pure-table>
        </template>
      </PureTableBar>

      <div
        v-if="isShow"
        class="min-w-[calc(100vw-60vw-268px)]! w-full mt-2 px-2 pb-2 bg-bg_color ml-2 overflow-auto"
      >
        <div class="flex justify-between w-full px-3 pt-5 pb-4">
          <div class="flex">
            <span :class="iconClass">
              <IconifyIconOffline
                v-tippy="{
                  content: '关闭'
                }"
                class="dark:text-white"
                width="18px"
                height="18px"
                :icon="Close"
                @click="handleMenu"
              />
            </span>
            <span :class="[iconClass, 'ml-2']">
              <IconifyIconOffline
                v-tippy="{
                  content: '保存邮件人员配置'
                }"
                class="dark:text-white"
                width="18px"
                height="18px"
                :icon="Check"
                @click="handleSave"
              />
            </span>
          </div>
          <p class="font-bold truncate">
            邮件人员
            {{ `${curRow?.name ? `（${curRow.name}）` : ""}` }}
          </p>
        </div>
        <el-input
          v-model="treeSearchValue"
          placeholder="请输入人员进行搜索"
          class="mb-1"
          clearable
          @input="onQueryChanged"
        />
        <div class="flex flex-wrap">
          <el-checkbox v-model="isSelectAll" label="全选/全不选" />
        </div>
        <el-tree-v2
          ref="treeRef"
          show-checkbox
          :data="treeData"
          :props="treeProps"
          :height="treeHeight"
          :check-strictly="!isLinkage"
          :filter-method="filterMethod"
        >
          <template #default="{ node }">
            <span>{{ transformI18n(node.label) }}</span>
          </template>
        </el-tree-v2>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}
</style>
