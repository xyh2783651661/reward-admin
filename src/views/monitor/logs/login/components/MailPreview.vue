<script setup lang="ts">
import { message } from "@/utils/message";
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import type { MailPreviewMode } from "../types";

defineOptions({ name: "MailPreview" });

const props = defineProps<{
  /** 邮件 HTML 正文 */
  content?: string;
  /** 用于在切换记录时重建 iframe */
  recordKey?: string | number;
}>();

const previewMode = ref<MailPreviewMode>("desktop");
const iframeRef = ref<HTMLIFrameElement | null>(null);
let disposePreviewBindings: null | (() => void) = null;

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

const previewHtml = computed(() => buildPreviewDocument(props.content ?? ""));
const previewWidth = computed(() =>
  previewMode.value === "mobile" ? "390px" : "100%"
);

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
</script>

<template>
  <div class="mail-preview">
    <div class="mail-preview__toolbar">
      <span class="mail-preview__hint">
        已屏蔽脚本执行，链接统一在新窗口打开，效果接近正式邮箱
      </span>
      <div class="mail-preview__actions">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="desktop">桌面</el-radio-button>
          <el-radio-button value="mobile">移动</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="openInNewWindow">新窗口预览</el-button>
      </div>
    </div>
    <div class="mail-preview__stage">
      <div
        class="mail-preview__host"
        :class="previewMode === 'mobile' ? 'is-mobile' : 'is-desktop'"
      >
        <iframe
          ref="iframeRef"
          :key="`${recordKey ?? 'mail'}-${previewMode}`"
          class="mail-preview__iframe"
          title="邮件预览"
          :style="{ width: previewWidth }"
          :srcdoc="previewHtml"
          sandbox="allow-same-origin allow-popups"
          @load="handlePreviewLoad"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mail-preview__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.mail-preview__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mail-preview__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mail-preview__stage {
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 0 0 8px 8px;
}

.mail-preview__host {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.mail-preview__host.is-mobile {
  padding: 8px 0;
}

.mail-preview__iframe {
  min-height: 320px;
  background: #fff;
  border: none;
  border-radius: 8px;
  box-shadow:
    0 10px 30px rgb(15 23 42 / 8%),
    0 2px 8px rgb(15 23 42 / 6%);
}
</style>
