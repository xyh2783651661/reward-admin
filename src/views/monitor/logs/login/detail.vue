<script setup lang="ts">
import { computed, ref, nextTick } from "vue";

const props = defineProps<{
  /** 后端生成的完整 HTML 邮件内容（body 内） */
  content: string;
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);

/**
 * 包装一层“预览壳”，不美化邮件，只提供背景 & 宽度约束
 */
const wrappedHtml = computed(() => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    body {
      margin: 0;
      padding: 12px;
      background: #f5f7fa;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    }
    .mail-preview {
      max-width: 680px;
      margin: 0 auto;
    }
    a {
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="mail-preview">
    ${props.content}
  </div>

  <script>
    (function () {
      document.addEventListener('click', function (e) {
        var target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        if (target && target.tagName === 'A' && target.href) {
          e.preventDefault();
          window.open(target.href, '_blank');
        }
      }, true);
    })();
  <\/script>
</body>
</html>
`;
});

/**
 * 自动调整 iframe 高度，避免内容被截断
 */
const resizeIframe = async () => {
  await nextTick();

  const iframe = iframeRef.value;
  if (!iframe) return;

  const doc = iframe.contentDocument;
  if (!doc) return;

  iframe.style.height = doc.body.scrollHeight + "px";
};
</script>

<template>
  <div class="mail-preview-wrapper">
    <iframe
      ref="iframeRef"
      class="mail-iframe"
      :srcdoc="wrappedHtml"
      sandbox="allow-same-origin allow-popups allow-scripts"
      @load="resizeIframe"
    />
  </div>
</template>

<style scoped>
.mail-preview-wrapper {
  padding: 16px;
  background: #eaecef;
}

.mail-iframe {
  width: 100%;
  background: transparent;
  border: none;
}
</style>
