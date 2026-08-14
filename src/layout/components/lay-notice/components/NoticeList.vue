<script setup lang="ts">
import dayjs from "dayjs";
import { computed, PropType } from "vue";
import type { NoticeListItem } from "../data";
import NoticeItem from "./NoticeItem.vue";
import { transformI18n } from "@/plugins/i18n";

defineEmits<{
  action: [item: NoticeListItem];
  markRead: [item: NoticeListItem];
}>();

const props = defineProps({
  list: {
    type: Array as PropType<Array<NoticeListItem>>,
    default: () => []
  },
  emptyText: {
    type: String,
    default: ""
  }
});

const groupedList = computed(() => {
  const groups = new Map<string, NoticeListItem[]>();
  props.list.forEach(item => {
    const date = dayjs(item.datetime);
    let label = "更早";
    if (date.isValid()) {
      if (date.isSame(dayjs(), "day")) label = "今天";
      else if (date.isSame(dayjs().subtract(1, "day"), "day")) label = "昨天";
    }
    groups.set(label, [...(groups.get(label) || []), item]);
  });
  return ["今天", "昨天", "更早"]
    .map(label => ({ label, list: groups.get(label) || [] }))
    .filter(group => group.list.length > 0);
});
</script>

<template>
  <div v-if="list.length" class="notice-groups">
    <section
      v-for="group in groupedList"
      :key="group.label"
      class="notice-group"
    >
      <h4 class="notice-group__title">{{ group.label }}</h4>
      <NoticeItem
        v-for="item in group.list"
        :key="item.id"
        :noticeItem="item"
        @action="$emit('action', item)"
        @mark-read="$emit('markRead', item)"
      />
    </section>
  </div>
  <el-empty v-else :description="transformI18n(emptyText)" />
</template>

<style lang="scss" scoped>
.notice-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-group__title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 16px 6px;
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
}
</style>
