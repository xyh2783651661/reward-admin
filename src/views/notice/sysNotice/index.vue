<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getNoticePanel } from "@/api/notice";
import { message } from "@/utils/message";
import type {
  NoticeListItem,
  NoticeTabItem
} from "@/layout/components/lay-notice/data";

defineOptions({
  name: "SystemNotice"
});

const router = useRouter();
const loading = ref(false);
const generatedAt = ref("");
const activeKey = ref<NoticeTabItem["key"]>("notify");
const tabs = ref<NoticeTabItem[]>([]);

const currentTab = computed(() => {
  return tabs.value.find(item => item.key === activeKey.value) ?? tabs.value[0];
});

const totalCount = computed(() => {
  return tabs.value.reduce((total, tab) => total + tab.list.length, 0);
});

const unreadCount = computed(() => {
  return tabs.value.reduce((total, tab) => {
    return total + tab.list.filter(item => item.read === false).length;
  }, 0);
});

function getTabTypeLabel(key: NoticeTabItem["key"]) {
  if (key === "notify") return "通知";
  if (key === "message") return "消息";
  return "待办";
}

function getTabDescription(key: NoticeTabItem["key"]) {
  if (key === "notify") return "系统公告、配置同步和发布提醒都会汇总在这里。";
  if (key === "message") return "团队协作消息和关键反馈可以集中查看。";
  return "需要你尽快处理或确认的事项会在这里持续追踪。";
}

function openNotice(item: NoticeListItem) {
  if (item.path) {
    router.push(item.path);
  }
}

async function loadNotices() {
  loading.value = true;

  try {
    const { data } = await getNoticePanel();
    generatedAt.value = data?.generatedAt ?? "";
    tabs.value = data?.tabs ?? [];
    activeKey.value = data?.tabs?.[0]?.key ?? "notify";
  } catch (error) {
    console.error(error);
    message("加载通知中心失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadNotices();
});
</script>

<template>
  <div class="notice-page">
    <section v-loading="loading" class="notice-hero">
      <div class="notice-hero__content">
        <div>
          <p class="notice-hero__eyebrow">消息汇总中心</p>
          <h1 class="notice-hero__title">系统通知</h1>
          <p class="notice-hero__description">
            顶部铃铛里的通知、消息和待办在这里做完整展示，方便持续跟进。
          </p>
        </div>
        <div class="notice-hero__stats">
          <div class="notice-hero__stat">
            <span>总条数</span>
            <strong>{{ totalCount }}</strong>
          </div>
          <div class="notice-hero__stat">
            <span>未读数</span>
            <strong>{{ unreadCount }}</strong>
          </div>
          <div class="notice-hero__stat">
            <span>最近同步</span>
            <strong>{{ generatedAt || "--" }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="notice-summary">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="notice-summary__card"
        :class="{ 'is-active': activeKey === tab.key }"
        @click="activeKey = tab.key"
      >
        <span class="notice-summary__label">{{
          getTabTypeLabel(tab.key)
        }}</span>
        <strong class="notice-summary__value">{{ tab.list.length }}</strong>
        <span class="notice-summary__desc">{{
          getTabDescription(tab.key)
        }}</span>
      </button>
    </section>

    <section class="notice-panel">
      <div class="notice-panel__header">
        <div>
          <h2 class="notice-panel__title">
            {{ currentTab?.name || "通知列表" }}
          </h2>
          <p class="notice-panel__subtitle">
            {{ currentTab ? getTabDescription(currentTab.key) : "暂无消息" }}
          </p>
        </div>
        <el-tabs v-model="activeKey" class="notice-panel__tabs">
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.key"
            :label="`${tab.name} (${tab.list.length})`"
            :name="tab.key"
          />
        </el-tabs>
      </div>

      <div v-if="currentTab?.list?.length" class="notice-feed">
        <button
          v-for="item in currentTab.list"
          :key="item.id"
          type="button"
          class="notice-card"
          :class="{ 'is-unread': item.read === false, 'is-link': item.path }"
          @click="openNotice(item)"
        >
          <div class="notice-card__main">
            <div class="notice-card__title-row">
              <div class="notice-card__title-wrap">
                <span v-if="item.read === false" class="notice-card__dot" />
                <h3 class="notice-card__title">{{ item.title }}</h3>
              </div>
              <el-tag v-if="item.extra" :type="item.status" effect="light">
                {{ item.extra }}
              </el-tag>
            </div>
            <p class="notice-card__description">{{ item.description }}</p>
          </div>
          <div class="notice-card__meta">
            <span>{{ getTabTypeLabel(item.type) }}</span>
            <span>{{ item.datetime || "待处理" }}</span>
          </div>
        </button>
      </div>

      <el-empty
        v-else
        :description="currentTab?.emptyText || '暂无通知'"
        :image-size="90"
      />
    </section>
  </div>
</template>

<style lang="scss" scoped>
.notice-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
}

.notice-hero,
.notice-panel,
.notice-summary__card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 24px;
  box-shadow: 0 18px 44px rgb(15 23 42 / 8%);
}

.notice-hero {
  padding: 28px 32px;
  color: #eff6ff;
  background:
    radial-gradient(
      circle at top right,
      rgb(191 219 254 / 32%),
      transparent 30%
    ),
    linear-gradient(135deg, #172554 0%, #1d4ed8 52%, #0ea5e9 100%);

  .notice-hero__content {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .notice-hero__eyebrow {
    margin: 0 0 12px;
    font-size: 13px;
    letter-spacing: 0.08em;
    opacity: 0.88;
  }

  .notice-hero__title {
    margin: 0;
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 700;
  }

  .notice-hero__description {
    max-width: 720px;
    margin: 14px 0 0;
    font-size: 15px;
    line-height: 1.8;
    color: rgb(239 246 255 / 88%);
  }

  .notice-hero__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    min-width: 420px;
  }

  .notice-hero__stat {
    padding: 16px 18px;
    background: rgb(255 255 255 / 10%);
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 18px;
    backdrop-filter: blur(10px);

    span {
      display: block;
      font-size: 12px;
      color: rgb(219 234 254 / 84%);
    }

    strong {
      display: block;
      margin-top: 8px;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.4;
      word-break: break-word;
    }
  }
}

.notice-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.notice-summary__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  color: var(--el-text-color-primary);
  text-align: left;
  border-width: 1px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover,
  &.is-active {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 20px 36px rgb(59 130 246 / 10%);
    transform: translateY(-2px);
  }
}

.notice-summary__label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.notice-summary__value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.notice-summary__desc {
  font-size: 13px;
  line-height: 1.75;
  color: var(--el-text-color-secondary);
}

.notice-panel {
  padding: 24px;
}

.notice-panel__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.notice-panel__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.notice-panel__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--el-text-color-secondary);
}

.notice-panel__tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.notice-feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notice-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 18px 20px;
  text-align: left;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &.is-link {
    cursor: pointer;
  }

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 16px 32px rgb(15 23 42 / 8%);
    transform: translateY(-2px);
  }

  &.is-unread {
    background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
  }
}

.notice-card__main {
  flex: 1;
  min-width: 0;
}

.notice-card__title-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.notice-card__title-wrap {
  display: flex;
  flex: 1;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.notice-card__dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  background: var(--el-color-danger);
  border-radius: 50%;
}

.notice-card__title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.notice-card__description {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-secondary);
}

.notice-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 110px;
  font-size: 12px;
  color: #64748b;
  text-align: right;
}

@media (width <= 1280px) {
  .notice-summary {
    grid-template-columns: 1fr;
  }

  .notice-hero {
    .notice-hero__content {
      flex-direction: column;
    }

    .notice-hero__stats {
      width: 100%;
      min-width: 0;
    }
  }
}

@media (width <= 768px) {
  .notice-page {
    padding: 14px;
  }

  .notice-hero,
  .notice-panel {
    padding: 20px;
  }

  .notice-hero {
    .notice-hero__stats {
      grid-template-columns: 1fr;
    }
  }

  .notice-panel__header,
  .notice-card,
  .notice-card__title-row {
    flex-direction: column;
  }

  .notice-card__meta {
    min-width: 0;
    text-align: left;
  }
}
</style>
