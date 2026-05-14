<script setup lang="ts">
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useCopyToClipboard } from "@pureadmin/utils";
import type { JSONDataType } from "vue-json-pretty/types/utils";
import { message } from "@/utils/message";
import type { AiCallRecordDetail, AiCallRecordStatus } from "./types";

interface ContentTab {
  name: string;
  label: string;
  content: string;
  jsonData: JSONDataType | null;
  isJson: boolean;
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

const { copied, update } = useCopyToClipboard();
const activeTab = ref("prompt");

function normalizeContent(value?: string | null) {
  return typeof value === "string" ? value : "";
}

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function toJsonData(value: string): JSONDataType | null {
  if (!value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      parsed === null ||
      Array.isArray(parsed) ||
      ["string", "number", "boolean"].includes(typeof parsed)
    ) {
      return parsed as JSONDataType;
    }

    return parsed as Record<string, unknown>;
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
  const jsonData = toJsonData(content);

  return {
    name,
    label,
    content,
    jsonData,
    isJson: jsonData !== null,
    emptyText
  };
}

function getStatusType(status?: AiCallRecordStatus) {
  const normalized = `${status ?? ""}`.toUpperCase();

  if (normalized === "SUCCESS") return "success";
  if (["FAILED", "ERROR"].includes(normalized)) return "danger";
  if (["RUNNING", "PROCESSING"].includes(normalized)) return "warning";
  if (["PENDING", "WAITING", "INIT"].includes(normalized)) return "info";
  return "primary";
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

const metrics = computed(() => {
  const item = detailRecord.value;

  return [
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
  },
  { immediate: true }
);
</script>

<template>
  <div class="ai-call-detail">
    <div class="hero">
      <div class="hero__main">
        <div class="hero__eyebrow">AI 调用结果详情</div>
        <h2 class="hero__title">{{ detailRecord.bizType || "未命名业务" }}</h2>
        <div class="hero__meta">
          <el-tag
            :type="getStatusType(detailRecord.status)"
            effect="dark"
            round
          >
            {{ detailRecord.status || "UNKNOWN" }}
          </el-tag>
          <span>模型 {{ detailRecord.model || "-" }}</span>
          <span>业务ID {{ detailRecord.bizId || "-" }}</span>
        </div>
      </div>
      <div class="hero__actions">
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

    <div class="metric-grid">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <span class="metric-card__label">{{ item.label }}</span>
        <strong class="metric-card__value">{{ item.value }}</strong>
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
          <span class="tab-toolbar__hint">
            {{ tab.isJson ? "已识别为 JSON 结构" : "按纯文本展示" }}
          </span>
          <el-button size="small" @click="copyText(tab.content, tab.label)">
            复制内容
          </el-button>
        </div>

        <el-empty v-if="!tab.content.trim()" :description="tab.emptyText" />

        <el-scrollbar
          v-else
          max-height="calc(100vh - 360px)"
          class="content-scroll"
        >
          <vue-json-pretty
            v-if="tab.isJson"
            :data="tab.jsonData"
            :deep="3"
            :showLength="true"
            :showLine="true"
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
  gap: 18px;
}

.hero {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px;
  color: #eff6ff;
  background:
    radial-gradient(
      circle at top right,
      rgb(56 189 248 / 28%),
      transparent 32%
    ),
    linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #0ea5e9 100%);
  border-radius: 24px;
}

.hero__eyebrow {
  font-size: 13px;
  letter-spacing: 0.08em;
  opacity: 0.84;
}

.hero__title {
  margin: 10px 0 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  margin-top: 16px;
  font-size: 13px;
  color: rgb(219 234 254 / 86%);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
  border: 1px solid #dbeafe;
  border-radius: 18px;
}

.metric-card__label {
  display: block;
  font-size: 13px;
  color: #64748b;
}

.metric-card__value {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: #0f172a;
}

.detail-tabs {
  margin-top: 4px;
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
  color: #64748b;
}

.content-scroll {
  padding-right: 8px;
}

.content-block {
  padding: 18px;
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
}

@media (width <= 1280px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .hero,
  .tab-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero__actions {
    justify-content: flex-start;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
