<script setup lang="ts">
import { computed } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps<{
  exception: string;
}>();

/**
 * 判断是否为合法 JSON 字符串
 */
const isJson = computed(() => {
  if (!props.exception) return false;
  try {
    JSON.parse(props.exception);
    return true;
  } catch {
    return false;
  }
});

/**
 * 解析后的 JSON 数据
 */
const jsonData = computed(() => {
  if (!isJson.value) return null;
  return JSON.parse(props.exception);
});
</script>

<template>
  <div class="exception-viewer">
    <!-- JSON 异常 -->
    <vue-json-pretty
      v-if="isJson"
      :data="jsonData"
      :deep="4"
      :showLength="true"
      :showLine="true"
    />

    <!-- 普通文本异常 -->
    <pre v-else class="plain-text"
      >{{ exception }}
    </pre>
  </div>
</template>

<style scoped>
.exception-viewer {
  width: 100%;
  max-height: 400px;
  overflow: auto;
}

.plain-text {
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #f5f5f5;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 6px;
}
</style>
