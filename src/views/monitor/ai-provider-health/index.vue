<script setup lang="ts">
import ProviderHealthShell from "../provider-health-shared/ProviderHealthShell.vue";
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";

defineOptions({ name: "AiProviderHealth" });
</script>

<template>
  <ProviderHealthShell
    title="AI Provider 健康监控"
    description="集中查看模型服务的可用性、检测流水和告警状态。"
    :status-component="ProviderStatus"
    :check-component="CheckRecord"
    :alert-component="AlertRecord"
  />
</template>
