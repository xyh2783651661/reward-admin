<script setup lang="ts">
import { useDetailCopy } from "./useDetailCopy";

defineOptions({ name: "DetailCodeBlock" });

withDefaults(
  defineProps<{
    content?: string;
    /** 复制成功提示中使用的名称 */
    label?: string;
    maxHeight?: string;
    emptyText?: string;
  }>(),
  {
    content: "",
    label: "内容",
    maxHeight: "calc(100vh - 320px)",
    emptyText: "暂无内容"
  }
);

const { copyText } = useDetailCopy();
</script>

<template>
  <div class="detail-code">
    <el-empty
      v-if="!content.trim()"
      :description="emptyText"
      :image-size="60"
    />
    <template v-else>
      <el-button
        class="detail-code__copy"
        size="small"
        @click="copyText(content, label)"
      >
        复制
      </el-button>
      <el-scrollbar :max-height="maxHeight">
        <pre class="detail-code__pre">{{ content }}</pre>
      </el-scrollbar>
    </template>
  </div>
</template>

<style scoped>
.detail-code {
  position: relative;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.detail-code__copy {
  position: absolute;
  top: 8px;
  right: 14px;
  z-index: 1;
}

.detail-code__pre {
  padding: 16px;
  margin: 0;
  font-family:
    SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
