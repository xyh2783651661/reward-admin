<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useGeoProviderAlertRecord } from "../hook/useGeoProviderAlertRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "GeoProviderAlertRecord"
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
  onResolve,
  onBatchResolve,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useGeoProviderAlertRecord(tableRef);

onMounted(() => {
  if (props.initialProvider) form.provider = props.initialProvider;
  if (props.initialPool) form.poolName = props.initialPool;
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
    <!-- form and table unchanged -->
  </div>
</template>
