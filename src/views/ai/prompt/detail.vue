<script setup lang="ts">
import { ref, computed } from "vue";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { testRenderAiPrompt } from "@/api/prompt";
import PromptEditor from "./components/PromptEditor.vue";
import { STATUS_MAP } from "./utils/types";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  DetailCodeBlock,
  DetailFields,
  DetailHeader,
  DetailPage,
  DetailSection,
  DetailSummary,
  type DetailFieldItem,
  type DetailSummaryItem,
  type DetailTagType
} from "@/components/ReDetail";
import EyeLine from "~icons/ri/eye-line";

defineOptions({
  name: "AiPromptDetail"
});

const props = defineProps<{ record: any }>();

const detail = computed(() => props.record);

const status = computed(() => STATUS_MAP[detail.value?.status]);

const editorLanguage = computed<"text" | "html" | "json" | "markdown">(() => {
  const f = detail.value?.contentFormat;
  if (f === "json") return "json";
  if (f === "html") return "html";
  if (f === "markdown") return "markdown";
  return "text";
});

const formatTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : undefined;

const summaryItems = computed<DetailSummaryItem[]>(() => [
  {
    label: "状态",
    value: status.value?.label ?? "-",
    tagType: (status.value?.tag ?? "info") as DetailTagType
  },
  { label: "版本", value: `v${detail.value?.version ?? "-"}` },
  { label: "分类", value: detail.value?.category },
  { label: "输出格式", value: detail.value?.contentFormat },
  { label: "语言", value: detail.value?.language }
]);

const infoFields = computed<DetailFieldItem[]>(() => [
  { label: "编码", value: detail.value?.code, mono: true, copy: true },
  { label: "名称", value: detail.value?.name },
  { label: "绑定场景", value: detail.value?.scene, mono: true },
  { label: "模型标签", value: detail.value?.modelHint },
  { label: "标签", value: detail.value?.tags },
  { label: "创建时间", value: formatTime(detail.value?.createdTime) },
  { label: "更新时间", value: formatTime(detail.value?.updatedTime) },
  { label: "备注", value: detail.value?.remark, full: true }
]);

const variablesList = computed<any[]>(() => {
  try {
    const parsed = JSON.parse(detail.value?.variablesSchema || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

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
    // 变量不是合法 JSON 时按空变量渲染
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
</script>

<template>
  <DetailPage>
    <DetailHeader :title="detail.name || 'AI 提示词'">
      <template #tags>
        <el-tag v-if="status" :type="status.tag as any" effect="light">
          {{ status.label }}
        </el-tag>
      </template>
      <template #subtitle>{{ detail.code || "-" }}</template>
      <template #actions>
        <el-button
          :loading="previewLoading"
          :icon="useRenderIcon(EyeLine)"
          @click="handleTestRender"
        >
          渲染预览
        </el-button>
      </template>
    </DetailHeader>

    <DetailSummary :items="summaryItems" />

    <DetailSection title="基础信息">
      <DetailFields :items="infoFields" :min-column-width="220" />
    </DetailSection>

    <DetailSection title="提示词正文" flush>
      <PromptEditor
        :model-value="detail.content || ''"
        :language="editorLanguage"
        theme="light"
        readonly
        height="420px"
      />
    </DetailSection>

    <DetailSection
      title="变量定义"
      :description="`${variablesList.length} 项`"
      flush
    >
      <el-table v-if="variablesList.length > 0" :data="variablesList">
        <el-table-column prop="name" label="名称" width="160" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="required" label="必填" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="default" label="默认值" width="140" />
        <el-table-column prop="description" label="说明" min-width="200" />
      </el-table>
      <el-empty v-else description="未定义变量" :image-size="80" />
    </DetailSection>

    <DetailSection v-if="detail.outputSchema" title="输出结构" flush>
      <DetailCodeBlock
        :content="detail.outputSchema"
        label="输出结构"
        max-height="320px"
      />
    </DetailSection>

    <el-drawer
      v-model="drawerVisible"
      title="渲染预览"
      direction="rtl"
      size="600px"
    >
      <el-form label-position="top">
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
          <DetailCodeBlock
            class="w-full"
            :content="previewResult"
            label="渲染结果"
            max-height="400px"
            empty-text="(空)"
          />
        </el-form-item>
      </el-form>
    </el-drawer>
  </DetailPage>
</template>
