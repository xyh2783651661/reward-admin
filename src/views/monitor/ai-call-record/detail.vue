<script setup lang="ts">
import dayjs from "dayjs";
import MarkdownIt from "markdown-it";
import { computed, reactive, ref, watch } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";
import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";
import type { AiCallRecordDetail, AiCallRecordStatus } from "./types";

type ContentViewMode = "raw" | "markdown";
type TagType = "primary" | "success" | "warning" | "danger" | "info";

interface ContentTab {
  name: string;
  label: string;
  content: string;
  isJson: boolean;
  canPreviewMarkdown: boolean;
  markdownHtml: string;
  emptyText: string;
}

const props = withDefaults(
  defineProps<{
    record?: Partial<AiCallRecordDetail> | null;
  }>(),
  {
    record: () => ({})
  }
);

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false
});

const defaultLinkOpen =
  markdown.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const targetIndex = token.attrIndex("target");
  const relIndex = token.attrIndex("rel");

  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![targetIndex][1] = "_blank";
  }

  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    token.attrs![relIndex][1] = "noopener noreferrer";
  }

  return defaultLinkOpen(tokens, idx, options, env, self);
};

const { copied, update } = useCopyToClipboard();
const activeTab = ref("prompt");
const contentViewModes = reactive<Record<string, ContentViewMode>>({});

function normalizeContent(value?: string | null) {
  return typeof value === "string" ? value : "";
}

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function toJsonData(value: string): unknown | null {
  if (!value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed;
  } catch {
    return null;
  }
}

function renderMarkdown(value: string) {
  if (!value.trim()) return "";
  return markdown.render(value);
}

function createContentTab(
  name: string,
  label: string,
  content: string,
  emptyText: string
): ContentTab {
  const jsonData = toJsonData(content);
  const isJson = jsonData !== null;

  return {
    name,
    label,
    content,
    isJson,
    canPreviewMarkdown: !isJson && !!content.trim(),
    markdownHtml: isJson ? "" : renderMarkdown(content),
    emptyText
  };
}

function getStatusType(status?: AiCallRecordStatus): TagType {
  const normalized = `${status ?? ""}`.toUpperCase();

  if (normalized === "SUCCESS") return "success";
  if (["FAILED", "ERROR"].includes(normalized)) return "danger";
  if (["RUNNING", "PROCESSING"].includes(normalized)) return "warning";
  if (["PENDING", "WAITING", "INIT"].includes(normalized)) return "info";
  return "primary";
}

function getViewMode(name: string): ContentViewMode {
  return contentViewModes[name] ?? "raw";
}

function setViewMode(name: string, value: ContentViewMode) {
  contentViewModes[name] = value;
}

function onViewModeChange(name: string, value: string | number | boolean) {
  setViewMode(name, value === "markdown" ? "markdown" : "raw");
}

function getTabHint(tab: ContentTab) {
  if (tab.isJson) return "已识别为 JSON 结构";
  return getViewMode(tab.name) === "markdown"
    ? "按 Markdown 预览显示"
    : "按原始文本显示";
}

async function copyText(value: string, label: string) {
  if (!value.trim()) {
    message(`${label}暂无可复制内容`, { type: "warning" });
    return;
  }

  try {
    await update(value);
    if (copied.value) {
      message(`${label}已复制`, { type: "success" });
      return;
    }
  } catch {
    // Ignore and fall through to the unified error message below.
  }

  message(`${label}复制失败`, { type: "error" });
}

const detailRecord = computed<AiCallRecordDetail>(() => ({
  id: Number(props.record?.id ?? 0),
  bizType: String(props.record?.bizType ?? ""),
  bizId: String(props.record?.bizId ?? ""),
  model: String(props.record?.model ?? ""),
  templateName: String(props.record?.templateName ?? ""),
  prompt: normalizeContent(props.record?.prompt),
  response: normalizeContent(props.record?.response),
  costTimeMs: Number(props.record?.costTimeMs ?? 0),
  promptTokens: Number(props.record?.promptTokens ?? 0),
  responseTokens: Number(props.record?.responseTokens ?? 0),
  status: String(props.record?.status ?? ""),
  errorMessage: normalizeContent(props.record?.errorMessage),
  operator: String(props.record?.operator ?? ""),
  traceId: String(props.record?.traceId ?? ""),
  createdTime: String(props.record?.createdTime ?? ""),
  updatedTime: String(props.record?.updatedTime ?? "")
}));

const summaryItems = computed(() => {
  const item = detailRecord.value;

  return [
    {
      label: "调用状态",
      value: item.status || "UNKNOWN",
      tagType: getStatusType(item.status)
    },
    {
      label: "调用耗时",
      value: `${item.costTimeMs || 0} ms`
    },
    {
      label: "Prompt Tokens",
      value: `${item.promptTokens || 0}`
    },
    {
      label: "Response Tokens",
      value: `${item.responseTokens || 0}`
    },
    {
      label: "总 Tokens",
      value: `${(item.promptTokens || 0) + (item.responseTokens || 0)}`
    },
    {
      label: "调用模型",
      value: item.model || "-"
    }
  ];
});

const descriptionColumns = [
  {
    label: "记录ID",
    prop: "id"
  },
  {
    label: "业务类型",
    prop: "bizType"
  },
  {
    label: "业务ID",
    prop: "bizId",
    copy: true
  },
  {
    label: "调用模型",
    prop: "model"
  },
  {
    label: "模板名称",
    prop: "templateName",
    copy: true
  },
  {
    label: "调用状态",
    prop: "status"
  },
  {
    label: "操作人",
    prop: "operator"
  },
  {
    label: "TraceId",
    prop: "traceId",
    copy: true
  },
  {
    label: "创建时间",
    prop: "createdTime",
    formatter: ({ createdTime }) => formatTime(createdTime)
  },
  {
    label: "更新时间",
    prop: "updatedTime",
    formatter: ({ updatedTime }) => formatTime(updatedTime)
  }
];

const contentTabs = computed(() => {
  const item = detailRecord.value;
  const tabs = [
    createContentTab(
      "prompt",
      `Prompt 全文 (${item.prompt.length} 字符)`,
      item.prompt,
      "暂无 Prompt 内容"
    ),
    createContentTab(
      "response",
      `Response 全文 (${item.response.length} 字符)`,
      item.response,
      "暂无 Response 内容"
    )
  ];

  if (item.errorMessage.trim()) {
    tabs.unshift(
      createContentTab("error", "失败原因", item.errorMessage, "暂无错误信息")
    );
  }

  return tabs;
});

watch(
  contentTabs,
  tabs => {
    activeTab.value = tabs.some(item => item.name === "error")
      ? "error"
      : "prompt";

    const currentKeys = new Set(tabs.map(item => item.name));

    Object.keys(contentViewModes).forEach(key => {
      if (!currentKeys.has(key)) {
        delete contentViewModes[key];
      }
    });

    tabs.forEach(tab => {
      if (tab.isJson) {
        contentViewModes[tab.name] = "raw";
        return;
      }

      if (!contentViewModes[tab.name]) {
        contentViewModes[tab.name] = "raw";
      }
    });
  },
  { immediate: true }
);
</script>

<template>
  <div class="ai-call-detail">
    <div class="detail-toolbar">
      <div class="detail-toolbar__main">
        <div class="detail-toolbar__title">AI 调用详情</div>
        <div class="detail-toolbar__subtitle">
          {{ detailRecord.bizType || "-" }}
          <span class="mx-2 text-[var(--el-border-color)]">/</span>
          {{ detailRecord.bizId || "-" }}
        </div>
      </div>
      <div class="detail-toolbar__actions">
        <el-button
          size="small"
          @click="copyText(detailRecord.traceId, 'TraceId')"
        >
          复制 TraceId
        </el-button>
        <el-button
          size="small"
          @click="copyText(detailRecord.prompt, 'Prompt')"
        >
          复制 Prompt
        </el-button>
        <el-button
          size="small"
          type="primary"
          @click="copyText(detailRecord.response, 'Response')"
        >
          复制 Response
        </el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label" class="summary-card">
        <span class="summary-card__label">{{ item.label }}</span>
        <el-tag
          v-if="item.tagType"
          :type="item.tagType"
          effect="plain"
          class="summary-card__tag"
        >
          {{ item.value }}
        </el-tag>
        <strong v-else class="summary-card__value">{{ item.value }}</strong>
      </div>
    </div>

    <el-alert
      v-if="detailRecord.errorMessage.trim()"
      title="本次调用存在失败信息"
      type="error"
      :closable="false"
      show-icon
    />

    <el-scrollbar>
      <PureDescriptions
        border
        :data="[detailRecord]"
        :columns="descriptionColumns"
        :column="5"
      />
    </el-scrollbar>

    <el-tabs v-model="activeTab" type="border-card" class="detail-tabs">
      <el-tab-pane
        v-for="tab in contentTabs"
        :key="tab.name"
        :name="tab.name"
        :label="tab.label"
      >
        <div class="tab-toolbar">
          <span class="tab-toolbar__hint">{{ getTabHint(tab) }}</span>
          <div class="tab-toolbar__actions">
            <el-radio-group
              v-if="tab.canPreviewMarkdown"
              :model-value="getViewMode(tab.name)"
              size="small"
              @update:model-value="onViewModeChange(tab.name, $event)"
            >
              <el-radio-button value="raw">原文</el-radio-button>
              <el-radio-button value="markdown">Markdown</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="copyText(tab.content, tab.label)">
              复制内容
            </el-button>
          </div>
        </div>

        <el-empty v-if="!tab.content.trim()" :description="tab.emptyText" />

        <el-scrollbar
          v-else
          max-height="calc(100vh - 320px)"
          class="content-scroll"
        >
          <ReJsonField
            v-if="tab.isJson"
            :model-value="tab.content"
            readonly
            :deep="3"
          />
          <div
            v-else-if="getViewMode(tab.name) === 'markdown'"
            class="markdown-body"
            v-html="tab.markdownHtml"
          />
          <pre v-else class="content-block">{{ tab.content }}</pre>
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.ai-call-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-toolbar {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.detail-toolbar__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.detail-toolbar__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.detail-toolbar__actions,
.tab-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.summary-card__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-card__value {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.summary-card__tag {
  width: fit-content;
}

.detail-tabs {
  margin-top: 2px;
}

.tab-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tab-toolbar__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.content-scroll {
  padding-right: 8px;
}

.content-block,
.markdown-body {
  padding: 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.content-block {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.markdown-body :deep(*:first-child) {
  margin-top: 0;
}

.markdown-body :deep(*:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1.1em 0 0.6em;
  font-weight: 600;
  line-height: 1.4;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(table) {
  margin: 0 0 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 22px;
}

.markdown-body :deep(li + li) {
  margin-top: 4px;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  padding: 14px 16px;
  overflow: auto;
  background: #0f172a;
  border-radius: 8px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  color: #e2e8f0;
  background: transparent;
}

.markdown-body :deep(blockquote) {
  padding: 8px 0 8px 12px;
  color: var(--el-text-color-secondary);
  border-left: 4px solid var(--el-color-primary-light-5);
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
}

.markdown-body :deep(th) {
  background: var(--el-fill-color-light);
}

.markdown-body :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

@media (width <= 1400px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 900px) {
  .detail-toolbar,
  .tab-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
