<script setup lang="ts">
import dayjs from "dayjs";
import MarkdownIt from "markdown-it";
import { computed, reactive, ref, watch } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";
import {
  DetailFields,
  DetailHeader,
  DetailLayout,
  DetailPage,
  DetailSection,
  DetailSummary,
  useDetailCopy,
  type DetailFieldItem,
  type DetailSummaryItem,
  type DetailTagType
} from "@/components/ReDetail";
import type { AiCallRecordDetail, AiCallRecordStatus } from "./types";

type ContentViewMode = "raw" | "markdown";

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

const { copyText } = useDetailCopy();
const activeTab = ref("prompt");
const contentViewModes = reactive<Record<string, ContentViewMode>>({});

function normalizeContent(value?: string | null) {
  return typeof value === "string" ? value : "";
}

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : undefined;
}

function toJsonData(value: string): unknown | null {
  if (!value.trim()) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function createContentTab(
  name: string,
  label: string,
  content: string,
  emptyText: string
): ContentTab {
  const isJson = toJsonData(content) !== null;

  return {
    name,
    label,
    content,
    isJson,
    canPreviewMarkdown: !isJson && !!content.trim(),
    markdownHtml: isJson || !content.trim() ? "" : markdown.render(content),
    emptyText
  };
}

function getStatusType(status?: AiCallRecordStatus): DetailTagType {
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

function onViewModeChange(name: string, value: string | number | boolean) {
  contentViewModes[name] = value === "markdown" ? "markdown" : "raw";
}

function getTabHint(tab: ContentTab) {
  if (tab.isJson) return "已识别为 JSON 结构";
  return getViewMode(tab.name) === "markdown"
    ? "按 Markdown 预览显示"
    : "按原始文本显示";
}

const detailRecord = computed<AiCallRecordDetail>(() => {
  // 后端 detail 接口返回 provider（list 接口返回 model 为兼容别名）；统一取 provider，回退 model
  const rawProvider = String(
    props.record?.provider ?? props.record?.model ?? ""
  );

  return {
    id: Number(props.record?.id ?? 0),
    bizType: String(props.record?.bizType ?? ""),
    bizId: String(props.record?.bizId ?? ""),
    model: rawProvider,
    provider: rawProvider,
    templateName: String(props.record?.templateName ?? ""),
    prompt: normalizeContent(props.record?.prompt),
    response: normalizeContent(props.record?.response),
    costTimeMs: Number(props.record?.costTimeMs ?? 0),
    promptTokens: Number(props.record?.promptTokens ?? 0),
    responseTokens: Number(props.record?.responseTokens ?? 0),
    totalTokens: Number(props.record?.totalTokens ?? 0),
    finishReason: normalizeContent(props.record?.finishReason),
    status: String(props.record?.status ?? ""),
    errorMessage: normalizeContent(props.record?.errorMessage),
    operator: String(props.record?.operator ?? ""),
    traceId: String(props.record?.traceId ?? ""),
    remoteModel: normalizeContent(props.record?.remoteModel),
    actualModel: normalizeContent(props.record?.actualModel),
    streamMode: Number(props.record?.streamMode ?? 0),
    maxTokens: Number(props.record?.maxTokens ?? 0),
    retryCount: Number(props.record?.retryCount ?? 0),
    fallbackTried: normalizeContent(props.record?.fallbackTried),
    exceptionClass: normalizeContent(props.record?.exceptionClass),
    stackTrace: normalizeContent(props.record?.stackTrace),
    createdTime: String(props.record?.createdTime ?? ""),
    updatedTime: String(props.record?.updatedTime ?? "")
  };
});

const hasError = computed(() => !!detailRecord.value.errorMessage.trim());

/**
 * 请求模型与供应商实际返回的模型是否不一致。
 *
 * 不一致意味着供应商做了别名解析、版本重定向或静默降级，
 * 计费口径与模型能力都可能与配置预期不同，详情页需要显式提示。
 */
const hasModelDrift = computed(() => {
  const requested = detailRecord.value.remoteModel.trim().toLowerCase();
  const actual = detailRecord.value.actualModel.trim().toLowerCase();
  return !!requested && !!actual && requested !== actual;
});

const modelDriftHint = computed(() =>
  hasModelDrift.value
    ? `与请求模型「${detailRecord.value.remoteModel}」不一致：供应商做了别名解析或降级`
    : "与请求模型一致"
);

const headerTitle = computed(
  () => detailRecord.value.templateName || "AI 调用详情"
);

const summaryItems = computed<DetailSummaryItem[]>(() => {
  const item = detailRecord.value;
  const total = item.totalTokens || item.promptTokens + item.responseTokens;

  return [
    {
      label: "调用状态",
      value: item.status || "UNKNOWN",
      tagType: getStatusType(item.status)
    },
    { label: "调用耗时", value: `${item.costTimeMs || 0} ms` },
    { label: "总 Tokens", value: total },
    { label: "Prompt Tokens", value: item.promptTokens },
    { label: "Response Tokens", value: item.responseTokens }
  ];
});

const callFields = computed<DetailFieldItem[]>(() => {
  const item = detailRecord.value;

  return [
    { label: "调用供应商", value: item.provider },
    { label: "请求模型", value: item.remoteModel, mono: true, copy: true },
    // 实际模型走 #actualModel 插槽渲染：与请求模型不一致时需要 tag + tooltip 提示，
    // DetailFieldItem 的字段配置不支持 hint，故单独渲染
    {
      key: "actualModel",
      label: "实际模型",
      value: item.actualModel || undefined
    },
    { label: "调用模式", value: item.streamMode === 1 ? "流式" : "同步" },
    { label: "结束原因", value: item.finishReason },
    { label: "max_tokens", value: item.maxTokens || undefined },
    { label: "重试次数", value: item.retryCount },
    { label: "故障转移供应商", value: item.fallbackTried, full: true },
    { label: "异常类", value: item.exceptionClass, mono: true, full: true }
  ];
});

const traceFields = computed<DetailFieldItem[]>(() => {
  const item = detailRecord.value;

  return [
    { label: "记录 ID", value: item.id || undefined, mono: true },
    { label: "操作人", value: item.operator },
    { label: "业务类型", value: item.bizType },
    { label: "业务 ID", value: item.bizId, mono: true, copy: true },
    { label: "模板名称", value: item.templateName, copy: true, full: true },
    {
      label: "TraceId",
      value: item.traceId,
      mono: true,
      copy: true,
      full: true
    },
    { label: "创建时间", value: formatTime(item.createdTime), full: true },
    { label: "更新时间", value: formatTime(item.updatedTime), full: true }
  ];
});

const contentTabs = computed(() => {
  const item = detailRecord.value;
  const tabs = [
    createContentTab(
      "prompt",
      `Prompt (${item.prompt.length})`,
      item.prompt,
      "暂无 Prompt 内容"
    ),
    createContentTab(
      "response",
      `Response (${item.response.length})`,
      item.response,
      "暂无 Response 内容"
    )
  ];

  if (item.errorMessage.trim()) {
    tabs.unshift(
      createContentTab("error", "失败原因", item.errorMessage, "暂无错误信息")
    );
  }

  if (item.stackTrace.trim()) {
    tabs.unshift(
      createContentTab("stack", "异常堆栈", item.stackTrace, "暂无堆栈信息")
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
      if (tab.isJson || !contentViewModes[tab.name]) {
        contentViewModes[tab.name] = "raw";
      }
    });
  },
  { immediate: true }
);
</script>

<template>
  <DetailPage>
    <DetailHeader :title="headerTitle">
      <template #tags>
        <el-tag :type="getStatusType(detailRecord.status)" effect="light">
          {{ detailRecord.status || "UNKNOWN" }}
        </el-tag>
      </template>
      <template #subtitle>
        {{ detailRecord.bizType || "-" }}
        <span class="ai-detail__sep">/</span>
        {{ detailRecord.bizId || "-" }}
      </template>
      <template #actions>
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
      </template>
    </DetailHeader>

    <DetailSummary :items="summaryItems" />

    <el-alert
      v-if="hasError"
      title="本次调用存在失败信息"
      type="error"
      :closable="false"
      show-icon
    />

    <DetailLayout :aside-width="380">
      <DetailSection title="调用内容" flush>
        <el-tabs v-model="activeTab" class="ai-detail__tabs">
          <el-tab-pane
            v-for="tab in contentTabs"
            :key="tab.name"
            :name="tab.name"
            :label="tab.label"
            lazy
          >
            <div class="ai-detail__toolbar">
              <span class="ai-detail__hint">{{ getTabHint(tab) }}</span>
              <div class="ai-detail__toolbar-actions">
                <el-radio-group
                  v-if="tab.canPreviewMarkdown"
                  :model-value="getViewMode(tab.name)"
                  size="small"
                  @update:model-value="onViewModeChange(tab.name, $event)"
                >
                  <el-radio-button value="raw">原文</el-radio-button>
                  <el-radio-button value="markdown">Markdown</el-radio-button>
                </el-radio-group>
                <el-button
                  size="small"
                  @click="copyText(tab.content, tab.label)"
                >
                  复制内容
                </el-button>
              </div>
            </div>

            <el-empty
              v-if="!tab.content.trim()"
              :description="tab.emptyText"
              :image-size="60"
            />

            <el-scrollbar v-else max-height="calc(100vh - 360px)">
              <div class="ai-detail__content">
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
                <pre v-else class="ai-detail__text">{{ tab.content }}</pre>
              </div>
            </el-scrollbar>
          </el-tab-pane>
        </el-tabs>
      </DetailSection>

      <template #aside>
        <DetailSection title="调用参数">
          <DetailFields :items="callFields" :min-column-width="150">
            <template #actualModel="{ item }">
              <el-tooltip
                v-if="item.value"
                :content="modelDriftHint"
                placement="top"
              >
                <el-tag
                  size="small"
                  :type="hasModelDrift ? 'warning' : 'info'"
                  effect="plain"
                >
                  {{ item.value }}
                </el-tag>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </DetailFields>
        </DetailSection>
        <DetailSection title="业务与追踪">
          <DetailFields :items="traceFields" :min-column-width="150" />
        </DetailSection>
      </template>
    </DetailLayout>
  </DetailPage>
</template>

<style scoped>
.ai-detail__sep {
  margin: 0 6px;
  color: var(--el-border-color);
}

.ai-detail__tabs :deep(.el-tabs__header) {
  padding: 0 16px;
  margin: 0;
}

.ai-detail__toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}

.ai-detail__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ai-detail__hint {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.ai-detail__content {
  padding: 12px 16px 16px;
}

.ai-detail__text {
  padding: 16px;
  margin: 0;
  font-size: var(--ra-font-sm);
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-md);
}

.markdown-body {
  padding: 16px;
  font-size: var(--ra-font-base);
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-md);
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
  font-size: var(--ra-font-xs);
  background: var(--el-fill-color);
  border-radius: var(--ra-radius-sm);
}

.markdown-body :deep(pre) {
  padding: 14px 16px;
  overflow: auto;
  background: #0f172a;
  border-radius: var(--ra-radius-md);
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

@media (width <= 700px) {
  .ai-detail__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
