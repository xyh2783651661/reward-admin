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

const props = defineProps({
  initialProvider: { type: String, default: "" }
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
} = useImageProviderAlertRecord(tableRef);

onMounted(() => {
  if (props.initialProvider) {
    form.provider = props.initialProvider;
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
