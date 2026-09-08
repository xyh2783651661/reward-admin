<script setup lang="ts">
import { useRewardUser } from "./utils/hook";
import { ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Upload from "~icons/ri/upload-line";
import Role from "~icons/ri/admin-line";
import Password from "~icons/ri/lock-password-line";
import More from "~icons/ep/more-filled";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({
  name: "User"
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
  buttonClass,
  handleUpload,
  handleReset,
  handleRole,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useRewardUser();

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
      :visible-count="4"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar
      title="奖励用户"
      class="w-full"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button
          v-perms="'config:user:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增用户
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
              v-perms="'config:user:edit'"
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
              :title="`是否确认删除「${row.nickName}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:user:delete'"
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
            <el-dropdown>
              <el-button
                class="ml-3! mt-[2px]!"
                link
                type="primary"
                :size="size"
                :icon="useRenderIcon(More)"
                aria-label="更多操作"
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>
                    <el-button
                      :class="buttonClass"
                      link
                      type="primary"
                      :size="size"
                      :icon="useRenderIcon(Upload)"
                      @click="handleUpload(row)"
                    >
                      上传头像
                    </el-button>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <el-button
                      :class="buttonClass"
                      link
                      type="primary"
                      :size="size"
                      :icon="useRenderIcon(Password)"
                      @click="handleReset(row)"
                    >
                      重置密码
                    </el-button>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <el-button
                      :class="buttonClass"
                      link
                      type="primary"
                      :size="size"
                      :icon="useRenderIcon(Role)"
                      @click="handleRole(row)"
                    >
                      分配角色
                    </el-button>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
