<script setup lang="ts">
import { computed, type Component } from "vue";
import type { NoticeListItem, NoticeTabKey } from "../data";
import TimeLine from "~icons/ri/time-line";
import Message3Line from "~icons/ri/message-3-line";
import Notification3Line from "~icons/ri/notification-3-line";
import CheckboxCircleLine from "~icons/ri/checkbox-circle-line";

const props = defineProps<{
  noticeItem: NoticeListItem;
}>();

const emit = defineEmits<{
  action: [item: NoticeListItem];
  markRead: [item: NoticeListItem];
}>();

const typeMetaMap: Record<
  NoticeTabKey,
  { icon: Component; className: string }
> = {
  notify: {
    icon: Notification3Line,
    className: "is-notify"
  },
  message: {
    icon: Message3Line,
    className: "is-message"
  },
  todo: {
    icon: CheckboxCircleLine,
    className: "is-todo"
  }
};

const isUnread = computed(() => props.noticeItem.read === false);
const isActionable = computed(() => Boolean(props.noticeItem.path));
const typeMeta = computed(
  () => typeMetaMap[props.noticeItem.type] ?? typeMetaMap.notify
);

function handleAction() {
  emit("action", props.noticeItem);
}

function handleMarkRead() {
  emit("markRead", props.noticeItem);
}
</script>

<template>
  <article
    class="notice-container"
    :class="[
      isUnread && 'is-unread',
      isActionable && 'is-actionable',
      typeMeta.className
    ]"
    @click="handleAction"
  >
    <div class="notice-icon-wrap">
      <el-avatar
        v-if="noticeItem.avatar"
        :size="36"
        :src="noticeItem.avatar"
        class="notice-avatar"
      />
      <span v-else class="notice-type-icon">
        <IconifyIconOffline :icon="typeMeta.icon" />
      </span>
      <span v-if="isUnread" class="notice-unread-dot" />
    </div>

    <div class="notice-content">
      <div class="notice-header">
        <div class="notice-title-group">
          <span class="notice-title">{{ noticeItem.title }}</span>
          <span v-if="isUnread" class="notice-unread-label">未读</span>
        </div>
        <el-tag
          v-if="noticeItem.extra"
          :type="noticeItem.status"
          size="small"
          effect="light"
          round
          class="notice-extra"
        >
          {{ noticeItem.extra }}
        </el-tag>
      </div>

      <p class="notice-description">
        {{ noticeItem.description || "暂无描述" }}
      </p>

      <div class="notice-footer">
        <span class="notice-time">
          <IconifyIconOffline :icon="TimeLine" />
          {{ noticeItem.datetime || "刚刚" }}
        </span>
        <div class="notice-actions">
          <template v-if="noticeItem.type === 'notify'">
            <button
              v-if="isUnread"
              type="button"
              class="notice-link-button"
              @click.stop="handleMarkRead"
            >
              标为已读
            </button>
            <span v-else class="notice-read-state">已读</span>
          </template>
          <span v-if="isActionable" class="notice-open-link">
            {{ noticeItem.actionText || "查看详情" }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.notice-container {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 14px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:not(:last-child) {
    margin-bottom: 8px;
  }

  &.is-unread {
    background: rgb(64 158 255 / 7%);
    border-color: rgb(64 158 255 / 14%);
  }

  &.is-actionable {
    cursor: pointer;
  }

  &.is-actionable:hover {
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color);
    transform: translateY(-1px);
  }
}

.notice-icon-wrap {
  position: relative;
  flex: 0 0 auto;
}

.notice-avatar,
.notice-type-icon {
  box-shadow: 0 6px 18px rgb(0 0 0 / 8%);
}

.notice-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 12px;
}

.is-message .notice-type-icon {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.is-todo .notice-type-icon {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.notice-unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  background: var(--el-color-danger);
  border: 2px solid var(--el-bg-color-overlay);
  border-radius: 50%;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-header,
.notice-footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.notice-title-group {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.notice-title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.notice-unread-label {
  flex: 0 0 auto;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 16px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 999px;
}

.notice-extra {
  flex: 0 0 auto;
}

.notice-description {
  display: -webkit-box;
  margin: 6px 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  -webkit-box-orient: vertical;
}

.notice-time,
.notice-read-state,
.notice-open-link,
.notice-link-button {
  font-size: 12px;
  line-height: 18px;
}

.notice-time {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  color: var(--el-text-color-secondary);
}

.notice-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.notice-link-button {
  padding: 0;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.notice-link-button:hover,
.notice-open-link {
  color: var(--el-color-primary);
}

.notice-read-state {
  color: var(--el-text-color-placeholder);
}

.notice-open-link::after {
  margin-left: 2px;
  content: "›";
}
</style>
