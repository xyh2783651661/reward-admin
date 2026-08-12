<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useGeoProviderCheckRecord } from "../hook/useGeoProviderCheckRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "GeoProviderCheckRecord"
});

const props = defineProps({
  initialProvider: { type: String, default: "" },
  initialPool: { type: String, default: "" }
});
const emit = defineEmits<[() => void]>();

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
} = useGeoProviderCheckRecord(tableRef);

onMounted(() => {
  // consume initial filters passed from card board
  if (props.initialProvider) {
    form.provider = props.initialProvider;
  }
  if (props.initialPool) {
    form.poolName = props.initialPool;
  }
  if (props.initialProvider || props.initialPool) {
    onSearch();
    emit('consumed');
  } else {
    onSearch();
  }
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
      <el-form-item label="池子" prop="poolName">
        <el-select
          v-model="form.poolName"
          placeholder="全部池子"
          clearable
          class="w-[180px]!"
        >
          <el-option
            v-for="item in dropdownOptions.pools"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <!-- rest unchanged -->
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
