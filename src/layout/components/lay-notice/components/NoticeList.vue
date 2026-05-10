<script setup lang="ts">
import { PropType } from "vue";
import type { NoticeListItem } from "../data";
import NoticeItem from "./NoticeItem.vue";
import { transformI18n } from "@/plugins/i18n";

defineEmits<{
  action: [item: NoticeListItem];
}>();

defineProps({
  list: {
    type: Array as PropType<Array<NoticeListItem>>,
    default: () => []
  },
  emptyText: {
    type: String,
    default: ""
  }
});
</script>

<template>
  <div v-if="list.length">
    <NoticeItem
      v-for="item in list"
      :key="item.id"
      :noticeItem="item"
      @action="$emit('action', item)"
    />
  </div>
  <el-empty v-else :description="transformI18n(emptyText)" />
</template>
