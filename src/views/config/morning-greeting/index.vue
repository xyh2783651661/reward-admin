<script setup lang="ts">
import { useMorningGreeting as useRole } from "./utils/hook";
import { ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { deviceDetection } from "@pureadmin/utils";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({
  name: "MorningGreetingConfig"
});

const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  userOptions,
  enabledOptions,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useRole();
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      v-search-enter="onSearch"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px]"
    >
      <el-form-item label="目标用户：" prop="targetUserId">
        <el-select
          v-model="form.targetUserId"
          filterable
          clearable
          placeholder="请选择目标用户"
          class="w-[180px]!"
        >
          <el-option
            v-for="u in userOptions"
            :key="u.id"
            :label="u.nickName"
            :value="u.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态：" prop="enabled">
        <el-select
          v-model="form.enabled"
          clearable
          placeholder="请选择状态"
          class="w-[180px]!"
        >
          <el-option
            v-for="o in enabledOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar class="w-full" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:morningGreeting:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增配置
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
              v-perms="'config:morningGreeting:edit'"
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
              :title="`是否确认删除ID为「${row.id}」的配置？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:morningGreeting:delete'"
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

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
