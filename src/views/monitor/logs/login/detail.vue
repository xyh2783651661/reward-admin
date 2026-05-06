<script setup lang="ts">
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import type { MailPreviewMode, MailSendRecordItem } from "./types";

const props = defineProps<{
  record: MailSendRecordItem;
}>();

const activeTab = ref("preview");
const previewMode = ref<MailPreviewMode>("desktop");
const iframeRef = ref<HTMLIFrameElement | null>(null);
let disposePreviewBindings: null | (() => void) = null;

function splitAttachmentPaths(paths?: string) {
  if (!paths) return [];

  return paths
    .split(/[;\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function cleanupPreviewBindings() {
  disposePreviewBindings?.();
  disposePreviewBindings = null;
}

function sanitizePreviewDocument(doc: Document) {
  doc
    .querySelectorAll(
      "script, iframe, object, embed, meta[http-equiv='refresh']"
    )
    .forEach(node => node.remove());

  doc.querySelectorAll("*").forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();

      if (attributeName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        ["href", "src", "xlink:href", "formaction"].includes(attributeName) &&
        /^javascript:/i.test(attributeValue)
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

function buildPreviewDocument(content: string) {
  const normalizedContent = content?.trim() ?? "";

  if (!normalizedContent) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#fff;">
  <div style="color:#909399;text-align:center;">暂无邮件内容</div>
</body>
</html>
`;
  }

  const hasDocumentShell = /<!doctype|<html[\s>]|<body[\s>]|<head[\s>]/i.test(
    normalizedContent
  );
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    hasDocumentShell
      ? normalizedContent
      : `<!DOCTYPE html><html><head></head><body>${normalizedContent}</body></html>`,
    "text/html"
  );
  const { head, documentElement } = doc;

  sanitizePreviewDocument(doc);

  if (!head.querySelector("meta[charset]")) {
    const metaCharset = doc.createElement("meta");
    metaCharset.setAttribute("charset", "UTF-8");
    head.prepend(metaCharset);
  }

  if (!head.querySelector('meta[name="viewport"]')) {
    const metaViewport = doc.createElement("meta");
    metaViewport.setAttribute("name", "viewport");
    metaViewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0"
    );
    head.appendChild(metaViewport);
  }

  if (!head.querySelector('meta[name="color-scheme"]')) {
    const metaColorScheme = doc.createElement("meta");
    metaColorScheme.setAttribute("name", "color-scheme");
    metaColorScheme.setAttribute("content", "light only");
    head.appendChild(metaColorScheme);
  }

  if (!head.querySelector("base")) {
    const base = doc.createElement("base");
    base.setAttribute("target", "_blank");
    head.appendChild(base);
  }

  const helperStyle = doc.createElement("style");
  helperStyle.textContent = `
    html {
      background: transparent !important;
      color-scheme: light;
    }
    body {
      margin: 0;
      min-height: auto !important;
      background: transparent;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  `;
  head.appendChild(helperStyle);

  return `<!DOCTYPE html>\n${documentElement.outerHTML}`;
}

function getIframeHeight(doc: Document) {
  const docEl = doc.documentElement;
  const body = doc.body;

  return Math.max(
    docEl?.scrollHeight ?? 0,
    docEl?.offsetHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0
  );
}

const previewHtml = computed(() => buildPreviewDocument(props.record.content));
const previewWidth = computed(() => {
  return previewMode.value === "mobile" ? "390px" : "100%";
});
const attachmentPaths = computed(() =>
  splitAttachmentPaths(props.record.attachmentPaths)
);
const templateSummary = computed(() => {
  if (props.record.templateCode && props.record.type) {
    return `${props.record.templateCode} / ${props.record.type}`;
  }

  return props.record.templateCode || props.record.type || "-";
});
const statusType = computed(() => {
  switch (props.record.status) {
    case 1:
      return "success";
    case 2:
      return "danger";
    default:
      return "warning";
  }
});
const statusText = computed(() => {
  switch (props.record.status) {
    case 1:
      return "发送成功";
    case 2:
      return "发送失败";
    default:
      return "待发送";
  }
});

const resizeIframe = async () => {
  await nextTick();

  const iframe = iframeRef.value;
  const doc = iframe?.contentDocument;

  if (!iframe || !doc) return;

  iframe.style.height = `${getIframeHeight(doc)}px`;
};

function bindPreviewInteractions() {
  cleanupPreviewBindings();

  const iframe = iframeRef.value;
  const doc = iframe?.contentDocument;

  if (!iframe || !doc) return;

  const resize = () => {
    iframe.style.height = `${getIframeHeight(doc)}px`;
  };
  const handleClick = (event: Event) => {
    let currentElement = event.target as HTMLElement | null;

    while (currentElement && currentElement.tagName !== "A") {
      currentElement = currentElement.parentElement;
    }

    if (
      !(currentElement instanceof HTMLAnchorElement) ||
      !currentElement.href
    ) {
      return;
    }

    event.preventDefault();
    window.open(currentElement.href, "_blank", "noopener,noreferrer");
  };

  doc.addEventListener("click", handleClick, true);

  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;

  resizeObserver?.observe(doc.documentElement);

  if (doc.body) {
    resizeObserver?.observe(doc.body);
  }

  const removeImageListeners: Array<() => void> = [];
  Array.from(doc.images).forEach(image => {
    if (image.complete) return;

    image.addEventListener("load", resize);
    image.addEventListener("error", resize);
    removeImageListeners.push(() => {
      image.removeEventListener("load", resize);
      image.removeEventListener("error", resize);
    });
  });

  const timeoutIds = [0, 200, 800, 1600].map(timeout =>
    window.setTimeout(resize, timeout)
  );

  resize();

  disposePreviewBindings = () => {
    doc.removeEventListener("click", handleClick, true);
    resizeObserver?.disconnect();
    removeImageListeners.forEach(removeListener => removeListener());
    timeoutIds.forEach(timeoutId => window.clearTimeout(timeoutId));
  };
}

const handlePreviewLoad = async () => {
  await resizeIframe();
  bindPreviewInteractions();
};

const openInNewWindow = () => {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    message("浏览器拦截了新窗口，请允许弹窗后重试", {
      type: "warning"
    });
    return;
  }

  previewWindow.document.open();
  previewWindow.document.write(previewHtml.value);
  previewWindow.document.close();
};

onBeforeUnmount(() => {
  cleanupPreviewBindings();
});

const rawHtmlContent = computed(() => props.record.content || "");
</script>

<template>
  <div class="mail-detail-page">
    <div class="mail-toolbar">
      <div>
        <div class="mail-title">{{ props.record.subject || "无主题邮件" }}</div>
        <div class="mail-subtitle">
          预览会尽量保留原邮件结构，并按邮箱客户端习惯过滤脚本和危险跳转
        </div>
      </div>
      <div class="mail-actions">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="desktop">桌面预览</el-radio-button>
          <el-radio-button value="mobile">移动预览</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="openInNewWindow">新窗口预览</el-button>
      </div>
    </div>

    <el-descriptions :column="2" border class="mail-meta">
      <el-descriptions-item label="收件人">
        {{ props.record.recipient || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="抄送">
        {{ props.record.cc || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="statusType" effect="plain">{{ statusText }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="发送次数">
        {{ props.record.sendAttempts ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="发送时间">
        {{
          props.record.lastSendTime
            ? dayjs(props.record.lastSendTime).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="模板/类型">
        {{ templateSummary }}
      </el-descriptions-item>
      <el-descriptions-item label="优先级">
        {{ props.record.priority ?? "-" }}
      </el-descriptions-item>
      <el-descriptions-item :span="2" label="失败原因">
        {{ props.record.errorMessage || "-" }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="attachmentPaths.length"
        :span="2"
        label="附件路径"
      >
        <div class="attachment-list">
          <el-tag
            v-for="path in attachmentPaths"
            :key="path"
            size="small"
            effect="plain"
          >
            {{ path }}
          </el-tag>
        </div>
      </el-descriptions-item>
    </el-descriptions>

    <el-tabs v-model="activeTab" class="mail-tabs">
      <el-tab-pane label="邮件预览" name="preview">
        <div class="mail-preview-shell">
          <div class="mail-preview-note">
            这里会屏蔽脚本执行，并统一在新窗口打开链接，让查看效果更接近正式邮箱。
          </div>
          <div
            class="mail-frame-host"
            :class="[previewMode === 'mobile' ? 'is-mobile' : 'is-desktop']"
          >
            <iframe
              ref="iframeRef"
              :key="`${props.record.id ?? 'mail'}-${previewMode}`"
              class="mail-iframe"
              :style="{ width: previewWidth }"
              :srcdoc="previewHtml"
              sandbox="allow-same-origin allow-popups"
              @load="handlePreviewLoad"
            />
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="原始 HTML" name="source">
        <el-scrollbar max-height="calc(100vh - 320px)">
          <pre class="mail-source">{{ rawHtmlContent }}</pre>
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.mail-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mail-toolbar {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.mail-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.mail-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.mail-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mail-meta {
  background: var(--el-bg-color);
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mail-tabs {
  background: var(--el-bg-color);
}

.mail-preview-shell {
  padding: 20px;
  background:
    linear-gradient(
      180deg,
      rgb(246 248 251 / 96%),
      rgb(234 238 243 / 96%)
    ),
    radial-gradient(circle at top, rgb(64 158 255 / 8%), transparent 36%);
  border-radius: 12px;
}

.mail-preview-note {
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.mail-frame-host {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.mail-frame-host.is-mobile {
  padding: 8px 0;
}

.mail-iframe {
  min-height: 320px;
  background: #fff;
  border: none;
  border-radius: 12px;
  box-shadow:
    0 10px 30px rgb(15 23 42 / 8%),
    0 2px 8px rgb(15 23 42 / 6%);
}

.mail-source {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

@media (width <= 768px) {
  .mail-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .mail-actions {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .mail-preview-shell {
    padding: 12px;
  }
}
</style>
