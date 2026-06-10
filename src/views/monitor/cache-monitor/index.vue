<script setup lang="ts">
import { useCacheMonitor } from "./hook";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({ name: "CacheMonitor" });

const {
  loading,
  redisLoading,
  stats,
  health,
  topKeys,
  bigKeys,
  logs,
  redisInfo,
  isRedis,
  statusMeta,
  lastUpdatedText,
  partialErrorText,
  hitRateDisplay,
  hitRateColor,
  memoryPercent,
  memoryUsageDisplay,
  memoryColor,
  metricCards,
  insightCards,
  topKeyColumns,
  bigKeyColumns,
  logColumns,
  redisDetailItems,
  formatMemory,
  formatUptime,
  loadData,
  // 趋势图相关
  trendChartRef,
  trendLoading,
  trendDuration,
  durationOptions,
  refreshTrend
} = useCacheMonitor();
</script>

<template>
  <div v-loading="loading" class="cache-monitor">
    <!-- 顶部控制栏 -->
    <div class="control-bar">
      <div class="control-left">
        <div
          class="status-indicator"
          :class="[`is-${statusMeta.type}`, { 'is-active': health?.available }]"
          :title="statusMeta.message"
        >
          <span class="pulse-dot" />
          <span class="status-text">{{ statusMeta.text }}</span>
        </div>
        <div class="cache-type-badge">
          <el-icon :size="14"><ri:database-2-line /></el-icon>
          {{ stats?.cacheType ?? "Cache" }}
        </div>
        <div v-if="stats?.uptimeInSeconds" class="uptime-info">
          <el-icon :size="12"><ri:time-line /></el-icon>
          运行 {{ formatUptime(stats.uptimeInSeconds) }}
        </div>
        <div class="updated-info">
          <el-icon :size="12"><ri:refresh-line /></el-icon>
          {{ lastUpdatedText }}
        </div>
      </div>
      <div class="control-right">
        <el-button
          :icon="useRenderIcon(Refresh)"
          :loading="loading"
          size="small"
          type="primary"
          plain
          aria-label="刷新缓存监控数据"
          @click="() => loadData()"
        >
          刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="partialErrorText"
      class="monitor-alert"
      :title="partialErrorText"
      type="warning"
      show-icon
      :closable="false"
    />

    <!-- 核心指标卡片 -->
    <div class="metric-grid">
      <el-tooltip
        v-for="item in metricCards"
        :key="item.label"
        effect="dark"
        placement="top"
        :content="item.description"
      >
        <div class="metric-card" :class="{ highlight: item.highlight }">
          <div class="metric-icon" :style="{ '--gradient': item.gradient }">
            <el-icon :size="20">
              <component :is="useRenderIcon(item.icon)" />
            </el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value" :style="{ color: item.color }">
              {{ item.value }}
            </div>
            <div v-if="item.sub" class="metric-sub">{{ item.sub }}</div>
            <div class="metric-label">{{ item.label }}</div>
          </div>
        </div>
      </el-tooltip>
    </div>

    <div class="insight-row">
      <div
        v-for="item in insightCards"
        :key="item.title"
        class="insight-card"
        :class="`is-${item.type}`"
      >
        <div class="insight-icon">
          <el-icon :size="18">
            <component :is="useRenderIcon(item.icon)" />
          </el-icon>
        </div>
        <div class="insight-body">
          <div class="insight-title">{{ item.title }}</div>
          <div class="insight-desc">{{ item.description }}</div>
        </div>
      </div>
    </div>

    <!-- 进度条区域 -->
    <div class="progress-row">
      <div class="progress-card">
        <div class="progress-header">
          <span class="progress-title">命中率</span>
          <span class="progress-value" :style="{ color: hitRateColor }">{{
            hitRateDisplay
          }}</span>
        </div>
        <el-progress
          :percentage="stats?.hitRate ?? 0"
          :color="hitRateColor"
          :stroke-width="8"
          :format="() => ''"
        />
        <div class="progress-footer">
          <span>命中 {{ stats?.hitCount ?? 0 }}</span>
          <span>未命中 {{ stats?.missCount ?? 0 }}</span>
        </div>
      </div>

      <div class="progress-card">
        <div class="progress-header">
          <span class="progress-title">内存使用率</span>
          <span class="progress-value" :style="{ color: memoryColor }">
            {{ memoryUsageDisplay }}
          </span>
        </div>
        <el-progress
          :percentage="memoryPercent"
          :color="memoryColor"
          :stroke-width="8"
          :format="() => ''"
        />
        <div class="progress-footer">
          <span>已用 {{ formatMemory(stats?.usedMemory ?? null) }}</span>
          <span
            >上限
            {{
              stats?.maxMemory ? formatMemory(stats.maxMemory) : "无限制"
            }}</span
          >
        </div>
      </div>
    </div>

    <!-- 趋势图表区域 -->
    <div class="trend-section">
      <div class="section-header">
        <div class="section-title">
          <el-icon :size="16"><ri:line-chart-line /></el-icon>
          <span>趋势监控</span>
          <span class="section-subtitle">命中率、内存与请求量变化</span>
        </div>
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
      </div>
      <div v-loading="trendLoading" class="chart-container">
        <div ref="trendChartRef" class="trend-chart" />
      </div>
    </div>

    <!-- Redis 专属信息 -->
    <div v-if="isRedis" v-loading="redisLoading" class="redis-section">
      <div class="section-header">
        <div class="section-title">
          <el-icon :size="16" class="redis-icon"
            ><ri:database-2-line
          /></el-icon>
          <span>Redis 运行信息</span>
          <el-tag size="small" type="danger" effect="plain">Redis</el-tag>
          <span class="section-subtitle">连接、容量与 Keyspace 指标</span>
        </div>
      </div>
      <div v-if="redisInfo" class="redis-grid">
        <div
          v-for="item in redisDetailItems"
          :key="item.label"
          class="redis-item"
        >
          <div class="redis-item-icon">
            <el-icon :size="16"
              ><component :is="useRenderIcon(item.icon)" v-if="item.icon"
            /></el-icon>
          </div>
          <div class="redis-item-body">
            <div class="redis-item-value">{{ item.value ?? "-" }}</div>
            <div class="redis-item-label">{{ item.label }}</div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无 Redis 信息" :image-size="60" />
    </div>

    <!-- 热点 Key & 大 Key -->
    <div class="tables-row">
      <div class="table-card">
        <div class="section-header">
          <div class="section-title">
            <el-icon :size="16" class="fire-icon"><ri:fire-line /></el-icon>
            <span>热点 Key Top 10</span>
            <el-tag size="small" effect="plain">{{ topKeys.length }} 个</el-tag>
          </div>
        </div>
        <pure-table
          :data="topKeys"
          :columns="topKeyColumns"
          empty-text="暂无热点 Key 数据"
          :header-cell-style="{
            background: 'var(--el-fill-color-lighter)',
            color: 'var(--el-text-color-primary)'
          }"
        />
      </div>

      <div class="table-card">
        <div class="section-header">
          <div class="section-title">
            <el-icon :size="16" class="inbox-icon"><ri:inbox-line /></el-icon>
            <span>大 Key Top 10</span>
            <el-tag size="small" effect="plain">{{ bigKeys.length }} 个</el-tag>
          </div>
        </div>
        <pure-table
          :data="bigKeys"
          :columns="bigKeyColumns"
          empty-text="暂无大 Key 数据"
          :header-cell-style="{
            background: 'var(--el-fill-color-lighter)',
            color: 'var(--el-text-color-primary)'
          }"
        />
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="log-section">
      <div class="section-header">
        <div class="section-title">
          <el-icon :size="16"><ri:file-list-3-line /></el-icon>
          <span>最近操作日志</span>
          <el-tag size="small" effect="plain">{{ logs.length }} 条</el-tag>
        </div>
      </div>
      <pure-table
        :data="logs"
        :columns="logColumns"
        empty-text="暂无操作日志"
        :header-cell-style="{
          background: 'var(--el-fill-color-lighter)',
          color: 'var(--el-text-color-primary)'
        }"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

/* 响应式适配 */
@media (width <= 1400px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .insight-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .redis-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (width <= 1200px) {
  .progress-row,
  .tables-row {
    grid-template-columns: 1fr;
  }
}

@media (width <= 768px) {
  .cache-monitor {
    padding: 10px;
  }

  .control-bar,
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-grid,
  .insight-row,
  .redis-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    flex-wrap: wrap;
  }
}

.cache-monitor {
  min-height: 100%;
  padding: 16px;
  background: var(--el-bg-color);
}

/* 控制栏 */
.control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  margin-bottom: 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  .control-left {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }

  .control-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.status-indicator {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 12px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 20px;

  &.is-info {
    color: var(--el-color-info);
    background: var(--el-fill-color-light);

    .pulse-dot {
      background: var(--el-color-info);
    }
  }

  &.is-success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);

    .pulse-dot {
      background: var(--el-color-success);
    }
  }

  &.is-warning {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);

    .pulse-dot {
      background: var(--el-color-warning);
    }
  }

  &.is-danger {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);

    .pulse-dot {
      background: var(--el-color-danger);
    }
  }

  &.is-active {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);

    .pulse-dot {
      background: var(--el-color-success);
    }
  }
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--el-color-danger);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 12px;
  font-weight: 600;
}

.cache-type-badge {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.uptime-info {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.updated-info {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.monitor-alert {
  margin-bottom: 16px;
}

/* 指标卡片网格 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.metric-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  cursor: help;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-7);
    box-shadow: 0 2px 12px rgb(0 0 0 / 4%);
  }

  &.highlight {
    background: linear-gradient(
      135deg,
      var(--el-color-primary-light-9) 0%,
      var(--el-bg-color-overlay) 100%
    );
    border-color: var(--el-color-primary-light-5);
  }
}

.metric-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fff;
  background: var(--gradient);
  border-radius: 8px;
}

.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.metric-sub {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.metric-label {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.insight-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.insight-card {
  --insight-color: var(--el-color-info);

  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
  padding: 12px 14px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid var(--insight-color);
  border-radius: 8px;

  &.is-success {
    --insight-color: var(--el-color-success);
  }

  &.is-warning {
    --insight-color: var(--el-color-warning);
  }

  &.is-danger {
    --insight-color: var(--el-color-danger);
  }
}

.insight-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--insight-color);
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.insight-card.is-success .insight-icon {
  background: var(--el-color-success-light-9);
}

.insight-card.is-warning .insight-icon {
  background: var(--el-color-warning-light-9);
}

.insight-card.is-danger .insight-icon {
  background: var(--el-color-danger-light-9);
}

.insight-body {
  min-width: 0;
}

.insight-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.insight-desc {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

/* 进度条区域 */
.progress-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-card {
  padding: 16px 20px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.progress-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.progress-value {
  font-size: 20px;
  font-weight: 700;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 趋势图表区域 */
.trend-section {
  margin-bottom: 16px;
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.section-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);

  .el-icon {
    color: var(--el-color-primary);
  }
}

.section-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.chart-container {
  min-height: 300px;
  padding: 16px;
}

.trend-chart {
  width: 100%;
  height: 280px;
}

/* Redis 专属信息 */
.redis-section {
  margin-bottom: 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid var(--el-color-danger);
  border-radius: 8px;

  .redis-icon {
    color: var(--el-color-danger) !important;
  }
}

.redis-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 16px;
}

.redis-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: var(--el-fill-color-light);
  }
}

.redis-item-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
}

.redis-item-value {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
}

.redis-item-label {
  margin-top: 1px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 表格区域 */
.tables-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.table-card {
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  .fire-icon {
    color: var(--el-color-warning) !important;
  }

  .inbox-icon {
    color: var(--el-color-primary) !important;
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
  font-family: var(--el-font-family);
  white-space: nowrap;
}

:deep(.cache-key-copy) {
  flex-shrink: 0;
  padding: 0;
  font-size: 12px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}

:deep(.el-table__empty-text) {
  color: var(--el-text-color-secondary);
}

/* 操作日志 */
.log-section {
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
</style>
