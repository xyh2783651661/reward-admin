<script setup lang="ts">
import { computed } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps<{
  exception?: string;
  detail?: string;
}>();

function parseJson(value?: string) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * 判断是否为合法 JSON 字符串
 */
const isJson = computed(() => {
  return parseJson(props.exception) !== null;
});

/**
 * 解析后的 JSON 数据
 */
const jsonData = computed(() => {
  return parseJson(props.exception);
});

const detailData = computed(() => parseJson(props.detail));
</script>

<template>
  <div class="exception-viewer">
    <el-alert
      v-if="detailData"
      title="执行步骤详情"
      type="info"
      show-icon
      :closable="false"
      class="mb-3"
    />
    <vue-json-pretty
      v-if="detailData"
      :data="detailData"
      :deep="4"
      :showLength="true"
      :showLine="true"
      class="mb-4"
    />

    <el-alert
      v-if="exception"
      title="异常信息"
      type="error"
      show-icon
      :closable="false"
      class="mb-3"
    />
    <!-- JSON 异常 -->
    <vue-json-pretty
      v-if="exception && isJson"
      :data="jsonData"
      :deep="4"
      :showLength="true"
      :showLine="true"
    />

    <!-- 普通文本异常 -->
    <pre v-else-if="exception" class="plain-text">{{ exception }}</pre>
    <el-empty v-else-if="!detailData" description="暂无执行详情" />
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
