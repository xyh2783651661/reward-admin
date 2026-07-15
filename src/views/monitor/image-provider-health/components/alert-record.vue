<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useImageProviderAlertRecord } from "../hook/useImageProviderAlertRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "ImageProviderAlertRecord"
});

const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  dropdownOptions,
  onSearch,
  onExport,
  onResolve,
  onBatchResolve,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useImageProviderAlertRecord(tableRef);

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div>
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="来源" prop="provider">
        <el-select
          v-model="form.provider"
          placeholder="请选择来源"
          clearable
          filterable
          class="w-[180px]!"
        >
          <el-option
            v-for="item in dropdownOptions.providers"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="告警类型" prop="alertType">
        <el-select
          v-model="form.alertType"
          placeholder="请选择告警类型"
          clearable
          filterable
          class="w-[180px]!"
        >
          <el-option
            v-for="item in dropdownOptions.alertTypeList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="级别" prop="alertLevel">
        <el-select
          v-model="form.alertLevel"
          placeholder="请选择级别"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in dropdownOptions.alertLevelList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择状态"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in dropdownOptions.alertStatusList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="时间" prop="createdTime">
        <el-date-picker
          v-model="form.createdTime"
          :shortcuts="getPickerShortcuts()"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="~"
          start-placeholder="开始日期时间"
          end-placeholder="结束日期时间"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
        <el-button
          type="warning"
          :icon="useRenderIcon('ep:check')"
          @click="onBatchResolve"
        >
          批量解决
        </el-button>
        <el-button
          type="success"
          :icon="useRenderIcon('ep:download')"
          @click="onExport"
        >
          导出
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="告警记录" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="id"
          align-whole="center"
          table-layout="auto"
          adaptive
          showOverflowTooltip
          :adaptiveConfig="{ offsetBottom: 108 }"
          :loading="loading"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              v-if="row.status === 'OPEN'"
              class="reset-margin outline-hidden!"
              link
              type="success"
              :size="size"
              @click="onResolve(row)"
            >
              解决
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
