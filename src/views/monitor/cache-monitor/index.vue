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
  hitRateDisplay,
  hitRateColor,
  memoryPercent,
  memoryColor,
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
          :class="{ 'is-active': health?.available }"
        >
          <span class="pulse-dot" />
          <span class="status-text">{{
            health?.available ? "运行中" : "异常"
          }}</span>
        </div>
        <div class="cache-type-badge">
          <el-icon :size="14"><ri:database-2-line /></el-icon>
          {{ stats?.cacheType ?? "Cache" }}
        </div>
        <div v-if="stats?.uptimeInSeconds" class="uptime-info">
          <el-icon :size="12"><ri:time-line /></el-icon>
          运行 {{ formatUptime(stats.uptimeInSeconds) }}
        </div>
      </div>
      <div class="control-right">
        <el-button
          :icon="useRenderIcon(Refresh)"
          circle
          size="small"
          @click="loadData"
        />
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metric-grid">
      <div class="metric-card">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #667eea, #764ba2)"
        >
          <el-icon :size="20"><ri:key-2-line /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ stats?.keyCount ?? "-" }}</div>
          <div class="metric-label">Key 总数</div>
        </div>
      </div>

      <div class="metric-card">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #f093fb, #f5576c)"
        >
          <el-icon :size="20"><ri:bar-chart-box-line /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ stats?.requestCount ?? "-" }}</div>
          <div class="metric-label">请求次数</div>
        </div>
      </div>

      <div class="metric-card highlight">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #4facfe, #00f2fe)"
        >
          <el-icon :size="20"><ri:target-line /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value" :style="{ color: hitRateColor }">
            {{ hitRateDisplay }}
          </div>
          <div class="metric-label">命中率</div>
        </div>
      </div>

      <div class="metric-card">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #43e97b, #38f9d7)"
        >
          <el-icon :size="20"><ri:database-line /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            {{ formatMemory(stats?.usedMemory ?? null) }}
          </div>
          <div class="metric-label">已用内存</div>
        </div>
      </div>

      <div class="metric-card">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #fa709a, #fee140)"
        >
          <el-icon :size="20"><ri:time-line /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            {{ stats?.hitCount ?? "-" }}
            <span class="metric-sub">/ {{ stats?.missCount ?? "-" }}</span>
          </div>
          <div class="metric-label">命中 / 未命中</div>
        </div>
      </div>

      <div class="metric-card">
        <div
          class="metric-icon"
          style="--gradient: linear-gradient(135deg, #a18cd1, #fbc2eb)"
        >
          <el-icon :size="20"><ri:shield-check-line /></el-icon>
        </div>
        <div class="metric-content">
          <div
            class="metric-value"
            :style="{ color: health?.available ? '#67c23a' : '#f56c6c' }"
          >
            {{ health?.status ?? "-" }}
          </div>
          <div class="metric-label">健康状态</div>
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
            {{
              stats?.memoryUsageRate != null ? `${stats.memoryUsageRate}%` : "-"
            }}
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
        </div>
        <el-radio-group
          v-model="trendDuration"
          size="small"
          @change="refreshTrend"
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
          </div>
        </div>
        <pure-table
          :data="topKeys"
          :columns="topKeyColumns"
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
          </div>
        </div>
        <pure-table
          :data="bigKeys"
          :columns="bigKeyColumns"
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
        </div>
      </div>
      <pure-table
        :data="logs"
        :columns="logColumns"
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
    gap: 16px;
    align-items: center;
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
  min-width: 0;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.metric-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.metric-label {
  margin-top: 2px;
  font-size: 11px;
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

/* 操作日志 */
.log-section {
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
</style>
