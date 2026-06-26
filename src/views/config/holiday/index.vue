<script setup lang="ts">
import { ref } from "vue";
import { useHolidayConfig } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Refresh from "~icons/ep/refresh";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";
import User from "~icons/ep/user";

defineOptions({
  name: "HolidayConfig"
});

const formRef = ref();
const {
  form,
  formOptions,
  loading,
  optionsLoading,
  columns,
  dataList,
  pagination,
  onSearch,
  resetForm,
  openDialog,
  openRecipientDialog,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useHolidayConfig();
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="节假日名称：" prop="holidayName">
        <el-input
          v-model="form.holidayName"
          placeholder="请输入节假日名称"
          clearable
          class="w-[200px]!"
        />
      </el-form-item>
      <el-form-item label="节假日类型：" prop="holidayType">
        <el-select
          v-model="form.holidayType"
          clearable
          :loading="optionsLoading"
          placeholder="请选择类型"
          class="w-[160px]!"
        >
          <el-option
            v-for="item in formOptions.holidayTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态：" prop="status">
        <el-select
          v-model="form.status"
          clearable
          :loading="optionsLoading"
          placeholder="请选择状态"
          class="w-[140px]!"
        >
          <el-option
            v-for="item in formOptions.statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
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

    <PureTableBar title="节假日配置管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:holiday:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增配置
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
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'config:holiday:edit'"
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
              :title="`是否确认删除节假日 ${row.holidayName} 的这条配置`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:holiday:delete'"
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
              v-perms="'config:holiday:recipients'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(User)"
              @click="openRecipientDialog(row)"
            >
              收件人
            </el-button>
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
