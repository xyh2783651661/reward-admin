<script setup lang="ts">
import dayjs from "dayjs";
import { computed } from "vue";
import type { WorkbenchFocusItem, WorkbenchHeadline } from "@/api/workbench";

const props = defineProps<{
  greeting: string;
  displayName: string;
  headline: WorkbenchHeadline;
  focusItems: WorkbenchFocusItem[];
  status: "up" | "warn" | "down";
  statusText: string;
  updatedAt: string;
  refreshing: boolean;
}>();

defineEmits<{ refresh: [] }>();

const weekNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const today = computed(() => {
  const now = dayjs();
  return `${now.format("M月D日")} ${weekNames[now.day()]}`;
});
const statusIcon = computed(() => {
  if (props.status === "down") return "ri:close-circle-fill";
  if (props.status === "warn") return "ri:error-warning-fill";
  return "ri:checkbox-circle-fill";
});
</script>

<template>
  <header class="hero">
    <div class="hero__main">
      <p class="hero__greeting">
        {{ greeting }}，{{ displayName }}
        <span class="hero__date">{{ today }}</span>
      </p>
      <h1 class="hero__title">{{ headline.title || "运营工作台" }}</h1>
      <p class="hero__desc">
        {{ headline.description || "优先处理风险与待办，再查看业务表现。" }}
      </p>
      <ul v-if="focusItems.length" class="hero__focus" aria-label="重点信息">
        <li v-for="item in focusItems" :key="item.label" :class="item.type">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </li>
      </ul>
    </div>

    <div class="hero__aside">
      <div class="hero__status" :class="`is-${status}`">
        <IconifyIconOnline :icon="statusIcon" />
        <div>
          <strong>{{ statusText }}</strong>
          <span>更新于 {{ updatedAt }}</span>
        </div>
      </div>
      <el-button :loading="refreshing" round @click="$emit('refresh')">
        <IconifyIconOnline icon="ri:refresh-line" class="mr-1" />
        刷新数据
      </el-button>
    </div>
  </header>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 100% 0%,
      var(--el-color-primary-light-8) 0%,
      transparent 55%
    ),
    linear-gradient(
      120deg,
      var(--el-color-primary-light-9) 0%,
      var(--el-bg-color-overlay) 70%
    );
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
}

.hero__main {
  min-width: 0;
}

.hero__greeting {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.hero__date {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 999px;
}

.hero__title {
  margin: 8px 0 6px;
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 700;
  line-height: 1.25;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.hero__desc {
  max-width: 640px;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.hero__focus {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 16px 0 0;
  list-style: none;

  li {
    display: inline-flex;
    gap: 8px;
    align-items: baseline;
    padding: 5px 12px;
    font-size: 12px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 999px;
  }

  span {
    color: var(--el-text-color-secondary);
  }

  strong {
    font-size: 13px;
    color: var(--el-text-color-primary);
  }

  .danger strong {
    color: var(--el-color-danger);
  }

  .warning strong {
    color: var(--el-color-warning);
  }

  .success strong {
    color: var(--el-color-success);
  }
}

.hero__aside {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.hero__status {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 220px;
  padding: 12px 16px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;

  > svg,
  > .iconify {
    font-size: 30px;
    color: var(--el-color-success);
  }

  strong {
    display: block;
    font-size: 15px;
    color: var(--el-text-color-primary);
  }

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &.is-warn > svg,
  &.is-warn > .iconify {
    color: var(--el-color-warning);
  }

  &.is-down > svg,
  &.is-down > .iconify {
    color: var(--el-color-danger);
  }
}

@media (width <= 900px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
    padding: 20px;
  }

  .hero__aside {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .hero__status {
    flex: 1;
    min-width: 0;
  }
}
</style>
