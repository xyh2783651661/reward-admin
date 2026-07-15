<script setup lang="ts">
import { ref } from "vue";
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";

defineOptions({
  name: "GeoProviderHealth"
});

const activeTab = ref("status");
</script>

<template>
  <div class="main">
    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="provider-health-tabs"
    >
      <el-tab-pane label="来源状态" name="status">
        <ProviderStatus v-if="activeTab === 'status'" />
      </el-tab-pane>
      <el-tab-pane label="调用流水" name="checkRecord">
        <CheckRecord v-if="activeTab === 'checkRecord'" />
      </el-tab-pane>
      <el-tab-pane label="告警记录" name="alertRecord">
        <AlertRecord v-if="activeTab === 'alertRecord'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.provider-health-tabs {
  :deep(.el-tabs__content) {
    padding: 15px;
  }
}
</style>
