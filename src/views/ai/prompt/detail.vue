<script setup lang="ts">
import { ref, computed } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { testRenderAiPrompt } from "@/api/prompt";
import PromptEditor from "./components/PromptEditor.vue";
import { STATUS_MAP } from "./utils/types";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "AiPromptDetail"
});

const props = defineProps<{ record: any }>();

const detail = computed(() => props.record);

const editorLanguage = computed<"text" | "html" | "json" | "markdown">(() => {
  const f = detail.value?.contentFormat;
  if (f === "json") return "json";
  if (f === "html") return "html";
  if (f === "markdown") return "markdown";
  return "text";
});

const summaryItems = computed(() => [
  {
    label: "状态",
    value: STATUS_MAP[detail.value?.status]?.label ?? "-",
    tagType: STATUS_MAP[detail.value?.status]?.tag ?? "info"
  },
  { label: "版本", value: `v${detail.value?.version ?? "-"}`, tagType: "" },
  { label: "分类", value: detail.value?.category ?? "-", tagType: "" },
  { label: "输出格式", value: detail.value?.contentFormat ?? "-", tagType: "" },
  { label: "语言", value: detail.value?.language ?? "-", tagType: "" }
]);

const descriptionColumns = [
  { label: "编码", prop: "code" },
  { label: "名称", prop: "name" },
  { label: "绑定场景", prop: "scene" },
  { label: "模型标签", prop: "modelHint" },
  { label: "标签", prop: "tags" },
  {
    label: "创建时间",
    prop: "createdTime",
    formatter: ({ createdTime }) =>
      createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  {
    label: "更新时间",
    prop: "updatedTime",
    formatter: ({ updatedTime }) =>
      updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  { label: "备注", prop: "remark" }
];

// 测试渲染（右侧抽屉）
const drawerVisible = ref(false);
const previewVars = ref("{}");
const previewResult = ref("");
const previewLoading = ref(false);

function tryParsePreviewVars(): Record<string, unknown> {
  try {
    const parsed = JSON.parse(previewVars.value || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

async function handleTestRender() {
  previewLoading.value = true;
  try {
    const r: any = await testRenderAiPrompt({
      code: detail.value?.code,
      variables: tryParsePreviewVars()
    });
    if (r.code === 200) {
      previewResult.value = r.data ?? "";
      drawerVisible.value = true;
    } else {
      message(r.msg || "渲染失败", { type: "error" });
    }
  } catch {
    message("渲染失败", { type: "error" });
  } finally {
    previewLoading.value = false;
  }
}

function tryParseVariablesSchema(): any[] {
  try {
    const parsed = JSON.parse(detail.value?.variablesSchema || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const variablesList = computed(() => tryParseVariablesSchema());
</script>

<template>
  <div class="ai-prompt-detail">
    <div class="detail-toolbar">
      <div class="detail-toolbar__main">
        <div class="detail-toolbar__title">AI 提示词详情</div>
        <div class="detail-toolbar__subtitle">
          {{ detail.name || "-" }}
          <span class="mx-2 text-[var(--el-border-color)]">/</span>
          {{ detail.code || "-" }}
        </div>
      </div>
      <div class="detail-toolbar__actions">
        <el-button
          :loading="previewLoading"
          :icon="useRenderIcon('ri/eye-line')"
          @click="handleTestRender"
        >
          渲染预览
        </el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label" class="summary-card">
        <span class="summary-card__label">{{ item.label }}</span>
        <el-tag
          v-if="item.tagType"
          :type="item.tagType as any"
          effect="plain"
          class="summary-card__tag"
        >
          {{ item.value }}
        </el-tag>
        <strong v-else class="summary-card__value">{{ item.value }}</strong>
      </div>
    </div>

    <PureDescriptions
      border
      :data="[detail]"
      :columns="descriptionColumns"
      :column="3"
    />

    <el-tabs type="border-card" class="detail-tabs">
      <el-tab-pane label="提示词正文">
        <PromptEditor
          :model-value="detail.content || ''"
          :language="editorLanguage"
          theme="light"
          readonly
          height="420px"
        />
      </el-tab-pane>

      <el-tab-pane :label="`变量定义（${variablesList.length} 项）`">
        <el-table
          v-if="variablesList.length > 0"
          :data="variablesList"
          border
          size="small"
        >
          <el-table-column prop="name" label="名称" width="160" />
          <el-table-column prop="type" label="类型" width="100" />
          <el-table-column
            prop="required"
            label="必填"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="default" label="默认值" width="140" />
          <el-table-column prop="description" label="说明" />
        </el-table>
        <el-empty v-else description="未定义变量" :image-size="80" />
      </el-tab-pane>

      <el-tab-pane v-if="detail.outputSchema" label="输出结构">
        <pre class="output-schema">{{ detail.outputSchema }}</pre>
      </el-tab-pane>
    </el-tabs>

    <!-- 渲染预览抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="渲染预览"
      direction="rtl"
      size="600px"
    >
      <el-form label-width="100px">
        <el-form-item label="变量（JSON）">
          <el-input v-model="previewVars" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="previewLoading"
            @click="handleTestRender"
          >
            重新渲染
          </el-button>
        </el-form-item>
        <el-form-item label="渲染结果">
          <pre class="preview-result">{{ previewResult || "(空)" }}</pre>
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>

<style scoped>
.ai-prompt-detail {
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

.detail-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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

.output-schema,
.preview-result {
  padding: 12px;
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.preview-result {
  max-height: 400px;
  overflow: auto;
}

@media (width <= 1400px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
