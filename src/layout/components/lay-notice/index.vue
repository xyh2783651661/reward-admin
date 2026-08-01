<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
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
import RefreshIcon from "~icons/ep/refresh";
import BackIcon from "~icons/ep/arrow-left";
import DoneIcon from "~icons/ep/check";

/** 未读轮询间隔，页面不可见时自动跳过 */
const POLL_INTERVAL = 60_000;

const { t } = useI18n();
const router = useRouter();

const loading = ref(false);
const actionLoading = ref(false);
const notices = ref<NoticeTabItem[]>([]);
const activeKey = ref("");
const generatedAt = ref("");

/** 抽屉：通知中心主体 */
const drawerVisible = ref(false);
/** 抽屉内二级视图：公告详情（不再叠加第二个抽屉） */
const detailItem = ref<NoticeListItem | null>(null);
const detailLoading = ref(false);
const detailData = ref<Record<string, any> | null>(null);

/** 列表筛选 */
const keyword = ref("");
const unreadOnly = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

// 未读数统一从 notices 现算：右上角 badge、概要、分段计数全部同源，
// 避免旧实现里 getUnreadCount 与 getNoticePanel 双数据源之间偏差导致的对不上问题。
const noticesNum = computed(() =>
  notices.value.reduce((sum, tab) => sum + countTabUnread(tab), 0)
);

const totalNum = computed(() =>
  notices.value.reduce((total, tab) => total + tab.list.length, 0)
);

const activeTab = computed(() =>
  notices.value.find(item => item.key === activeKey.value)
);

/** 分段控件选项，标题上直接带未读数 */
const segmentOptions = computed(() =>
  notices.value.map(tab => {
    const unread = countTabUnread(tab);
    return {
      value: tab.key,
      label: unread > 0 ? `${tab.name} ${unread}` : tab.name
    };
  })
);

/** 当前 tab 经「只看未读 + 关键字」过滤后的列表 */
const filteredList = computed(() => {
  const list = activeTab.value?.list ?? [];
  const kw = keyword.value.trim().toLowerCase();

  return list.filter(item => {
    if (unreadOnly.value && item.read !== false) return false;
    if (!kw) return true;
    return (
      String(item.title ?? "")
        .toLowerCase()
        .includes(kw) ||
      String(item.description ?? "")
        .toLowerCase()
        .includes(kw)
    );
  });
});

const hasFilter = computed(
  () => unreadOnly.value || keyword.value.trim() !== ""
);

/** 过滤后为空时的文案，区分「本身没有」和「被筛掉了」 */
const emptyText = computed(() => {
  if (hasFilter.value) return "没有符合筛选条件的通知";
  return activeTab.value?.emptyText || t("status.pureNoMessage");
});

/** 详情视图里当前公告在列表中的位置，用于上一条/下一条 */
const detailIndex = computed(() => {
  if (!detailItem.value) return -1;
  const key = getNoticeKey(detailItem.value);
  return filteredList.value.findIndex(item => getNoticeKey(item) === key);
});

const canPrevDetail = computed(() => detailIndex.value > 0);
const canNextDetail = computed(
  () =>
    detailIndex.value >= 0 && detailIndex.value < filteredList.value.length - 1
);

function countTabUnread(tab: NoticeTabItem) {
  return tab.list.filter(item => item.read === false).length;
}

function getNoticeKey(item: NoticeListItem) {
  return `${item.type}:${String(item.noticeId ?? item.id)}`;
}

function getNoticeReadId(item: NoticeListItem) {
  if (item.noticeId) return item.noticeId;

  const fallbackId = String(item.id);
  const matchedId = fallbackId.match(/\d+$/)?.[0];
  return matchedId ?? item.id;
}

async function loadNotices(silent = false) {
  if (!silent) loading.value = true;
  try {
    const { data } = await getNoticePanel();
    const tabs = data.tabs ?? [];
    const hasActiveKey = tabs.some(item => item.key === activeKey.value);

    notices.value = tabs;
    generatedAt.value = data.generatedAt ?? "";
    activeKey.value = hasActiveKey ? activeKey.value : (tabs[0]?.key ?? "");
  } catch (error) {
    console.error(error);
    if (!silent) message("加载通知中心失败", { type: "error" });
  } finally {
    if (!silent) loading.value = false;
  }
}

function openDrawer() {
  drawerVisible.value = true;
  closeDetail();
  loadNotices();
}

function handleDrawerClosed() {
  closeDetail();
  keyword.value = "";
  unreadOnly.value = false;
}

function updateNoticeRead(item: NoticeListItem) {
  const noticeKey = getNoticeKey(item);
  notices.value = notices.value.map(tab => ({
    ...tab,
    list: tab.list.map(notice =>
      getNoticeKey(notice) === noticeKey ? { ...notice, read: true } : notice
    )
  }));
}

async function handleMarkRead(item: NoticeListItem, silent = false) {
  if (item.read !== false) return;

  // 已读状态目前仅公告类（notify）由后端持久化，其余类型只做本地视觉同步
  if (item.type !== "notify") {
    updateNoticeRead(item);
    return;
  }

  try {
    await markNoticeRead(getNoticeReadId(item));
    updateNoticeRead(item);
    if (!silent) message("已标记为已读", { type: "success" });
  } catch (error) {
    console.error(error);
    if (!silent) message("标记已读失败", { type: "error" });
  }
}

async function handleMarkAllRead() {
  if (noticesNum.value === 0) return;

  actionLoading.value = true;
  try {
    const { data } = await markAllNoticeRead();
    const markedCount = typeof data === "number" ? data : noticesNum.value;
    message(`已标记 ${markedCount} 条通知为已读`, { type: "success" });
    // 以服务端为准回读，避免本地乐观置已读后刷新又变回未读
    await loadNotices(true);
  } catch (error) {
    console.error(error);
    message("全部已读失败", { type: "error" });
  } finally {
    actionLoading.value = false;
  }
}

function handleNoticeAction(item: NoticeListItem) {
  if (item.read === false) {
    handleMarkRead(item, true);
  }

  // 公告在抽屉内二级视图查看，其它类型带 path 的直接跳转并关闭抽屉
  if (item.type === "notify") {
    openNoticeDetail(item);
    return;
  }

  if (item.path) {
    drawerVisible.value = false;
    router.push(item.path);
  }
}

async function openNoticeDetail(item: NoticeListItem) {
  detailItem.value = item;
  detailLoading.value = true;
  detailData.value = null;
  try {
    const { data } = await getSysNoticeDetail(
      item.noticeId ?? getNoticeReadId(item)
    );
    detailData.value = data ?? null;
  } catch (error) {
    console.error(error);
    message("加载公告详情失败", { type: "error" });
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detailItem.value = null;
  detailData.value = null;
  detailLoading.value = false;
}

function goDetailStep(step: number) {
  const target = filteredList.value[detailIndex.value + step];
  if (!target) return;
  if (target.read === false) handleMarkRead(target, true);
  openNoticeDetail(target);
}

onMounted(() => {
  loadNotices(true);
  pollTimer = setInterval(() => {
    if (document.hidden || detailLoading.value) return;
    loadNotices(true);
  }, POLL_INTERVAL);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
});
</script>

<template>
  <button
    type="button"
    :class="[
      'notice-trigger',
      'navbar-bg-hover',
      'select-none',
      noticesNum !== 0 && 'mr-[10px]'
    ]"
    :aria-label="`通知中心，${noticesNum} 条未读`"
    @click="openDrawer"
  >
    <el-badge :value="noticesNum === 0 ? '' : noticesNum" :max="99">
      <span class="notice-trigger__icon">
        <IconifyIconOffline :icon="BellIcon" />
      </span>
    </el-badge>
  </button>

  <el-drawer
    v-model="drawerVisible"
    direction="rtl"
    size="440px"
    :with-header="false"
    class="notice-drawer"
    @closed="handleDrawerClosed"
  >
    <div class="notice-panel">
      <!-- ========== 一级视图：通知列表 ========== -->
      <template v-if="!detailItem">
        <header class="notice-panel__head">
          <div class="notice-panel__head-main">
            <h3 class="notice-panel__title">通知中心</h3>
            <p class="notice-panel__subtitle">
              <template v-if="totalNum">
                共 {{ totalNum }} 条<template v-if="noticesNum">
                  ·
                  <b class="notice-panel__unread">{{ noticesNum }} 条未读</b>
                </template>
              </template>
              <template v-else>{{ t("status.pureNoMessage") }}</template>
            </p>
          </div>
          <div class="notice-panel__head-actions">
            <el-tooltip content="刷新" placement="bottom">
              <el-button
                circle
                text
                size="small"
                :loading="loading"
                aria-label="刷新通知"
                @click="loadNotices()"
              >
                <IconifyIconOffline v-if="!loading" :icon="RefreshIcon" />
              </el-button>
            </el-tooltip>
            <el-button
              text
              size="small"
              type="primary"
              :loading="actionLoading"
              :disabled="noticesNum === 0"
              @click="handleMarkAllRead"
            >
              <IconifyIconOffline
                v-if="!actionLoading"
                :icon="DoneIcon"
                class="mr-[3px]"
              />
              全部已读
            </el-button>
            <el-button
              text
              size="small"
              aria-label="关闭"
              @click="drawerVisible = false"
            >
              关闭
            </el-button>
          </div>
        </header>

        <div v-if="notices.length" class="notice-panel__toolbar">
          <el-segmented
            v-model="activeKey"
            :options="segmentOptions"
            size="small"
            class="notice-panel__segmented"
          />
          <div class="notice-panel__filters">
            <el-input
              v-model="keyword"
              size="small"
              clearable
              placeholder="搜索标题或内容"
              class="notice-panel__search"
            />
            <el-checkbox v-model="unreadOnly" size="small" label="只看未读" />
          </div>
        </div>

        <div v-loading="loading" class="notice-panel__body">
          <el-empty
            v-if="notices.length === 0"
            :description="t('status.pureNoMessage')"
            :image-size="72"
          />
          <el-scrollbar v-else class="notice-panel__scroll">
            <div class="notice-panel__list">
              <NoticeList
                :list="filteredList"
                :emptyText="emptyText"
                @action="handleNoticeAction"
                @mark-read="handleMarkRead"
              />
            </div>
          </el-scrollbar>
        </div>

        <footer v-if="generatedAt" class="notice-panel__foot">
          最近同步：{{ generatedAt }}
        </footer>
      </template>

      <!-- ========== 二级视图：公告详情（同抽屉内切换） ========== -->
      <template v-else>
        <header class="notice-panel__head is-detail">
          <el-button text size="small" @click="closeDetail">
            <IconifyIconOffline :icon="BackIcon" class="mr-[3px]" />
            返回列表
          </el-button>
          <div class="notice-panel__head-actions">
            <el-button
              text
              size="small"
              :disabled="!canPrevDetail"
              @click="goDetailStep(-1)"
            >
              上一条
            </el-button>
            <el-button
              text
              size="small"
              :disabled="!canNextDetail"
              @click="goDetailStep(1)"
            >
              下一条
            </el-button>
          </div>
        </header>

        <div v-loading="detailLoading" class="notice-panel__body is-detail">
          <el-scrollbar class="notice-panel__scroll">
            <article v-if="detailData" class="notice-detail">
              <h3 class="notice-detail__title">
                {{ detailData.title || detailItem.title }}
              </h3>
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
                <span v-if="detailData.publishTime">
                  发布时间：{{ detailData.publishTime }}
                </span>
                <span v-else-if="detailItem.datetime">
                  {{ detailItem.datetime }}
                </span>
              </div>
              <div class="notice-detail__content">
                {{ detailData.content || "暂无内容" }}
              </div>
            </article>
            <el-empty
              v-else-if="!detailLoading"
              description="暂无内容"
              :image-size="72"
            />
          </el-scrollbar>
        </div>
      </template>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.notice-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 48px;
  cursor: pointer;
  background: transparent;
  border: 0;

  .notice-trigger__icon {
    display: flex;
    font-size: 18px;
  }
}

.notice-drawer :deep(.el-drawer__body) {
  padding: 0;
  overflow: hidden;
}

.notice-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* ---------- 头部 ---------- */
.notice-panel__head {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &.is-detail {
    align-items: center;
  }
}

.notice-panel__head-main {
  min-width: 0;
}

.notice-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: var(--el-text-color-primary);
}

.notice-panel__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.notice-panel__unread {
  font-weight: 600;
  color: var(--el-color-danger);
}

.notice-panel__head-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
}

/* ---------- 工具栏 ---------- */
.notice-panel__toolbar {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notice-panel__segmented {
  width: 100%;
}

.notice-panel__filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.notice-panel__search {
  flex: 1;
  min-width: 0;
}

/* ---------- 列表 ---------- */
.notice-panel__body {
  flex: 1;
  min-height: 0;

  &.is-detail {
    padding: 0;
  }
}

.notice-panel__scroll {
  height: 100%;
}

.notice-panel__list {
  padding: 12px 14px 16px;
}

.notice-panel__foot {
  flex: 0 0 auto;
  padding: 10px 18px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-align: right;
  background: var(--el-fill-color-lighter);
  border-top: 1px solid var(--el-border-color-lighter);
}

/* ---------- 详情 ---------- */
.notice-detail {
  padding: 18px;
}

.notice-detail__title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.notice-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-bottom: 14px;
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notice-detail__content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
