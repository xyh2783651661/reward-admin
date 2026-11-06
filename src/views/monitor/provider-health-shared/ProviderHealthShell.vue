<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import { useProviderHealthNavigation } from "../composables/useProviderHealthNavigation";

defineOptions({ name: "ProviderHealthShell" });

/**
 * 三类 Provider 健康页（AI / 图片 / 地理）的公共外壳。
 *
 * 三者除文案与「是否按服务池区分上下文」外完全一致，此前各存一份 index.vue
 * 与一份 Hero 头 CSS。这里收拢为单一实现，各页只保留一个薄壳入口，
 * 菜单 component 路径无需变更。
 *
 * 顶部标题沿用 cache-monitor 的标准做法：纯 header + h1，不加背景/边框/圆角，
 * 避免出现与系统其它页面不一致的装饰性卡片。
 */
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    statusComponent: Component;
    checkComponent: Component;
    alertComponent: Component;
    /** 地理来源健康按「服务池 + 供应商」两级上下文定位记录 */
    poolAware?: boolean;
  }>(),
  { description: "", poolAware: false }
);

const {
  activeTab,
  activeProvider,
  activePoolName,
  pendingProvider,
  pendingPoolName,
  gotoCheckRecord,
  gotoAlertRecord,
  consumeContext,
  clearProviderContext,
  showStatus,
  handleTabClick
} = useProviderHealthNavigation();

/** 仅 poolAware 页面向明细组件透传服务池，避免给其它页塞无效 attribute */
const poolBindings = computed(() =>
  props.poolAware ? { initialPoolName: pendingPoolName.value } : {}
);

const poolKeyPrefix = computed(() =>
  props.poolAware ? `${activePoolName.value}-` : ""
);

const checkRecordKey = computed(
  () => `checkRecord-${poolKeyPrefix.value}${activeProvider.value}`
);

const alertRecordKey = computed(
  () => `alertRecord-${poolKeyPrefix.value}${activeProvider.value}`
);
</script>

<template>
  <div class="main provider-health-page">
    <header class="provider-health-header">
      <div class="provider-health-header__main">
        <h1>{{ title }}</h1>
        <p v-if="description">{{ description }}</p>
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
      @tab-click="handleTabClick"
    >
      <el-tab-pane label="Provider 状态" name="status">
        <component
          :is="statusComponent"
          v-if="activeTab === 'status'"
          @view-records="gotoCheckRecord"
          @view-alerts="gotoAlertRecord"
        />
      </el-tab-pane>
      <el-tab-pane label="检测流水" name="checkRecord">
        <component
          :is="checkComponent"
          v-if="activeTab === 'checkRecord'"
          :key="checkRecordKey"
          :initial-provider="pendingProvider"
          v-bind="poolBindings"
          @consumed="consumeContext"
        />
      </el-tab-pane>
      <el-tab-pane label="告警记录" name="alertRecord">
        <component
          :is="alertComponent"
          v-if="activeTab === 'alertRecord'"
          :key="alertRecordKey"
          :initial-provider="pendingProvider"
          v-bind="poolBindings"
          @consumed="consumeContext"
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

.provider-health-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.provider-health-header__main {
  min-width: 0;

  h1 {
    margin: 0;
    font-size: var(--ra-font-xl);
    font-weight: 600;
    line-height: 1.3;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 4px 0 0;
    font-size: var(--ra-font-sm);
    color: var(--el-text-color-secondary);
  }
}

.provider-context {
  border-radius: var(--ra-radius-lg);
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
  .provider-health-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
