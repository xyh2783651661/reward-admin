<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string;
}>();

const wrappedHtml = computed(() => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      padding: 24px 0;
      background: #f5f7fa;
    }

    .mail-paper {
      width: 600px;
      margin: 0 auto;
      padding: 24px 28px;
      background: #ffffff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      border-radius: 6px;
      font-family: Arial, sans-serif;
      color: #333;
      line-height: 1.6;
    }

    .mail-paper p {
      margin: 0 0 12px;
    }

    .mail-paper a {
      color: #2980b9;
      text-decoration: underline;
      cursor: pointer;
    }

    .mail-tip {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed #ddd;
      font-size: 12px;
      color: #999;
    }
  </style>

  <script>
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a');
      if (a && a.href) {
        e.preventDefault();
        window.top.open(a.href, '_blank');
      }
    });
  <\/script>
</head>
<body>
  <div class="mail-paper">
    ${props.content}
    <div class="mail-tip">
      提示：本内容为邮件预览，链接将在新窗口中打开
    </div>
  </div>
</body>
</html>
`;
});
</script>

<template>
  <div class="mail-reader">
    <iframe
      class="mail-iframe"
      :srcdoc="wrappedHtml"
      sandbox="allow-same-origin allow-popups allow-scripts"
    />
  </div>
</template>

<style scoped>
.mail-reader {
  padding: 20px;
  background: #eaecef;
}

.mail-iframe {
  width: 100%;
  height: 480px;
  background: transparent;
  border: none;
}
</style>
