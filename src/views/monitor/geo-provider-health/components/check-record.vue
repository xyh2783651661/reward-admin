<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useGeoProviderCheckRecord } from "../hook/useGeoProviderCheckRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import type { SearchField } from "@/components/ReSearchBar/types";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "GeoProviderCheckRecord"
});

const props = defineProps<{
  initialProvider?: string;
  initialPoolName?: string;
}>();

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
} = useGeoProviderCheckRecord(
  tableRef,
  props.initialProvider,
  props.initialPoolName
);

const searchFields = computed<SearchField[]>(() => [
  {
    prop: "poolName",
    label: "池子",
    type: "select",
    options: dropdownOptions.pools,
    width: "md"
  },
  {
    prop: "provider",
    label: "来源",
    type: "input",
    width: "sm"
  },
  {
    prop: "checkType",
    label: "检测类型",
    type: "select",
    options: dropdownOptions.checkTypeList,
    width: "sm"
  },
  {
    prop: "status",
    label: "结果",
    type: "select",
    options: dropdownOptions.checkStatusList,
    width: "sm"
  },
  {
    prop: "reason",
    label: "故障原因",
    type: "select",
    options: dropdownOptions.failureReasonList,
    width: "sm"
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
  if (props.initialProvider || props.initialPoolName) emit("consumed");
});
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="6"
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
