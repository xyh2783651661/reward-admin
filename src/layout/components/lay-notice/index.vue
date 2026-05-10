<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { computed, onMounted, ref } from "vue";
import { getNoticePanel } from "@/api/notice";
import { message } from "@/utils/message";
import type { NoticeListItem, NoticeTabItem } from "./data";
import NoticeList from "./components/NoticeList.vue";
import BellIcon from "~icons/ep/bell";

const { t } = useI18n();
const router = useRouter();
const loading = ref(false);
const notices = ref<NoticeTabItem[]>([]);
const activeKey = ref("");
const noticesNum = computed(() => {
  return notices.value.reduce((total, tab) => {
    return total + tab.list.filter(item => item.read === false).length;
  }, 0);
});

async function loadNotices() {
  loading.value = true;
  try {
    const { data } = await getNoticePanel();
    notices.value = data.tabs ?? [];
    activeKey.value = data.tabs?.[0]?.key ?? "";
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

function handleNoticeAction(item: NoticeListItem) {
  if (item.path) {
    router.push(item.path);
  }
}

function getLabel(item: NoticeTabItem) {
  return item.name + (item.list.length > 0 ? `(${item.list.length})` : "");
}

onMounted(() => {
  loadNotices();
});
</script>

<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
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
      <el-dropdown-menu>
        <el-tabs
          v-model="activeKey"
          v-loading="loading"
          :stretch="true"
          class="dropdown-tabs"
          :style="{ width: notices.length === 0 ? '200px' : '330px' }"
        >
          <el-empty
            v-if="notices.length === 0"
            :description="t('status.pureNoMessage')"
            :image-size="60"
          />
          <span v-else>
            <template v-for="item in notices" :key="item.key">
              <el-tab-pane :label="getLabel(item)" :name="`${item.key}`">
                <el-scrollbar max-height="330px">
                  <div class="noticeList-container">
                    <NoticeList
                      :list="item.list"
                      :emptyText="item.emptyText"
                      @action="handleNoticeAction"
                    />
                  </div>
                </el-scrollbar>
              </el-tab-pane>
            </template>
          </span>
        </el-tabs>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
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

.dropdown-tabs {
  .noticeList-container {
    padding: 15px 24px 0;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 36px;
  }
}
</style>
