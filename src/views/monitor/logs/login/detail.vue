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
const statusType = computed(() => {
  switch (props.record.status) {
    case 1:
      return "success";
    case 2:
      return "danger";
    case 3:
    case 4:
      return "warning";
    case 5:
    case 6:
      return "info";
    default:
      return "info";
  }
});
const statusText = computed(() => {
  switch (props.record.status) {
    case 0:
      return "待发送";
    case 1:
      return "成功";
    case 2:
      return "失败";
    case 3:
      return "发送中";
    case 4:
      return "重试中";
    case 5:
      return "已取消";
    case 6:
      return "状态未知";
    default:
      return "未知";
  }
});
const mqStatusType = computed(() => {
  switch (props.record.mqStatus) {
    case 0:
      return "info";
    case 1:
      return "warning";
    case 2:
      return "success";
    case 3:
      return "danger";
    default:
      return "info";
  }
});
const mqStatusText = computed(() => {
  switch (props.record.mqStatus) {
    case 0:
      return "待投递";
    case 1:
      return "投递中";
    case 2:
      return "已投递";
    case 3:
      return "投递失败";
    default:
      return "未知";
  }
});

const priorityType = computed(() => {
  switch (props.record.priority) {
    case 1:
      return "danger";
    case 2:
      return "warning";
    case 3:
      return "info";
    case 4:
    case 5:
      return "info";
    default:
      return "info";
  }
});

const priorityText = computed(() => {
  const map: Record<number, string> = {
    1: "高",
    2: "较高",
    3: "中",
    4: "较低",
    5: "低"
  };
  return map[props.record.priority ?? -1] ?? props.record.priority ?? "-";
});

const fmtTime = (t?: string) =>
  t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "-";

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
    <header class="mail-header">
      <div class="mail-header-main">
        <h1 class="mail-title">{{ props.record.subject || "无主题邮件" }}</h1>
        <p class="mail-subtitle">
          预览会尽量保留原邮件结构，并按邮箱客户端习惯过滤脚本和危险跳转
        </p>
      </div>
      <div class="mail-actions">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="desktop">桌面预览</el-radio-button>
          <el-radio-button value="mobile">移动预览</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="openInNewWindow">新窗口预览</el-button>
      </div>
    </header>

    <section class="mail-meta-grid">
      <el-card class="meta-card" shadow="never">
        <template #header>
          <span class="card-title">收发方信息</span>
        </template>
        <div class="meta-list">
          <div class="meta-item">
            <span class="meta-label">收件人</span>
            <span class="meta-value text-primary">{{
              props.record.recipient || "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">抄送</span>
            <span class="meta-value">{{ props.record.cc || "-" }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">消息ID</span>
            <span class="meta-value font-mono">{{
              props.record.messageId || "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">邮件类型</span>
            <span class="meta-value">{{ props.record.type || "-" }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">模板编码</span>
            <span class="meta-value font-mono">{{
              props.record.templateCode || "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">供应商</span>
            <span class="meta-value">{{ props.record.provider || "-" }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">供应商消息ID</span>
            <span class="meta-value font-mono">{{
              props.record.providerMessageId || "-"
            }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="meta-card" shadow="never">
        <template #header>
          <span class="card-title">发送状态</span>
        </template>
        <div class="meta-list">
          <div class="meta-item">
            <span class="meta-label">状态</span>
            <span class="meta-value">
              <el-tag :type="statusType" effect="light" size="small">{{
                statusText
              }}</el-tag>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">MQ状态</span>
            <span class="meta-value">
              <el-tag :type="mqStatusType" effect="light" size="small">{{
                mqStatusText
              }}</el-tag>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">优先级</span>
            <span class="meta-value">
              <el-tag
                v-if="props.record.priority != null"
                :type="priorityType"
                effect="light"
                size="small"
              >
                {{ priorityText }}
              </el-tag>
              <span v-else>-</span>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发送次数</span>
            <span class="meta-value">{{
              props.record.sendAttempts ?? "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发布次数</span>
            <span class="meta-value">{{
              props.record.publishAttempts ?? "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">最大重试次数</span>
            <span class="meta-value">{{
              props.record.maxRetryCount ?? "-"
            }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="meta-card" shadow="never">
        <template #header>
          <span class="card-title">时间线</span>
        </template>
        <div class="meta-list">
          <div class="meta-item">
            <span class="meta-label">发送时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.lastSendTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">最后尝试时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.lastAttemptTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发布时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.publishedTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">下次重试时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.nextRetryTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">完成时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.finishedTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">创建时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.createdTime)
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">更新时间</span>
            <span class="meta-value">{{
              fmtTime(props.record.updatedTime)
            }}</span>
          </div>
        </div>
      </el-card>

      <el-card class="meta-card is-wide" shadow="never">
        <template #header>
          <span class="card-title">错误与附件</span>
        </template>
        <div class="meta-list is-wide">
          <div class="meta-item">
            <span class="meta-label">失败原因</span>
            <span class="meta-value">{{
              props.record.errorMessage || "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">最后错误码</span>
            <span class="meta-value font-mono">{{
              props.record.lastErrorCode || "-"
            }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">最后错误类型</span>
            <span class="meta-value">{{
              props.record.lastErrorType || "-"
            }}</span>
          </div>
          <div v-if="attachmentPaths.length" class="meta-item">
            <span class="meta-label">附件路径</span>
            <div class="meta-value">
              <div class="attachment-list">
                <el-tag
                  v-for="path in attachmentPaths"
                  :key="path"
                  size="small"
                  effect="plain"
                  type="info"
                >
                  {{ path }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <el-tabs v-model="activeTab" class="mail-tabs" type="border-card">
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
/* 响应式 */
@media (width <= 1200px) {
  .mail-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .mail-header {
    flex-direction: column;
    align-items: stretch;
  }

  .mail-actions {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .mail-meta-grid {
    grid-template-columns: 1fr;
  }

  .meta-list.is-wide {
    grid-template-columns: 1fr;
  }

  .meta-label {
    width: 80px;
  }

  .mail-preview-shell {
    padding: 12px;
  }
}

.mail-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部标题栏 */
.mail-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.mail-title {
  margin: 0;
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
  flex-shrink: 0;
  gap: 12px;
  align-items: center;
}

/* 信息卡片网格 */
.mail-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.meta-card {
  --el-card-padding: 16px;

  border-radius: 8px;
}

.meta-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.meta-card.is-wide {
  grid-column: 1 / -1;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 卡片内字段列表 */
.meta-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.meta-list.is-wide {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px 24px;
}

.meta-item {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.meta-label {
  flex-shrink: 0;
  width: 90px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.meta-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.meta-value.text-primary {
  color: var(--el-color-primary);
}

.meta-value.font-mono {
  font-family:
    SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 预览标签页 */
.mail-tabs {
  background: var(--el-bg-color);
  border-radius: 8px;
}

.mail-tabs :deep(.el-tabs__content) {
  padding: 0;
}

.mail-preview-shell {
  padding: 20px;
  background:
    linear-gradient(180deg, rgb(246 248 251 / 96%), rgb(234 238 243 / 96%)),
    radial-gradient(circle at top, rgb(64 158 255 / 8%), transparent 36%);
  border-radius: 0 0 8px 8px;
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
  padding: 16px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
