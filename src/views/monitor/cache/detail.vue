<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  data: any;
  cacheKey: string;
}>();

const jsonStr = ref("");

watch(
  () => props.data,
  val => {
    try {
      jsonStr.value =
        typeof val === "string" ? val : JSON.stringify(val, null, 2);
    } catch {
      jsonStr.value = String(val);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="p-4">
    <el-input
      v-model="jsonStr"
      type="textarea"
      :autosize="{ minRows: 6, maxRows: 24 }"
      readonly
    />
  </div>
</template>
