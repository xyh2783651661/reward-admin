<script setup lang="ts">
import { computed } from "vue";
import type { TaskLogStats } from "@/api/logs";

const props = defineProps<{
  stats: TaskLogStats | null;
  loading: boolean;
}>();

interface MetricItem {
  key: string;
  label: string;
  value: number | string;
  sub: string;
  color: string;
  icon: string;
  progress?: number;
}

const metrics = computed<MetricItem[]>(() => {
  const s = props.stats;
  if (!s) return [];
  const notExecuted =
    (s.skippedCount ?? 0) + (s.lockedCount ?? 0) + (s.cancelledCount ?? 0);
  const rate = Math.round(s.executedSuccessRate ?? 0);
  return [
    {
      key: "total",
      label: "近 7 天执行",
      value: s.totalCount ?? 0,
      sub: `实际执行 ${s.executedCount ?? 0} 次`,
      color: "var(--el-color-primary)",
      icon: "ri:play-circle-line"
    },
    {
      key: "rate",
      label: "执行成功率",
      value: `${rate}%`,
      sub: `干净成功 ${s.successCount ?? 0} 次`,
      color: "var(--el-color-success)",
      icon: "ri:checkbox-circle-line",
      progress: rate
    },
    {
      key: "failure",
      label: "失败",
      value: s.failureCount ?? 0,
      sub: `含超时 ${s.timeoutCount ?? 0} 次`,
      color: "var(--el-color-danger)",
      icon: "ri:close-circle-line"
    },
    {
      key: "partial",
      label: "部分成功",
      value: s.partialSuccessCount ?? 0,
      sub: "无异常但产物可能不完整",
      color: "var(--el-color-warning)",
      icon: "ri:error-warning-line"
    },
    {
      key: "idle",
      label: "未执行",
      value: notExecuted,
      sub: `跳过 ${s.skippedCount ?? 0} · 未获锁 ${s.lockedCount ?? 0} · 取消 ${s.cancelledCount ?? 0}`,
      color: "var(--el-text-color-secondary)",
      icon: "ri:pause-circle-line"
    }
  ];
});

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** 状态分布：失败与超时拆开，便于看出是业务异常还是被强制中断 */
const segments = computed<Segment[]>(() => {
  const s = props.stats;
  if (!s) return [];
  const timeout = s.timeoutCount ?? 0;
  const list: Segment[] = [
    {
      key: "success",
      label: "成功",
      value: s.successCount ?? 0,
      color: "#67c23a"
    },
    {
      key: "partial",
      label: "部分成功",
      value: s.partialSuccessCount ?? 0,
      color: "#e6a23c"
    },
    {
      key: "failed",
      label: "失败",
      value: Math.max((s.failureCount ?? 0) - timeout, 0),
      color: "#f56c6c"
    },
    { key: "timeout", label: "超时", value: timeout, color: "#c45656" },
    {
      key: "locked",
      label: "未获锁",
      value: s.lockedCount ?? 0,
      color: "#f3d19e"
    },
    {
      key: "skipped",
      label: "已跳过",
      value: s.skippedCount ?? 0,
      color: "#b1b3b8"
    },
    {
      key: "cancelled",
      label: "已取消",
      value: s.cancelledCount ?? 0,
      color: "#d3d4d6"
    },
    {
      key: "running",
      label: "执行中",
      value: s.runningCount ?? 0,
      color: "#409eff"
    },
    {
      key: "waiting",
      label: "等待中",
      value: s.waitingCount ?? 0,
      color: "#a0cfff"
    }
  ];
  return list.filter(item => item.value > 0);
});

const segmentTotal = computed(() =>
  segments.value.reduce((sum, item) => sum + item.value, 0)
);
</script>

<template>
  <section v-loading="loading" class="log-stats" aria-label="近 7 天任务统计">
    <div v-if="metrics.length" class="log-stats__cards">
      <article v-for="item in metrics" :key="item.key" class="stat-card">
        <div class="stat-card__head">
          <span class="stat-card__label">{{ item.label }}</span>
          <span
            class="stat-card__icon"
            :style="{
              color: item.color,
              background: `color-mix(in srgb, ${item.color} 12%, transparent)`
            }"
          >
            <IconifyIconOnline :icon="item.icon" />
          </span>
        </div>
        <strong class="stat-card__value">{{ item.value }}</strong>
        <div
          v-if="item.progress != null"
          class="stat-card__bar"
          role="progressbar"
          :aria-label="item.label"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="item.progress"
        >
          <span
            :style="{ width: `${item.progress}%`, background: item.color }"
          />
        </div>
        <p class="stat-card__sub" :title="item.sub">{{ item.sub }}</p>
      </article>
    </div>
    <div v-else-if="!loading" class="log-stats__empty">暂无统计数据</div>

    <div v-if="segmentTotal > 0" class="distribution">
      <div class="distribution__bar" role="img" aria-label="近 7 天状态分布">
        <span
          v-for="item in segments"
          :key="item.key"
          :style="{ flex: item.value, background: item.color }"
          :title="`${item.label} ${item.value}`"
        />
      </div>
      <ul class="distribution__legend">
        <li v-for="item in segments" :key="item.key">
          <i :style="{ background: item.color }" />
          {{ item.label }}
          <b>{{ item.value }}</b>
          <em>{{ Math.round((item.value / segmentTotal) * 100) }}%</em>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.log-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 96px;
  margin-bottom: 16px;
}

.log-stats__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.log-stats__empty {
  padding: 24px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.stat-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stat-card__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  border-radius: 8px;
}

.stat-card__value {
  margin-top: 4px;
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.stat-card__bar {
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.4s ease;
  }
}

.stat-card__sub {
  margin: 6px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.distribution {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 2px;
}

.distribution__bar {
  display: flex;
  gap: 2px;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;

  span {
    min-width: 4px;
    transition: flex 0.4s ease;
  }
}

.distribution__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  list-style: none;

  li {
    display: inline-flex;
    gap: 5px;
    align-items: center;
  }

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  b {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  em {
    font-style: normal;
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }
}
</style>
