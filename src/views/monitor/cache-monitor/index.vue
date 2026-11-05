<script setup lang="ts">
import { computed } from "vue";
import PanelCard from "@/components/PanelCard/index.vue";
import CacheHeader from "./components/CacheHeader.vue";
import CacheMetrics from "./components/CacheMetrics.vue";
import CacheInsights from "./components/CacheInsights.vue";
import RedisPanel from "./components/RedisPanel.vue";
import { useCacheMonitor } from "./hook";

defineOptions({ name: "CacheMonitor" });

const {
  loading,
  redisLoading,
  stats,
  topKeys,
  bigKeys,
  logs,
  isRedis,
  statusMeta,
  lastUpdatedText,
  partialErrorText,
  metricCards,
  insightCards,
  topKeyColumns,
  bigKeyColumns,
  logColumns,
  redisDetailItems,
  formatUptime,
  loadData,
  trendChartRef,
  trendLoading,
  trendDuration,
  durationOptions,
  refreshTrend
} = useCacheMonitor();

const uptimeText = computed(() =>
  stats.value?.uptimeInSeconds ? formatUptime(stats.value.uptimeInSeconds) : ""
);

const tableHeaderStyle = {
  background: "var(--el-fill-color-light)",
  color: "var(--el-text-color-primary)"
};
</script>

<template>
  <div v-loading="loading" class="cache-monitor">
    <CacheHeader
      :status-text="statusMeta.text"
      :status-type="statusMeta.type"
      :status-message="statusMeta.message"
      :cache-type="stats?.cacheType ?? 'Cache'"
      :uptime-text="uptimeText"
      :updated-text="lastUpdatedText"
      :loading="loading"
      @refresh="loadData()"
    />

    <el-alert
      v-if="partialErrorText"
      :title="partialErrorText"
      type="warning"
      show-icon
      :closable="false"
    />

    <CacheMetrics :cards="metricCards" />
    <CacheInsights :items="insightCards" />

    <PanelCard
      title="趋势监控"
      description="命中率、内存与请求量变化"
      :loading="trendLoading"
      :min-height="320"
    >
      <template #extra>
        <el-radio-group
          v-model="trendDuration"
          size="small"
          @change="() => refreshTrend()"
        >
          <el-radio-button
            v-for="opt in durationOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </template>
      <div ref="trendChartRef" class="trend-chart" />
    </PanelCard>

    <RedisPanel
      v-if="isRedis"
      :items="redisDetailItems"
      :loading="redisLoading"
    />

    <div class="cache-monitor__tables">
      <PanelCard
        title="热点 Key Top 10"
        description="访问次数最多的缓存键"
        :empty="!topKeys.length"
        empty-text="暂无热点 Key 数据"
        empty-icon="ri:fire-line"
      >
        <pure-table
          :data="topKeys"
          :columns="topKeyColumns"
          :header-cell-style="tableHeaderStyle"
        />
      </PanelCard>

      <PanelCard
        title="大 Key Top 10"
        description="占用空间最大的缓存键"
        :empty="!bigKeys.length"
        empty-text="暂无大 Key 数据"
      >
        <pure-table
          :data="bigKeys"
          :columns="bigKeyColumns"
          :header-cell-style="tableHeaderStyle"
        />
      </PanelCard>
    </div>

    <PanelCard
      title="最近操作日志"
      :description="`最近 ${logs.length} 条缓存操作记录`"
      :empty="!logs.length"
      empty-text="暂无操作日志"
      empty-icon="ri:file-list-3-line"
    >
      <pure-table
        :data="logs"
        :columns="logColumns"
        :header-cell-style="tableHeaderStyle"
      />
    </PanelCard>
  </div>
</template>

<style lang="scss" scoped>
.cache-monitor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 20px;
  background: var(--el-bg-color);
}

.trend-chart {
  width: 100%;
  height: 300px;
}

.cache-monitor__tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
  gap: 16px;
}

@media (width <= 560px) {
  .cache-monitor {
    padding: 12px;
  }

  .cache-monitor__tables {
    grid-template-columns: minmax(0, 1fr);
  }
}

:deep(.cache-key-cell) {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

:deep(.cache-key-text) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.cache-key-copy) {
  flex-shrink: 0;
  padding: 0;
  font-size: var(--ra-font-xs);
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;

  &:hover {
    color: var(--el-color-primary-light-3);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}
</style>
