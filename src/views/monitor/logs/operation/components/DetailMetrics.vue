<script setup lang="ts">
import { computed } from "vue";
import { formatMs } from "../format";

export interface BusinessSummary {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  rate: number;
}

const props = defineProps<{
  stepCount: number;
  failedStepCount: number;
  slowest: { name: string; cost: number; index: number } | null;
  avgCost: number;
  business: BusinessSummary | null;
  exceptionType: string | null;
}>();

const emit = defineEmits<{
  "show-failed": [];
  "focus-step": [index: number];
  "show-exception": [];
}>();

interface MetricCard {
  key: string;
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: string;
  clickable?: boolean;
  onClick?: () => void;
}

const cards = computed<MetricCard[]>(() => {
  const list: MetricCard[] = [
    {
      key: "steps",
      label: "步骤总数",
      value: props.stepCount,
      sub: props.stepCount
        ? `平均 ${formatMs(props.avgCost)} / 步`
        : "未记录步骤",
      color: "var(--el-color-primary)",
      icon: "ri:node-tree"
    },
    {
      key: "failed",
      label: "失败步骤",
      value: props.failedStepCount,
      sub: props.failedStepCount ? "点击只看失败步骤" : "全部步骤成功",
      color:
        props.failedStepCount > 0
          ? "var(--el-color-danger)"
          : "var(--el-color-success)",
      icon:
        props.failedStepCount > 0
          ? "ri:close-circle-line"
          : "ri:checkbox-circle-line",
      clickable: props.failedStepCount > 0,
      onClick: () => emit("show-failed")
    }
  ];

  if (props.slowest) {
    const { name, cost, index } = props.slowest;
    list.push({
      key: "slowest",
      label: "最慢步骤",
      value: formatMs(cost),
      sub: name,
      color: "var(--el-color-warning)",
      icon: "ri:timer-flash-line",
      clickable: true,
      onClick: () => emit("focus-step", index)
    });
  }

  if (props.business) {
    const { rate, success, total, failed, skipped } = props.business;
    const extra = [
      failed ? `失败 ${failed}` : "",
      skipped ? `跳过 ${skipped}` : ""
    ].filter(Boolean);
    list.push({
      key: "business",
      label: "业务成功率",
      value: `${rate}%`,
      sub: [`${success}/${total}`, ...extra].join(" · "),
      color: failed > 0 ? "var(--el-color-warning)" : "var(--el-color-success)",
      icon: "ri:pie-chart-2-line"
    });
  }

  if (props.exceptionType !== null) {
    list.push({
      key: "exception",
      label: "异常",
      value: props.exceptionType || "未知类型",
      sub: "点击查看堆栈",
      color: "var(--el-color-danger)",
      icon: "ri:bug-line",
      clickable: true,
      onClick: () => emit("show-exception")
    });
  }

  return list;
});
</script>

<template>
  <section class="detail-metrics" aria-label="执行指标概览">
    <component
      :is="card.clickable ? 'button' : 'div'"
      v-for="card in cards"
      :key="card.key"
      class="metric"
      :class="{ 'is-clickable': card.clickable }"
      v-bind="card.clickable ? { type: 'button' } : {}"
      @click="card.clickable && card.onClick?.()"
    >
      <span class="metric__head">
        <span class="metric__label">{{ card.label }}</span>
        <span
          class="metric__icon"
          :style="{
            color: card.color,
            background: `color-mix(in srgb, ${card.color} 12%, transparent)`
          }"
        >
          <IconifyIconOnline :icon="card.icon" />
        </span>
      </span>
      <strong
        class="metric__value"
        :class="{
          'is-text': typeof card.value === 'string' && card.value.length > 6
        }"
        :title="String(card.value)"
      >
        {{ card.value }}
      </strong>
      <span class="metric__sub" :title="card.sub">{{ card.sub }}</span>
    </component>
  </section>
</template>

<style scoped lang="scss">
.detail-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px 16px;
  font: inherit;
  text-align: left;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;

  &.is-clickable {
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;

    &:hover {
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 4px 14px rgb(0 0 0 / 6%);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}

.metric__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.metric__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  border-radius: 8px;
}

.metric__value {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
  white-space: nowrap;

  &.is-text {
    font-size: 15px;
    line-height: 2;
    letter-spacing: 0;
  }
}

.metric__sub {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
</style>
