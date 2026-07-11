<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { computed, onMounted, ref } from "vue";
import {
  getNoticePanel,
  getSysNoticeDetail,
  markAllNoticeRead,
  markNoticeRead
} from "@/api/notice";
import { message } from "@/utils/message";
import type { NoticeListItem, NoticeTabItem } from "./data";
import NoticeList from "./components/NoticeList.vue";
import BellIcon from "~icons/ep/bell";

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);
const actionLoading = ref(false);
const notices = ref<NoticeTabItem[]>([]);
const activeKey = ref("");
const generatedAt = ref("");
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailData = ref<Record<string, any> | null>(null);

// 未读数统一从 notices 现算：右上角 badge、subtitle、tab 小红点全部同源，
// 避免旧实现里 getUnreadCount 与 getNoticePanel 双数据源之间偏差导致的对不上问题。
const noticesNum = computed(() =>
  notices.value.reduce(
    (sum, tab) => sum + tab.list.filter(item => item.read === false).length,
    0
  )
);

const totalNum = computed(() => {
  return notices.value.reduce((total, tab) => total + tab.list.length, 0);
});

const activeTab = computed(() => {
  return notices.value.find(item => item.key === activeKey.value);
});

const panelWidth = computed(() =>
  notices.value.length === 0 ? "260px" : "420px"
);

function countTabUnread(tab: NoticeTabItem) {
  return tab.list.filter(item => item.read === false).length;
}

function getNoticeKey(item: NoticeListItem) {
  return String(item.noticeId ?? item.id);
}

function getNoticeReadId(item: NoticeListItem) {
  if (item.noticeId) return item.noticeId;

  const fallbackId = String(item.id);
  const matchedId = fallbackId.match(/\d+$/)?.[0];
  return matchedId ?? item.id;
}

async function loadNotices() {
  loading.value = true;
  try {
    const { data } = await getNoticePanel();
    const tabs = data.tabs ?? [];
    const hasActiveKey = tabs.some(item => item.key === activeKey.value);

    notices.value = tabs;
    generatedAt.value = data.generatedAt ?? "";
    activeKey.value = hasActiveKey ? activeKey.value : (tabs[0]?.key ?? "");
  } catch (error) {
    console.error(error);
    message("加载通知中心失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function handleVisibleChange(visible: boolean) {
  if (visible) {
    loadNotices();
  }
}

function updateNoticeRead(item: NoticeListItem) {
  const noticeKey = getNoticeKey(item);
  notices.value = notices.value.map(tab => ({
    ...tab,
    list: tab.list.map(notice =>
      notice.type === item.type && getNoticeKey(notice) === noticeKey
        ? { ...notice, read: true }
        : notice
    )
  }));
}

function updateAllRead() {
  notices.value = notices.value.map(tab => ({
    ...tab,
    list: tab.list.map(item => ({ ...item, read: true }))
  }));
}

async function handleMarkRead(item: NoticeListItem, silent = false) {
  if (item.read !== false) return;

  try {
    if (item.type === "notify") {
      await markNoticeRead(getNoticeReadId(item));
    }
    updateNoticeRead(item);
    if (!silent) {
      message("已标记为已读", { type: "success" });
    }
  } catch (error) {
    console.error(error);
    if (!silent) {
      message("标记已读失败", { type: "error" });
    }
  }
}

async function handleMarkAllRead() {
  if (noticesNum.value === 0) return;

  actionLoading.value = true;
  try {
    const { data } = await markAllNoticeRead();
    const markedCount = typeof data === "number" ? data : noticesNum.value;
    updateAllRead();
    message(`已标记 ${markedCount} 条通知为已读`, { type: "success" });
  } catch (error) {
    console.error(error);
    message("全部已读失败", { type: "error" });
  } finally {
    actionLoading.value = false;
  }
}

function handleNoticeAction(item: NoticeListItem) {
  if (item.type === "notify") {
    if (item.read === false) {
      handleMarkRead(item, true);
    }
    openNoticeDetail(item);
    return;
  }

  if (item.path) {
    router.push(item.path);
  }
}

async function openNoticeDetail(item: NoticeListItem) {
  const noticeId = item.noticeId ?? getNoticeReadId(item);
  detailVisible.value = true;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const { data } = await getSysNoticeDetail(noticeId);
    detailData.value = data ?? null;
  } catch (error) {
    console.error(error);
    message("加载公告详情失败", { type: "error" });
  } finally {
    detailLoading.value = false;
  }
}

onMounted(() => {
  loadNotices();
});
</script>

<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    :hide-on-click="false"
    @visible-change="handleVisibleChange"
  >
    <span
      :class="[
        'dropdown-badge',
        'navbar-bg-hover',
        'select-none',
        Number(noticesNum) !== 0 && 'mr-[10px]'
      ]"
    >
      <el-badge :value="Number(noticesNum) === 0 ? '' : noticesNum" :max="99">
        <span class="header-notice-icon">
          <IconifyIconOffline :icon="BellIcon" />
        </span>
      </el-badge>
    </span>
    <template #dropdown>
      <el-dropdown-menu class="notice-dropdown-menu">
        <section class="notice-panel" :style="{ width: panelWidth }">
          <header class="notice-panel-header">
            <div>
              <div class="notice-panel-title">通知中心</div>
              <div class="notice-panel-subtitle">
                <template v-if="totalNum">
                  共 {{ totalNum }} 条，{{ noticesNum }} 条未读
                </template>
                <template v-else>{{ t("status.pureNoMessage") }}</template>
              </div>
            </div>
            <div class="notice-panel-actions">
              <el-button
                text
                size="small"
                :loading="loading"
                @click.stop="loadNotices"
              >
                刷新
              </el-button>
              <el-button
                text
                size="small"
                type="primary"
                :loading="actionLoading"
                :disabled="noticesNum === 0"
                @click.stop="handleMarkAllRead"
              >
                全部已读
              </el-button>
            </div>
          </header>

          <el-tabs
            v-model="activeKey"
            v-loading="loading"
            :stretch="true"
            class="dropdown-tabs"
          >
            <el-empty
              v-if="notices.length === 0"
              :description="t('status.pureNoMessage')"
              :image-size="68"
            />
            <template v-else>
              <el-tab-pane
                v-for="item in notices"
                :key="item.key"
                :name="item.key"
              >
                <template #label>
                  <span class="notice-tab-label">
                    {{ item.name }}
                    <span v-if="countTabUnread(item)" class="notice-tab-badge">
                      {{ countTabUnread(item) }}
                    </span>
                  </span>
                </template>
                <el-scrollbar max-height="380px">
                  <div class="notice-list-container">
                    <NoticeList
                      :list="item.list"
                      :emptyText="item.emptyText"
                      @action="handleNoticeAction"
                      @mark-read="handleMarkRead"
                    />
                  </div>
                </el-scrollbar>
              </el-tab-pane>
            </template>
          </el-tabs>

          <footer v-if="activeTab" class="notice-panel-footer">
            <span v-if="generatedAt">最近同步：{{ generatedAt }}</span>
            <span v-else>{{ activeTab.emptyText }}</span>
          </footer>
        </section>
      </el-dropdown-menu>
    </template>
  </el-dropdown>

  <el-drawer
    v-model="detailVisible"
    title="公告详情"
    direction="rtl"
    size="480px"
  >
    <div v-loading="detailLoading" class="notice-detail">
      <template v-if="detailData">
        <h3 class="notice-detail__title">{{ detailData.title }}</h3>
        <div class="notice-detail__meta">
          <el-tag
            v-if="
              typeof detailData.priority === 'number' &&
              detailData.priority >= 8
            "
            type="danger"
            size="small"
            effect="light"
          >
            高优先级
          </el-tag>
          <span v-if="detailData.publishTime" class="notice-detail__time">
            发布时间：{{ detailData.publishTime }}
          </span>
        </div>
        <div class="notice-detail__content">{{ detailData.content }}</div>
      </template>
      <el-empty v-else-if="!detailLoading" description="暂无内容" />
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.dropdown-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 48px;
  cursor: pointer;

  .header-notice-icon {
    font-size: 18px;
  }
}

.notice-dropdown-menu {
  padding: 0;
}

.notice-panel {
  overflow: hidden;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
}

.notice-panel-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 18px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notice-panel-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: var(--el-text-color-primary);
}

.notice-panel-subtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.notice-panel-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
}

.dropdown-tabs {
  min-height: 190px;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 18px;
  }

  :deep(.el-tabs__item) {
    height: 46px;
  }
}

.notice-tab-label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.notice-tab-badge {
  min-width: 18px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 18px;
  color: var(--el-color-danger);
  text-align: center;
  background: var(--el-color-danger-light-9);
  border-radius: 999px;
}

.notice-list-container {
  padding: 12px 14px 14px;
}

.notice-panel-footer {
  padding: 10px 18px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-align: right;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-lighter);
}

.notice-detail {
  padding: 4px 20px 20px;
}

.notice-detail__title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.notice-detail__meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.notice-detail__content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
