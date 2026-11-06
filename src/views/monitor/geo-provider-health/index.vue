<script setup lang="ts">
import ProviderHealthShell from "../provider-health-shared/ProviderHealthShell.vue";
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";

defineOptions({ name: "GeoProviderHealth" });
</script>

<template>
  <ProviderHealthShell
    title="地理 Provider 健康监控"
    description="按服务池追踪地理位置来源的健康状态和路由质量。"
    :status-component="ProviderStatus"
    :check-component="CheckRecord"
    :alert-component="AlertRecord"
    pool-aware
  />
</template>
