<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useImageProviderCheckRecord } from "../hook/useImageProviderCheckRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import type { SearchField } from "@/components/ReSearchBar/types";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "ImageProviderCheckRecord"
});

const props = defineProps<{ initialProvider?: string }>();

const emit = defineEmits<{ (e: "consumed"): void }>();

const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  dropdownOptions,
  onSearch,
  exportLoading,
  onExport,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useImageProviderCheckRecord(tableRef, props.initialProvider);

const searchFields = computed<SearchField[]>(() => [
  {
    prop: "provider",
    label: "来源",
    type: "select",
    options: dropdownOptions.providers,
    filterable: true,
    width: "md"
  },
  {
    prop: "checkType",
    label: "检测类型",
    type: "select",
    options: dropdownOptions.checkTypeList,
    filterable: true,
    width: "md"
  },
  {
    prop: "status",
    label: "结果",
    type: "select",
    options: dropdownOptions.checkStatusList,
    filterable: true,
    width: "sm"
  },
  {
    prop: "reason",
    label: "故障原因",
    type: "select",
    options: dropdownOptions.failureReasonList,
    filterable: true,
    width: "md"
  },
  {
    prop: "createdTime",
    label: "时间",
    type: "datetimerange",
    valueFormat: "YYYY-MM-DD HH:mm:ss",
    shortcuts: true
  }
]);

onMounted(() => {
  onSearch();
  if (props.initialProvider) emit("consumed");
});
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="5"
      @search="onSearch"
      @reset="resetForm"
    />

    <PureTableBar title="调用流水" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="success"
          :icon="useRenderIcon('ep:download')"
          :loading="exportLoading"
          @click="onExport"
        >
          导出
        </el-button>
      </template>
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
