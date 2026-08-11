<script setup lang="ts">
import { onMounted } from "vue";
import {
  useProviderStatus,
  formatTime,
  formatRelative,
  getStatusLabel,
  getReasonLabel,
  type ProviderCardItem
} from "../hook/useProviderStatus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "ProviderStatus"
});

const emit = defineEmits<{
  (e: "view-records", provider: string): void;
  (e: "view-alerts", provider: string): void;
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
  onQueryBalance,
  runBatch
} = useProviderStatus();

function statusClass(item: ProviderCardItem) {
  return `is-${(item.status || "unknown").toLowerCase()}`;
}

function isSelected(provider: string) {
  return selectedProviders.value.includes(provider);
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
        <span class="stat-chip__label">全部供应商</span>
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
        <span class="stat-chip__value">
          {{ statsOverview.warnCount + statsOverview.downCount }}
        </span>
        <span class="stat-chip__label">异常 / 停机</span>
      </button>
      <button
        type="button"
        class="stat-chip is-suspended"
        :class="{
          'is-active': statusFilter === 'SUSPENDED',
          'is-zero': statsOverview.suspendedCount === 0
        }"
        @click="toggleStatusFilter('SUSPENDED')"
      >
        <span class="stat-chip__value">{{ statsOverview.suspendedCount }}</span>
        <span class="stat-chip__label">已暂停</span>
      </button>
      <div class="stat-chip is-static is-alert">
        <span class="stat-chip__value">{{ statsOverview.openAlertCount }}</span>
        <span class="stat-chip__label">未解决告警</span>
      </div>
      <div class="stats-strip__spacer" />
      <el-button
        :icon="useRenderIcon(Refresh)"
        :loading="loading"
        circle
        title="刷新"
        aria-label="刷新供应商状态"
        @click="onSearch"
      />
    </div>

    <!-- 批量操作条（仅勾选时出现） -->
    <Transition name="batch-slide">
      <div v-if="selectedCount > 0" class="batch-bar">
        <span class="batch-bar__info">已选 {{ selectedCount }} 个供应商</span>
        <el-button link type="primary" size="small" @click="selectAllVisible">
          全选可见
        </el-button>
        <el-button link size="small" @click="clearSelection">清空</el-button>
        <div class="batch-bar__spacer" />
        <el-button
          size="small"
          type="success"
          plain
          :loading="batchWorking"
          @click="runBatch('enable')"
        >
          批量启用
        </el-button>
        <el-button
          size="small"
          type="danger"
          plain
          :loading="batchWorking"
          @click="runBatch('disable')"
        >
          批量禁用
        </el-button>
        <el-button
          size="small"
          type="warning"
          plain
          :loading="batchWorking"
          @click="runBatch('balance')"
        >
          批量查余额
        </el-button>
      </div>
    </Transition>

    <!-- 卡片网格 -->
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
        statusFilter === 'all' ? '暂无供应商数据' : '当前过滤条件下无供应商'
      "
    >
      <el-button
        v-if="statusFilter !== 'all'"
        @click="toggleStatusFilter('all')"
      >
        查看全部
      </el-button>
    </el-empty>

    <div v-else class="card-grid">
      <article
        v-for="item in filteredList"
        :key="item.provider"
        class="provider-card"
        :class="[
          statusClass(item),
          { 'is-selected': isSelected(item.provider) }
        ]"
      >
        <!-- 顶部：勾选 + 名称 + 状态 + 启用开关 -->
        <header class="provider-card__head">
          <el-checkbox
            :model-value="isSelected(item.provider)"
            :aria-label="`选择 ${item.provider}`"
            @change="toggleSelect(item.provider)"
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
          >
            {{ getStatusLabel(item.status) }}
          </el-tag>
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

        <!-- 指标区 -->
        <dl class="provider-card__metrics">
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
            <dt>余额</dt>
            <dd>
              {{
                item.balanceAmount != null
                  ? `${item.balanceAmount} ${item.balanceCurrency || ""}`
                  : "-"
              }}
            </dd>
          </div>
          <div class="metric">
            <dt>剩余配额</dt>
            <dd>{{ item.quotaRemaining ?? "-" }}</dd>
          </div>
        </dl>

        <!-- 时间区 -->
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

        <!-- 失败信息（仅异常时） -->
        <el-tooltip
          v-if="item.lastErrorMessage && item.status !== 'UP'"
          :content="item.lastErrorMessage"
          placement="top"
          :show-after="300"
        >
          <p class="provider-card__error">{{ item.lastErrorMessage }}</p>
        </el-tooltip>

        <!-- 操作区 -->
        <footer class="provider-card__actions">
          <el-button
            size="small"
            type="primary"
            plain
            :loading="item._probing"
            @click="onProbe(item)"
          >
            探测
          </el-button>
          <el-button
            size="small"
            type="warning"
            plain
            :loading="item._queryingBalance"
            @click="onQueryBalance(item)"
          >
            查余额
          </el-button>
          <div class="provider-card__actions-spacer" />
          <el-button
            size="small"
            link
            type="primary"
            @click="emit('view-records', item.provider)"
          >
            流水
          </el-button>
          <el-button
            size="small"
            link
            type="danger"
            @click="emit('view-alerts', item.provider)"
          >
            告警
          </el-button>
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

@media (width <= 640px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}

.provider-board {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== 统计条 ===== */
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

  &:hover:not(.is-static) {
    border-color: var(--el-color-primary);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  &.is-static {
    cursor: default;
  }

  &.is-zero {
    opacity: 0.55;
  }
}

.stat-chip__value {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);

  .stat-chip.is-up & {
    color: var(--el-color-success);
  }

  .stat-chip.is-abnormal & {
    color: var(--el-color-danger);
  }

  .stat-chip.is-suspended & {
    color: var(--el-text-color-secondary);
  }

  .stat-chip.is-alert & {
    color: var(--el-color-warning);
  }
}

.stat-chip__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ===== 批量操作条 ===== */
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

.batch-slide-enter-active,
.batch-slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.batch-slide-enter-from,
.batch-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ===== 卡片网格 ===== */
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
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  /* 顶部状态色带 */
  &::before {
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    content: "";
    background: var(--el-border-color);
  }

  &.is-up::before {
    background: var(--el-color-success);
  }

  &.is-warn::before {
    background: var(--el-color-warning);
  }

  &.is-down::before {
    background: var(--el-color-danger);
  }

  &.is-suspended::before {
    background: var(--el-color-info);
  }

  &:hover {
    box-shadow: var(--el-box-shadow-light);
  }

  &.is-selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary) inset;
  }

  &.is-skeleton {
    display: block;
  }
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

  .provider-card.is-up & {
    background: var(--el-color-success);
  }

  .provider-card.is-warn & {
    background: var(--el-color-warning);
  }

  .provider-card.is-down & {
    background: var(--el-color-danger);
    animation: pulse 1.6s infinite;
  }

  .provider-card.is-suspended & {
    background: var(--el-color-info);
  }
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

/* ===== 指标 ===== */
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

  dt {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    white-space: nowrap;

    &.is-danger {
      color: var(--el-color-danger);
    }
  }
}

/* ===== 时间 ===== */
.provider-card__times {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  span {
    cursor: default;
  }
}

/* ===== 错误信息 ===== */
.provider-card__error {
  padding: 6px 10px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-color-danger);
  white-space: nowrap;
  cursor: default;
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
}

/* ===== 操作 ===== */
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
