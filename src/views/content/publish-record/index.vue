<script setup lang="ts">
import { onMounted } from "vue";
import {
  usePublishRecord,
  RECORD_STATUS_LABELS,
  RECORD_SOURCE_LABELS
} from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "PublishRecord"
});

const {
  loading,
  dataList,
  columns,
  searchFields,
  form,
  pagination,
  stats,
  statsLoading,
  detail,
  detailVisible,
  detailLoading,
  loadPlatforms,
  applyRouteQuery,
  onSearch,
  refreshAll,
  handleSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  openDetail,
  formatDateTime,
  formatDuration
} = usePublishRecord();

/** 失败率配色：只在真的有失败时才用红色，全成功时保持中性灰。 */
function rateColor(failed: number) {
  return failed > 0 ? "var(--el-color-danger)" : "var(--el-text-color-primary)";
}

const { update } = useCopyToClipboard();

function copyDetail() {
  if (!detail.value?.message) return;
  update(String(detail.value.message));
  message("失败原因已复制", { type: "success" });
}

onMounted(async () => {
  // 顺序固定：先拿到平台选项，再套用 URL 过滤，否则 select 选中值会因为
  // 选项尚未加载而被清空，用户会看到"筛了但没生效"。
  await loadPlatforms();
  applyRouteQuery();
  await refreshAll();
});
</script>

<template>
  <div class="main">
    <!-- ==================== 概览 ==================== -->
    <el-card v-loading="statsLoading" shadow="never" class="stats-card">
      <div class="stats-row">
        <div class="stat">
          <div class="stat-label">尝试总数</div>
          <div class="stat-value">{{ stats?.total ?? 0 }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">成功</div>
          <div class="stat-value success">{{ stats?.successCount ?? 0 }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">失败</div>
          <div
            class="stat-value"
            :style="{ color: rateColor(stats?.failedCount ?? 0) }"
          >
            {{ stats?.failedCount ?? 0 }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">成功率</div>
          <div class="stat-value">{{ stats?.successRate ?? 0 }}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">平均耗时</div>
          <div class="stat-value">
            {{ formatDuration(stats?.avgDurationMs) }}
          </div>
        </div>
      </div>

      <!-- 按平台拆分：同样是失败，集中在某个平台上通常是账号问题，散落各处更像网络抖动 -->
      <div v-if="stats?.platformStats?.length" class="breakdown">
        <span class="breakdown-title">按平台</span>
        <el-tag
          v-for="p in stats.platformStats"
          :key="p.platformCode"
          size="small"
          :type="p.failedCount > 0 ? 'danger' : 'success'"
          effect="plain"
        >
          {{ p.platformName || p.platformCode }} {{ p.successCount }}成功 /
          {{ p.failedCount }}失败
        </el-tag>
      </div>

      <!-- 按失败原因归类：cookie 失效要重新登录，超时只需重试，两者处置完全不同 -->
      <div v-if="stats?.errorTypeStats?.length" class="breakdown">
        <span class="breakdown-title">失败原因</span>
        <el-tag
          v-for="e in stats.errorTypeStats"
          :key="e.errorType"
          size="small"
          type="warning"
          effect="plain"
        >
          {{ e.errorTypeLabel }} × {{ e.count }}
        </el-tag>
      </div>
    </el-card>

    <!-- ==================== 列表 ==================== -->
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="发布记录" :columns="columns" @refresh="refreshAll">
      <template #buttons>
        <el-button :icon="useRenderIcon(Refresh)" @click="refreshAll">
          刷新
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          row-key="id"
          align-whole="center"
          table-layout="auto"
          adaptive
          showOverflowTooltip
          :adaptiveConfig="{ offsetBottom: 108 }"
          :loading="loading"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        />
      </template>
    </PureTableBar>

    <!-- ==================== 详情抽屉 ==================== -->
    <el-drawer v-model="detailVisible" title="发布记录详情" size="560px">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="业务日期">
              {{ detail.bizDate || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="内容包">
              {{ detail.packageTitle || `包 ${detail.packageId ?? "-"}` }}
            </el-descriptions-item>
            <el-descriptions-item label="平台">
              {{ detail.platformName || detail.platformCode }}
            </el-descriptions-item>
            <el-descriptions-item label="结果">
              <el-tag
                size="small"
                :type="detail.status === 'success' ? 'success' : 'danger'"
                effect="plain"
              >
                {{ RECORD_STATUS_LABELS[detail.status] || detail.status }}
              </el-tag>
              <span v-if="detail.attemptNo > 1" class="ml-2 text-xs">
                第 {{ detail.attemptNo }} 次尝试
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="失败归类">
              {{
                detail.status === "success" ? "-" : detail.errorTypeLabel || "-"
              }}
            </el-descriptions-item>
            <el-descriptions-item label="耗时">
              {{ formatDuration(detail.durationMs) }}
            </el-descriptions-item>
            <el-descriptions-item label="开始时间">
              {{ formatDateTime(detail.startedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="结束时间">
              {{ formatDateTime(detail.finishedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="执行机器">
              {{ detail.clientHost || "-" }}
              <span v-if="detail.clientVersion"
                >/ v{{ detail.clientVersion }}</span
              >
            </el-descriptions-item>
            <el-descriptions-item label="来源">
              {{
                RECORD_SOURCE_LABELS[detail.source || "api"] || detail.source
              }}
            </el-descriptions-item>
            <el-descriptions-item label="任务标识">
              {{ detail.taskId || "-" }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.externalUrl" label="外部链接">
              <el-link
                :href="detail.externalUrl"
                target="_blank"
                type="primary"
              >
                {{ detail.externalUrl }}
              </el-link>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 失败原文：CLI 输出常带多行堆栈，列表里截断，这里给完整且等宽排版 -->
          <div v-if="detail.status !== 'success'" class="reason-block">
            <div class="reason-header">
              <span>失败原因</span>
              <el-button link type="primary" size="small" @click="copyDetail">
                复制
              </el-button>
            </div>
            <pre class="reason-text">{{
              detail.message || "（客户端未上报原因）"
            }}</pre>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.stats-card {
  margin-bottom: 12px;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.stat-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;

  &.success {
    color: var(--el-color-success);
  }
}

.breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 12px;
}

.breakdown-title {
  margin-right: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.reason-block {
  margin-top: 16px;
}

.reason-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
}

/* 等宽 + 保留换行：失败原因多半是 CLI 的 stderr，挤成一段会丢失结构 */
.reason-text {
  max-height: 320px;
  padding: 10px;
  overflow: auto;
  font-family: var(--el-font-family-monospace, monospace);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
