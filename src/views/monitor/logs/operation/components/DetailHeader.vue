<script setup lang="ts">
import type { TaskLogDetail } from "@/api/logs";
import type {
  TaskLogStatusMeta,
  TaskLogTone,
  TaskLogTriggerMeta
} from "../status";
import { copyText, formatMs, formatTime, toneColor } from "../format";

export interface DetailNotice {
  tone: TaskLogTone;
  title: string;
  description: string;
}

defineProps<{
  detail: TaskLogDetail;
  statusMeta: TaskLogStatusMeta;
  triggerMeta: TaskLogTriggerMeta;
  notice: DetailNotice | null;
}>();

const NOTICE_ICONS: Record<TaskLogTone, string> = {
  success: "ri:checkbox-circle-fill",
  warning: "ri:error-warning-fill",
  danger: "ri:close-circle-fill",
  info: "ri:information-fill",
  primary: "ri:loader-4-line"
};
</script>

<template>
  <header
    class="detail-header"
    :style="{ '--tone': toneColor(statusMeta.tone) }"
  >
    <div class="detail-header__top">
      <div class="detail-header__title">
        <el-tooltip :content="statusMeta.description" placement="top">
          <span class="detail-header__status">
            <i aria-hidden="true" />
            {{ statusMeta.label }}
          </span>
        </el-tooltip>
        <h2>{{ detail.taskName || "未命名任务" }}</h2>
      </div>
      <div class="detail-header__tags">
        <el-tag
          v-if="detail.triggerType"
          :type="triggerMeta.tag"
          effect="plain"
          :title="triggerMeta.description"
        >
          {{ triggerMeta.label }}
        </el-tag>
        <el-tag v-if="detail.environment" type="info" effect="plain">
          {{ detail.environment }}
        </el-tag>
        <el-tag v-if="detail.retryCount" type="danger" effect="plain">
          已重试 {{ detail.retryCount }} 次
        </el-tag>
      </div>
    </div>

    <p v-if="detail.description" class="detail-header__desc">
      {{ detail.description }}
    </p>

    <dl class="detail-header__facts">
      <div>
        <dt>总耗时</dt>
        <dd class="is-strong">{{ formatMs(detail.timeCost) }}</dd>
      </div>
      <div>
        <dt>开始时间</dt>
        <dd>{{ formatTime(detail.startTime) }}</dd>
      </div>
      <div>
        <dt>结束时间</dt>
        <dd>{{ formatTime(detail.endTime) }}</dd>
      </div>
      <div>
        <dt>执行节点</dt>
        <dd>
          {{ detail.serverHost || "-" }}
          <span v-if="detail.serverIp" class="is-muted">
            {{ detail.serverIp }}
          </span>
        </dd>
      </div>
    </dl>

    <ul class="detail-header__codes">
      <li v-if="detail.classMethod">
        <span>调用方法</span>
        <code :title="detail.classMethod">{{ detail.classMethod }}</code>
        <el-button
          link
          type="primary"
          size="small"
          @click="copyText(detail.classMethod, '调用方法')"
        >
          复制
        </el-button>
      </li>
      <li v-if="detail.executionId">
        <span>执行 ID</span>
        <code :title="detail.executionId">{{ detail.executionId }}</code>
        <el-button
          link
          type="primary"
          size="small"
          @click="copyText(detail.executionId, '执行 ID')"
        >
          复制
        </el-button>
      </li>
    </ul>

    <div
      v-if="notice"
      class="detail-header__notice"
      :style="{ '--notice': toneColor(notice.tone) }"
      role="status"
    >
      <IconifyIconOnline :icon="NOTICE_ICONS[notice.tone]" />
      <div>
        <strong>{{ notice.title }}</strong>
        <span>{{ notice.description }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.detail-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 4px solid var(--tone);
  border-radius: 14px;
}

.detail-header__top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
}

.detail-header__title {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;

  h2 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
}

.detail-header__status {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: center;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tone);
  background: color-mix(in srgb, var(--tone) 12%, transparent);
  border-radius: 999px;

  i {
    width: 6px;
    height: 6px;
    background: var(--tone);
    border-radius: 50%;
  }
}

.detail-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-header__desc {
  margin: -6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.detail-header__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px 24px;
  margin: 0;

  dt {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 2px 0 0;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
    word-break: break-all;

    &.is-strong {
      font-size: 18px;
      font-weight: 600;
    }
  }

  .is-muted {
    margin-left: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.detail-header__codes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  margin: 0;
  list-style: none;
  background: var(--el-fill-color-light);
  border-radius: 10px;

  li {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
    font-size: 12px;
  }

  span {
    flex: none;
    width: 56px;
    color: var(--el-text-color-secondary);
  }

  code {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--el-font-family-mono, ui-monospace, monospace);
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
}

.detail-header__notice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: color-mix(in srgb, var(--notice) 10%, transparent);
  border-radius: 10px;

  > svg,
  > .iconify {
    flex: none;
    margin-top: 3px;
    font-size: 16px;
    color: var(--notice);
  }

  strong {
    margin-right: 8px;
    color: var(--notice);
  }
}

@media (width <= 640px) {
  .detail-header__title h2 {
    font-size: 17px;
  }
}
</style>
