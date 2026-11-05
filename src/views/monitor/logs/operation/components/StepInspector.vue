<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";
import ReJsonField from "@/components/ReJsonField/index.vue";
import { copyText, formatMs } from "../format";
import {
  actionType,
  batchItemLabel,
  formatMetaValue,
  hasExtraInfo,
  isLongValue,
  metaKeyLabel,
  stepSuccessRate,
  type StepEntry
} from "./step-utils";

const props = defineProps<{
  entry: StepEntry | null;
  timelineTotal: number;
  startTime?: string | null;
}>();

const step = computed(() => props.entry?.step ?? null);

const percentOfTotal = computed(() => {
  const cost = props.entry?.cost ?? 0;
  if (!cost || props.timelineTotal === 0) return 0;
  return Math.min(Math.round((cost / props.timelineTotal) * 100), 100);
});

/** 步骤对应的真实时钟时间，便于和其他系统日志对齐 */
const clockTime = computed(() => {
  if (!props.startTime || !props.entry) return null;
  return dayjs(props.startTime)
    .add(props.entry.offset, "millisecond")
    .format("HH:mm:ss.SSS");
});

const metadataEntries = computed(() =>
  Object.entries(step.value?.metadata ?? {})
);

const successRate = computed(() =>
  step.value ? stepSuccessRate(step.value) : 0
);

function copyStepJson() {
  if (step.value) copyText(JSON.stringify(step.value, null, 2), "步骤数据");
}
</script>

<template>
  <section class="inspector" aria-label="步骤详情">
    <template v-if="entry && step">
      <header class="inspector__head">
        <div class="inspector__title">
          <span class="inspector__no">步骤 {{ entry.index + 1 }}</span>
          <h3 :title="step.stepName">{{ step.stepName }}</h3>
        </div>
        <div class="inspector__badges">
          <el-tag :type="step.success ? 'success' : 'danger'" size="small">
            {{ step.success ? "成功" : "失败" }}
          </el-tag>
          <el-tag
            v-if="step.action"
            :type="actionType(step.action)"
            effect="plain"
            size="small"
          >
            {{ step.action }}
          </el-tag>
          <el-button link type="primary" size="small" @click="copyStepJson">
            复制数据
          </el-button>
        </div>
      </header>

      <dl class="inspector__timing">
        <div>
          <dt>耗时</dt>
          <dd>{{ formatMs(entry.cost) }}</dd>
        </div>
        <div>
          <dt>占总耗时</dt>
          <dd>{{ percentOfTotal }}%</dd>
        </div>
        <div>
          <dt>起始偏移</dt>
          <dd>T+{{ formatMs(entry.offset) }}</dd>
        </div>
        <div v-if="clockTime">
          <dt>约发生于</dt>
          <dd>{{ clockTime }}</dd>
        </div>
      </dl>
      <div class="bar" role="presentation">
        <span
          :class="{ 'is-fail': !step.success }"
          :style="{ width: `${percentOfTotal}%` }"
        />
      </div>

      <div v-if="step.errorMessage" class="inspector__error" role="alert">
        <IconifyIconOnline icon="ri:close-circle-fill" />
        <span>{{ step.errorMessage }}</span>
      </div>

      <section v-if="step.total != null" class="block">
        <h4>批处理结果</h4>
        <div class="cells">
          <div class="cell">
            <span>总数</span>
            <b>{{ step.total }}</b>
          </div>
          <div class="cell">
            <span>成功</span>
            <b class="is-success">{{ step.successCount ?? 0 }}</b>
          </div>
          <div class="cell">
            <span>失败</span>
            <b :class="{ 'is-danger': step.failedCount }">
              {{ step.failedCount ?? 0 }}
            </b>
          </div>
          <div class="cell">
            <span>跳过</span>
            <b class="is-muted">{{ step.skippedCount ?? 0 }}</b>
          </div>
          <div class="cell">
            <span>成功率</span>
            <b class="is-primary">{{ successRate }}%</b>
          </div>
        </div>
        <div class="bar" role="presentation">
          <span
            :class="step.failedCount ? 'is-warning' : 'is-success'"
            :style="{ width: `${successRate}%` }"
          />
        </div>
      </section>

      <section v-if="metadataEntries.length" class="block">
        <h4>步骤执行指标</h4>
        <div class="meta">
          <div
            v-for="[key, value] in metadataEntries"
            :key="key"
            class="meta__row"
            :class="{ 'is-block': isLongValue(value) }"
          >
            <span class="meta__key">{{ metaKeyLabel(key) }}</span>
            <ReJsonField
              v-if="isLongValue(value)"
              :data="value"
              readonly
              :deep="2"
              max-height="240px"
            />
            <span v-else class="meta__value">{{ formatMetaValue(value) }}</span>
          </div>
        </div>
      </section>

      <section v-if="step.failures?.length" class="block">
        <h4 class="is-danger">
          失败明细
          <small>{{ step.failures.length }} 条</small>
        </h4>
        <ul class="items is-danger">
          <li v-for="(item, i) in step.failures" :key="`f${i}`">
            {{ batchItemLabel(item) }}
          </li>
        </ul>
      </section>

      <section v-if="step.skips?.length" class="block">
        <h4>
          跳过明细
          <small>{{ step.skips.length }} 条</small>
        </h4>
        <ul class="items">
          <li v-for="(item, i) in step.skips" :key="`s${i}`">
            {{ batchItemLabel(item) }}
          </li>
        </ul>
      </section>

      <p v-if="!hasExtraInfo(step)" class="inspector__hint">
        该步骤未上报额外指标，仅记录了执行结果与耗时。
      </p>
    </template>

    <el-empty
      v-else
      :image-size="60"
      description="从左侧选择一个步骤查看详情"
    />
  </section>
</template>

<style scoped lang="scss">
.inspector {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px 20px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}

.inspector__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
}

.inspector__title {
  min-width: 0;

  h3 {
    margin: 2px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ra-font-md);
    font-weight: 600;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
}

.inspector__no {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.inspector__badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inspector__timing {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px 16px;
  margin: 0;

  dt {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-size: var(--ra-font-md);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }
}

.bar {
  height: 5px;
  overflow: hidden;
  background: var(--el-fill-color);
  border-radius: var(--ra-radius-pill);

  span {
    display: block;
    height: 100%;
    background: var(--el-color-primary);
    border-radius: inherit;

    &.is-fail {
      background: var(--el-color-danger);
    }

    &.is-success {
      background: var(--el-color-success);
    }

    &.is-warning {
      background: var(--el-color-warning);
    }
  }
}

.inspector__error {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 14px;
  font-size: var(--ra-font-sm);
  line-height: 1.6;
  color: var(--el-color-danger);
  word-break: break-word;
  background: color-mix(in srgb, var(--el-color-danger) 10%, transparent);
  border-radius: var(--ra-radius-lg);

  > svg,
  > .iconify {
    flex: none;
    margin-top: 3px;
  }
}

.block {
  display: flex;
  flex-direction: column;
  gap: 10px;

  h4 {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 0;
    font-size: var(--ra-font-sm);
    font-weight: 600;
    color: var(--el-text-color-primary);

    &.is-danger {
      color: var(--el-color-danger);
    }

    small {
      font-size: var(--ra-font-xs);
      font-weight: 400;
      color: var(--el-text-color-secondary);
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
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: var(--ra-radius-lg);

  span {
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  b {
    font-size: var(--ra-font-lg);
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

.meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);
}

.meta__row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 8px 12px;
  font-size: var(--ra-font-sm);

  & + & {
    border-top: 1px solid var(--el-border-color-extra-light);
  }

  &.is-block {
    flex-direction: column;
    gap: 6px;
  }
}

.meta__key {
  flex: none;
  min-width: 84px;
  color: var(--el-text-color-secondary);
}

.meta__value {
  min-width: 0;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  padding: 10px 14px;
  margin: 0;
  overflow: auto;
  font-size: var(--ra-font-sm);
  line-height: 1.6;
  color: var(--el-text-color-regular);
  list-style: none;
  background: var(--el-fill-color-light);
  border-radius: var(--ra-radius-lg);

  &.is-danger {
    color: var(--el-color-danger);
    background: color-mix(in srgb, var(--el-color-danger) 8%, transparent);
  }

  li {
    word-break: break-word;
  }
}

.inspector__hint {
  margin: 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-placeholder);
}
</style>
