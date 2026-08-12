<script setup lang="ts">
import { onMounted } from "vue";
import {
  useGeoProviderStatus,
  formatTime,
  formatRelative,
  getStatusLabel,
  getReasonLabel,
  type ProviderCardItem
} from "../hook/useGeoProviderStatus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "GeoProviderStatus"
});

const emit = defineEmits<{
  (e: "view-records", payload: { provider: string; poolName?: string }): void;
  (e: "view-alerts", payload: { provider: string; poolName?: string }): void;
}>();

const {
  loading,
  filteredList,
  statsOverview,
  statusFilter,
  selectedProviders,
  selectedCount,
  batchWorking,
  toggleStatusFilter,
  toggleSelect,
  clearSelection,
  selectAllVisible,
  onSearch,
  onProbe,
  onToggleEnable,
  runBatch,
  onReset,
  getPoolLabel
} = useGeoProviderStatus();

function statusClass(item: ProviderCardItem) {
  return `is-${(item.status || "unknown").toLowerCase()}`;
}

function isSelected(provider: string, poolName?: string) {
  return selectedProviders.value.some(p => p.provider === provider && p.poolName === poolName);
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="provider-board">
    <!-- ... -->
        <el-button size="small" link type="primary" @click="$emit('view-records', { provider: item.provider, poolName: item.poolName })">流水</el-button>
        <el-button size="small" link type="danger" @click="$emit('view-alerts', { provider: item.provider, poolName: item.poolName })">告警</el-button>
    <!-- ... -->
  </div>
</template>
