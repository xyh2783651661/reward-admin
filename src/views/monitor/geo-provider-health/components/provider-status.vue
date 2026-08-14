<script setup lang="ts">
import { onMounted } from "vue";
import {
  useGeoProviderStatus,
  formatTime,
  formatRelative,
  getStatusLabel,
  getReasonLabel,
  type ProviderCardItem
} from "../hook/useGeoProviderStatus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "GeoProviderStatus"
});

const emit = defineEmits<{
  (e: "view-records", provider: string, poolName?: string): void;
  (e: "view-alerts", provider: string, poolName?: string): void;
}>();

const {
  loading,
  filteredList,
  statsOverview,
  statusFilter,
  selectedProviders,
  selectedCount,
  batchWorking,
  toggleStatusFilter,
  toggleSelect,
  clearSelection,
  selectAllVisible,
  onSearch,
  onProbe,
  onToggleEnable,
  runBatch,
  onReset,
  getPoolLabel
} = useGeoProviderStatus();

function statusClass(item: ProviderCardItem) {
  return `is-${(item.status || "unknown").toLowerCase()}`;
}

function isSelected(provider: string, poolName?: string) {
  return selectedProviders.value.some(
    p => p.provider === provider && p.poolName === poolName
  );
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="provider-board">
    <!-- 可点击统计条 -->
    <div class="stats-strip" role="group" aria-label="按状态过滤供应商">
      <button
        type="button"
        class="stat-chip"
        :class="{ 'is-active': statusFilter === 'all' }"
        @click="toggleStatusFilter('all')"
      >
        <span class="stat-chip__value">{{ statsOverview.totalProviders }}</span>
        <span class="stat-chip__label">全部来源</span>
      </button>
      <button
        type="button"
        class="stat-chip is-up"
        :class="{
          'is-active': statusFilter === 'UP',
          'is-zero': statsOverview.upCount === 0
        }"
        @click="toggleStatusFilter('UP')"
      >
        <span class="stat-chip__value">{{ statsOverview.upCount }}</span>
        <span class="stat-chip__label">正常</span>
      </button>
      <button
        type="button"
        class="stat-chip is-abnormal"
        :class="{
          'is-active': statusFilter === 'abnormal',
          'is-zero': statsOverview.warnCount + statsOverview.downCount === 0
        }"
        @click="toggleStatusFilter('abnormal')"
      >
        <span class="stat-chip__value">{{
          statsOverview.warnCount + statsOverview.downCount
        }}</span>
        <span class="stat-chip__label">异常 / 停机</span>
      </button>
      <button
        type="button"
        class="stat-chip is-alert"
        @click="emit('view-alerts', '')"
      >
        <span class="stat-chip__value">{{ statsOverview.openAlertCount }}</span>
        <span class="stat-chip__label">未解决告警</span>
      </button>
      <div class="stats-strip__spacer" />
      <el-button
        :icon="useRenderIcon(Refresh)"
        :loading="loading"
        circle
        title="刷新"
        aria-label="刷新来源状态"
        @click="onSearch"
      />
    </div>

    <Transition name="batch-slide">
      <div v-if="selectedCount > 0" class="batch-bar">
        <span class="batch-bar__info">已选 {{ selectedCount }} 个来源</span>
        <el-button link type="primary" size="small" @click="selectAllVisible"
          >全选可见</el-button
        >
        <el-button link size="small" @click="clearSelection">清空</el-button>
        <div class="batch-bar__spacer" />
        <el-button
          size="small"
          type="success"
          plain
          :loading="batchWorking"
          @click="runBatch('enable')"
          >批量启用</el-button
        >
        <el-button
          size="small"
          type="danger"
          plain
          :loading="batchWorking"
          @click="runBatch('disable')"
          >批量禁用</el-button
        >
        <el-button
          size="small"
          type="warning"
          plain
          :loading="batchWorking"
          @click="runBatch('reset')"
          >批量重置熔断</el-button
        >
      </div>
    </Transition>

    <div v-if="loading" class="card-grid" aria-hidden="true">
      <el-skeleton
        v-for="i in 6"
        :key="i"
        animated
        class="provider-card is-skeleton"
      >
        <template #template>
          <el-skeleton-item variant="h3" style="width: 50%" />
          <el-skeleton-item variant="text" style="margin-top: 16px" />
          <el-skeleton-item variant="text" style="width: 70%" />
          <el-skeleton-item variant="text" style="width: 60%" />
        </template>
      </el-skeleton>
    </div>

    <el-empty
      v-else-if="filteredList.length === 0"
      :description="
        statusFilter === 'all' ? '暂无来源数据' : '当前过滤条件下无来源'
      "
    >
      <el-button
        v-if="statusFilter !== 'all'"
        @click="toggleStatusFilter('all')"
        >查看全部</el-button
      >
    </el-empty>

    <div v-else class="card-grid">
      <article
        v-for="item in filteredList"
        :key="item.provider + '|' + item.poolName"
        class="provider-card"
        :class="[
          statusClass(item),
          { 'is-selected': isSelected(item.provider, item.poolName) }
        ]"
      >
        <header class="provider-card__head">
          <el-checkbox
            :model-value="isSelected(item.provider, item.poolName)"
            :aria-label="`选择 ${item.poolName}/${item.provider}`"
            @change="() => toggleSelect(item.provider, item.poolName)"
          />
          <span class="provider-card__dot" aria-hidden="true" />
          <h3 class="provider-card__name" :title="item.provider">
            {{ item.provider }}
          </h3>
          <el-tag
            class="provider-card__status"
            :type="
              item.status === 'UP'
                ? 'success'
                : item.status === 'WARN'
                  ? 'warning'
                  : item.status === 'DOWN'
                    ? 'danger'
                    : 'info'
            "
            effect="light"
            size="small"
            >{{ getStatusLabel(item.status) }}</el-tag
          >
          <el-switch
            :model-value="item.enabled"
            :loading="item._toggling"
            size="small"
            inline-prompt
            active-text="启"
            inactive-text="禁"
            :title="item.enabled ? '点击禁用' : '点击启用'"
            @click.prevent="onToggleEnable(item)"
          />
        </header>

        <dl class="provider-card__metrics">
          <div class="metric">
            <dt>池子</dt>
            <dd>{{ getPoolLabel(item.poolName) }}</dd>
          </div>
          <div class="metric">
            <dt>故障原因</dt>
            <dd :class="{ 'is-danger': item.reason && item.reason !== 'OK' }">
              {{ getReasonLabel(item.reason) }}
            </dd>
          </div>
          <div class="metric">
            <dt>连续失败</dt>
            <dd :class="{ 'is-danger': (item.failCount ?? 0) > 0 }">
              {{ item.failCount ?? 0 }}
            </dd>
          </div>
          <div class="metric">
            <dt>今日失败</dt>
            <dd>{{ item.todayFailureCount ?? 0 }}</dd>
          </div>
        </dl>

        <div class="provider-card__times">
          <el-tooltip
            :content="`最后检测：${formatTime(item.lastCheckTime)}`"
            placement="top"
          >
            <span>检测 {{ formatRelative(item.lastCheckTime) }}</span>
          </el-tooltip>
          <el-tooltip
            :content="`最后成功：${formatTime(item.lastSuccessTime)}`"
            placement="top"
          >
            <span>成功 {{ formatRelative(item.lastSuccessTime) }}</span>
          </el-tooltip>
        </div>

        <el-tooltip
          v-if="item.lastErrorMessage && item.status !== 'UP'"
          :content="item.lastErrorMessage"
          placement="top"
          :show-after="300"
        >
          <p class="provider-card__error">{{ item.lastErrorMessage }}</p>
        </el-tooltip>

        <footer class="provider-card__actions">
          <el-button
            size="small"
            type="primary"
            plain
            :loading="item._probing"
            @click="onProbe(item)"
            >探测</el-button
          >
          <el-button
            size="small"
            type="warning"
            plain
            :loading="item._resetting"
            @click="onReset(item)"
            >重置</el-button
          >
          <div class="provider-card__actions-spacer" />
          <el-button
            size="small"
            link
            type="primary"
            @click="emit('view-records', item.provider, item.poolName)"
            >流水</el-button
          >
          <el-button
            size="small"
            link
            type="danger"
            @click="emit('view-alerts', item.provider, item.poolName)"
            >告警</el-button
          >
        </footer>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

.provider-board {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stats-strip__spacer {
  flex: 1;
}

.stat-chip {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 8px 14px;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.stat-chip__value {
  font-size: 20px;
  font-weight: 700;
}

.stat-chip__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.batch-bar {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 8px;
}

.batch-bar__info {
  margin-right: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.batch-bar__spacer {
  flex: 1;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.provider-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.provider-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  content: "";
  background: var(--el-border-color);
}

.provider-card.is-up::before {
  background: var(--el-color-success);
}

.provider-card.is-warn::before {
  background: var(--el-color-warning);
}

.provider-card.is-down::before {
  background: var(--el-color-danger);
}

.provider-card.is-suspended::before {
  background: var(--el-color-info);
}

.provider-card.is-selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.provider-card__head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.provider-card__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: var(--el-border-color);
  border-radius: 50%;
}

.provider-card.is-up .provider-card__dot {
  background: var(--el-color-success);
}

.provider-card.is-warn .provider-card__dot {
  background: var(--el-color-warning);
}

.provider-card.is-down .provider-card__dot {
  background: var(--el-color-danger);
  animation: pulse 1.6s infinite;
}

.provider-card__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.provider-card__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin: 0;
}

.metric {
  display: flex;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
}

.metric dt {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.metric dd.is-danger {
  color: var(--el-color-danger);
}

.provider-card__times {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.provider-card__error {
  padding: 6px 10px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-color-danger);
  white-space: nowrap;
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
}

.provider-card__actions {
  display: flex;
  gap: 0;
  align-items: center;
  padding-top: 10px;
  margin-top: auto;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.provider-card__actions-spacer {
  flex: 1;
}
</style>
