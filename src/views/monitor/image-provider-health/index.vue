<script setup lang="ts">
import ProviderHealthShell from "../provider-health-shared/ProviderHealthShell.vue";
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";

defineOptions({ name: "ImageProviderHealth" });
</script>

<template>
  <ProviderHealthShell
    title="图片 Provider 健康监控"
    description="关注图片来源的可用性、调用质量和异常告警。"
    :status-component="ProviderStatus"
    :check-component="CheckRecord"
    :alert-component="AlertRecord"
  />
</template>
