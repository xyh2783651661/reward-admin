<script setup lang="ts">
import { ref } from "vue";
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";

defineOptions({
  name: "ImageProviderHealth"
});

const activeTab = ref("status");

/**
 * 跨 Tab 联动：来源状态卡片上的「查看流水 / 查看告警」
 * 会切换到对应 Tab 并把 provider 作为初始筛选传入。
 * 子组件通过 initial-provider prop 在挂载时消费（v-if 保证每次切换均重新挂载）。
 */
const pendingProvider = ref("");

function gotoCheckRecord(provider: string) {
  pendingProvider.value = provider;
  activeTab.value = "checkRecord";
}

function gotoAlertRecord(provider: string) {
  pendingProvider.value = provider;
  activeTab.value = "alertRecord";
}

function handleTabChange() {
  // 手动切 Tab（非卡片联动）时清空遗留的筛选，避免误带入
  if (activeTab.value === "status") pendingProvider.value = "";
}
</script>

<template>
  <div class="main">
    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="provider-health-tabs"
      @tab-change="handleTabChange"
    >
      <el-tab-pane label="来源状态" name="status">
        <ProviderStatus
          v-if="activeTab === 'status'"
          @view-records="gotoCheckRecord"
          @view-alerts="gotoAlertRecord"
        />
      </el-tab-pane>
      <el-tab-pane label="调用流水" name="checkRecord">
        <CheckRecord
          v-if="activeTab === 'checkRecord'"
          :initial-provider="pendingProvider"
          @consumed="pendingProvider = ''"
        />
      </el-tab-pane>
      <el-tab-pane label="告警记录" name="alertRecord">
        <AlertRecord
          v-if="activeTab === 'alertRecord'"
          :initial-provider="pendingProvider"
          @consumed="pendingProvider = ''"
        />
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
