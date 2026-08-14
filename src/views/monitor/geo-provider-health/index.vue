<script setup lang="ts">
import ProviderStatus from "./components/provider-status.vue";
import CheckRecord from "./components/check-record.vue";
import AlertRecord from "./components/alert-record.vue";
import { useProviderHealthNavigation } from "../composables/useProviderHealthNavigation";

defineOptions({ name: "GeoProviderHealth" });

const {
  activeTab,
  activeProvider,
  pendingProvider,
  gotoCheckRecord,
  gotoAlertRecord,
  consumeProvider,
  clearProviderContext,
  showStatus,
  handleTabChange
} = useProviderHealthNavigation();
</script>

<template>
  <div class="main provider-health-page">
    <header class="provider-health-hero">
      <div>
        <p class="provider-health-hero__eyebrow">Provider Monitoring</p>
        <h1>地理 Provider 健康监控</h1>
        <p>按服务池追踪地理位置来源的健康状态和路由质量。</p>
      </div>
      <el-button v-if="activeTab !== 'status'" plain @click="showStatus">
        返回 Provider 状态
      </el-button>
    </header>

    <el-alert
      v-if="activeProvider && activeTab !== 'status'"
      type="info"
      show-icon
      :closable="false"
      :title="`当前 Provider：${activeProvider}`"
      description="当前列表已自动按该 Provider 筛选，可清除筛选查看全部记录。"
      class="provider-context"
    />

    <div
      v-if="activeProvider && activeTab !== 'status'"
      class="provider-context-actions"
    >
      <el-tag type="primary" effect="plain">{{ activeProvider }}</el-tag>
      <el-button link type="primary" @click="clearProviderContext">
        清除 Provider 筛选
      </el-button>
    </div>

    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="provider-health-tabs"
      @tab-change="handleTabChange"
    >
      <el-tab-pane label="Provider 状态" name="status">
        <ProviderStatus
          v-if="activeTab === 'status'"
          @view-records="gotoCheckRecord"
          @view-alerts="gotoAlertRecord"
        />
      </el-tab-pane>
      <el-tab-pane label="检测流水" name="checkRecord">
        <CheckRecord
          v-if="activeTab === 'checkRecord'"
          :key="`checkRecord-${activeProvider}`"
          :initial-provider="pendingProvider"
          @consumed="consumeProvider"
        />
      </el-tab-pane>
      <el-tab-pane label="告警记录" name="alertRecord">
        <AlertRecord
          v-if="activeTab === 'alertRecord'"
          :key="`alertRecord-${activeProvider}`"
          :initial-provider="pendingProvider"
          @consumed="consumeProvider"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.provider-health-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-health-hero {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(
    135deg,
    var(--el-bg-color),
    var(--el-fill-color-light)
  );
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;

  h1 {
    margin: 3px 0 6px;
    font-size: 22px;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}

.provider-health-hero__eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-primary) !important;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.provider-context {
  border-radius: 10px;
}

.provider-context-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 4px;
}

.provider-health-tabs {
  :deep(.el-tabs__content) {
    padding: 15px;
  }
}

@media (width <= 768px) {
  .provider-health-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
