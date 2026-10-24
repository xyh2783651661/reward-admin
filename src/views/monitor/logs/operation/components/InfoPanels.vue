<script setup lang="ts">
import { computed } from "vue";
import PanelCard from "@/components/PanelCard/index.vue";
import type { TaskLogDetail } from "@/api/logs";
import type { TaskLogTone, TaskLogTriggerMeta } from "../status";
import { copyText, formatTime, toneColor } from "../format";
import type { BusinessSummary } from "./DetailMetrics.vue";

const props = defineProps<{
  detail: TaskLogDetail;
  triggerMeta: TaskLogTriggerMeta;
  business: BusinessSummary | null;
  /** true: 任务级计数；false: 由步骤批处理汇总而来 */
  businessFromTask: boolean;
}>();

interface InfoRow {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
  tone?: TaskLogTone;
}

const contextRows = computed<InfoRow[]>(() => {
  const d = props.detail;
  const node = [d.serverHost, d.serverIp].filter(Boolean).join(" · ");
  const thread = d.threadName
    ? `${d.threadName}${d.threadId ? ` (#${d.threadId})` : ""}`
    : "";
  return [
    { label: "记录 ID", value: String(d.id ?? "-"), mono: true },
    {
      label: "任务编码",
      value: d.taskCode || "-",
      mono: true,
      copy: !!d.taskCode
    },
    {
      label: "触发方式",
      value: d.triggerType ? props.triggerMeta.label : "-"
    },
    { label: "运行环境", value: d.environment || "-" },
    { label: "应用名", value: d.applicationName || "-" },
    { label: "执行节点", value: node || "-" },
    { label: "执行线程", value: thread || "-", mono: true },
    { label: "创建时间", value: formatTime(d.createdTime) },
    {
      label: "重试次数",
      value: `${d.retryCount ?? 0}${d.parentExecutionId ? ` · 父执行 ${d.parentExecutionId}` : ""}`
    }
  ];
});

const showLock = computed(
  () =>
    !!(
      props.detail.lockEnabled ||
      props.detail.timeout ||
      props.detail.timeoutMinutes != null
    )
);

const lockRows = computed<InfoRow[]>(() => {
  const d = props.detail;
  const rows: InfoRow[] = [
    {
      label: "超时配置",
      value: d.timeoutMinutes ? `${d.timeoutMinutes} 分钟` : "未启用"
    },
    {
      label: "是否超时",
      value: d.timeout ? "是" : "否",
      tone: d.timeout ? "danger" : "success"
    },
    { label: "分布式锁", value: d.lockEnabled ? "已启用" : "未启用" }
  ];
  if (d.lockEnabled) {
    rows.push(
      { label: "锁 Key", value: d.lockKey || "-", mono: true },
      {
        label: "是否抢到锁",
        value: d.lockAcquired ? "已获得" : "未获得",
        tone: d.lockAcquired ? "success" : "warning"
      },
      { label: "抢锁时间", value: formatTime(d.lockAcquireTime) },
      { label: "释放时间", value: formatTime(d.lockReleaseTime) }
    );
  }
  return rows;
});
</script>

<template>
  <div class="info-panels">
    <PanelCard
      title="执行上下文"
      description="定位执行实例、节点与环境"
      :min-height="0"
    >
      <dl class="kv">
        <div v-for="row in contextRows" :key="row.label" class="kv__row">
          <dt>{{ row.label }}</dt>
          <dd :class="{ 'is-mono': row.mono }">
            <span>{{ row.value }}</span>
            <el-button
              v-if="row.copy"
              link
              type="primary"
              size="small"
              @click="copyText(row.value, row.label)"
            >
              复制
            </el-button>
          </dd>
        </div>
      </dl>
    </PanelCard>

    <PanelCard
      v-if="showLock"
      title="超时与分布式锁"
      description="解释「为什么没执行 / 为什么中断」"
      :min-height="0"
    >
      <dl class="kv">
        <div v-for="row in lockRows" :key="row.label" class="kv__row">
          <dt>{{ row.label }}</dt>
          <dd
            :class="{ 'is-mono': row.mono }"
            :style="row.tone ? { color: toneColor(row.tone) } : undefined"
          >
            <span>{{ row.value }}</span>
          </dd>
        </div>
      </dl>
    </PanelCard>

    <PanelCard
      v-if="business"
      title="业务结果"
      :description="
        businessFromTask ? '任务级计数（来自结果摘要）' : '按步骤批处理汇总'
      "
      :min-height="0"
    >
      <div class="cells">
        <div class="cell">
          <span>总数</span>
          <b>{{ business.total }}</b>
        </div>
        <div class="cell">
          <span>成功</span>
          <b class="is-success">{{ business.success }}</b>
        </div>
        <div class="cell">
          <span>失败</span>
          <b :class="{ 'is-danger': business.failed > 0 }">{{
            business.failed
          }}</b>
        </div>
        <div class="cell">
          <span>跳过</span>
          <b class="is-muted">{{ business.skipped }}</b>
        </div>
        <div class="cell">
          <span>成功率</span>
          <b class="is-primary">{{ business.rate }}%</b>
        </div>
      </div>
      <div class="bar" role="presentation">
        <span
          :class="business.failed > 0 ? 'is-warning' : 'is-success'"
          :style="{ width: `${business.rate}%` }"
        />
      </div>
    </PanelCard>
  </div>
</template>

<style scoped lang="scss">
.info-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
  align-items: start;
}

.kv {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.kv__row {
  display: flex;
  gap: 16px;
  align-items: baseline;
  justify-content: space-between;
  padding: 9px 0;
  font-size: 13px;

  & + & {
    border-top: 1px solid var(--el-border-color-extra-light);
  }

  dt {
    flex: none;
    color: var(--el-text-color-secondary);
  }

  dd {
    display: flex;
    gap: 6px;
    align-items: baseline;
    min-width: 0;
    margin: 0;
    color: var(--el-text-color-primary);
    text-align: right;
    word-break: break-all;

    &.is-mono span {
      font-family: var(--el-font-family-mono, ui-monospace, monospace);
      font-size: 12px;
    }
  }
}

.cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 10px;

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  b {
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);

    &.is-success {
      color: var(--el-color-success);
    }

    &.is-danger {
      color: var(--el-color-danger);
    }

    &.is-muted {
      color: var(--el-text-color-secondary);
    }

    &.is-primary {
      color: var(--el-color-primary);
    }
  }
}

.bar {
  height: 6px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: 999px;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;

    &.is-success {
      background: var(--el-color-success);
    }

    &.is-warning {
      background: var(--el-color-warning);
    }
  }
}
</style>
