<script setup lang="ts">
import { computed } from "vue";
import {
  DetailCodeBlock,
  DetailHeader,
  DetailPage,
  DetailSection
} from "@/components/ReDetail";

defineOptions({
  name: "CacheDetail"
});

const props = defineProps<{
  data: any;
  cacheKey: string;
}>();

const content = computed(() => {
  const val = props.data;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
});
</script>

<template>
  <DetailPage>
    <DetailHeader title="缓存详情">
      <template #subtitle>{{ cacheKey || "-" }}</template>
    </DetailHeader>
    <DetailSection title="缓存值" flush>
      <DetailCodeBlock
        :content="content"
        label="缓存值"
        max-height="calc(100vh - 360px)"
      />
    </DetailSection>
  </DetailPage>
</template>
