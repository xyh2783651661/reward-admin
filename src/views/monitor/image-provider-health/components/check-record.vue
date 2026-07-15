<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useImageProviderCheckRecord } from "../hook/useImageProviderCheckRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "ImageProviderCheckRecord"
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
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useImageProviderCheckRecord(tableRef);

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
      <el-form-item label="检测类型" prop="checkType">
        <el-select
          v-model="form.checkType"
          placeholder="请选择检测类型"
          clearable
          filterable
          class="w-[180px]!"
        >
          <el-option
            v-for="item in dropdownOptions.checkTypeList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="结果" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择结果"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in dropdownOptions.checkStatusList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="故障原因" prop="reason">
        <el-select
          v-model="form.reason"
          placeholder="请选择原因"
          clearable
          filterable
          class="w-[180px]!"
        >
          <el-option
            v-for="item in dropdownOptions.failureReasonList"
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
          type="success"
          :icon="useRenderIcon('ep:download')"
          @click="onExport"
        >
          导出
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="调用流水" :columns="columns" @refresh="onSearch">
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
        />
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
