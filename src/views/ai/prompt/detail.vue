<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import {
  getAiPromptDetail,
  testRenderAiPrompt,
  deleteAiPrompt
} from "@/api/prompt";
import PromptEditor from "./components/PromptEditor.vue";
import { STATUS_MAP } from "./utils/types";

defineOptions({
  name: "AiPromptDetail"
});

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const detail = ref<any>({});

const editorLanguage = computed<"text" | "html" | "json" | "markdown">(() => {
  const f = detail.value.contentFormat;
  if (f === "json") return "json";
  if (f === "html") return "html";
  if (f === "markdown") return "markdown";
  return "text";
});

async function loadDetail() {
  loading.value = true;
  try {
    const { data } = await getAiPromptDetail(route.params.id as string);
    detail.value = data;
  } catch (e) {
    message(getErrorMessage(e, "加载失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  router.back();
}

function handleEdit() {
  router.push(`/ai/prompt/edit/${detail.value.id}`);
}

async function handleDelete() {
  try {
    const r: any = await deleteAiPrompt(detail.value.id);
    if (r.code === 200) {
      message("已删除", { type: "success" });
      router.push("/ai/prompt/index");
    } else {
      message(r.msg || "删除失败", { type: "error" });
    }
  } catch (e) {
    message(getErrorMessage(e, "删除失败"), { type: "error" });
  }
}

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
      code: detail.value.code,
      variables: tryParsePreviewVars()
    });
    if (r.code === 200) {
      previewResult.value = r.data ?? "";
      drawerVisible.value = true;
    } else {
      message(r.msg || "渲染失败", { type: "error" });
    }
  } catch (e) {
    message("渲染失败", { type: "error" });
  } finally {
    previewLoading.value = false;
  }
}

function tryParseVariablesSchema(): any[] {
  try {
    const parsed = JSON.parse(detail.value.variablesSchema || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const variablesList = computed(() => tryParseVariablesSchema());

onMounted(loadDetail);
</script>

<template>
  <div v-loading="loading" class="ai-prompt-detail">
    <el-page-header class="page-header" @back="handleBack">
      <template #content>
        <span class="page-title">提示词详情</span>
      </template>
      <template #extra>
        <el-button :loading="previewLoading" @click="handleTestRender">
          渲染预览
        </el-button>
        <el-button type="primary" @click="handleEdit">编辑</el-button>
        <el-popconfirm
          :title="`确认删除「${detail.name || detail.code}」？`"
          @confirm="handleDelete"
        >
          <template #reference>
            <el-button type="danger" plain>删除</el-button>
          </template>
        </el-popconfirm>
      </template>
    </el-page-header>

    <el-descriptions :column="3" border class="info-table">
      <el-descriptions-item label="编码">{{
        detail.code
      }}</el-descriptions-item>
      <el-descriptions-item label="名称">{{
        detail.name
      }}</el-descriptions-item>
      <el-descriptions-item label="分类">{{
        detail.category
      }}</el-descriptions-item>
      <el-descriptions-item label="绑定场景">{{
        detail.scene || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="输出格式">{{
        detail.contentFormat
      }}</el-descriptions-item>
      <el-descriptions-item label="语言">{{
        detail.language
      }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag
          :type="(STATUS_MAP[detail.status]?.tag as any) || 'info'"
          size="small"
        >
          {{ STATUS_MAP[detail.status]?.label || detail.status }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="版本"
        >v{{ detail.version }}</el-descriptions-item
      >
      <el-descriptions-item label="模型标签">{{
        detail.modelHint || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="标签" :span="3">{{
        detail.tags || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{
          detail.createdTime
            ? dayjs(detail.createdTime).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="更新时间">
        {{
          detail.updatedTime
            ? dayjs(detail.updatedTime).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="创建人">{{
        detail.createdBy || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="3">
        {{ detail.remark || "-" }}
      </el-descriptions-item>
    </el-descriptions>

    <el-card shadow="never" class="section-card">
      <template #header>
        <span class="card-title"
          >变量定义（{{ variablesList.length }} 项）</span
        >
      </template>
      <el-table
        v-if="variablesList.length > 0"
        :data="variablesList"
        border
        size="small"
      >
        <el-table-column prop="name" label="名称" width="160" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="required" label="必填" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="default" label="默认值" width="140" />
        <el-table-column prop="description" label="说明" />
      </el-table>
      <el-empty v-else description="未定义变量" :image-size="80" />
    </el-card>

    <el-card shadow="never" class="section-card">
      <template #header>
        <span class="card-title">提示词正文</span>
      </template>
      <PromptEditor
        :model-value="detail.content || ''"
        :language="editorLanguage"
        theme="light"
        readonly
        height="420px"
      />
    </el-card>

    <el-card v-if="detail.outputSchema" shadow="never" class="section-card">
      <template #header>
        <span class="card-title">输出结构</span>
      </template>
      <pre class="output-schema">{{ detail.outputSchema }}</pre>
    </el-card>

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
  max-width: 1200px;
  padding: 16px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.info-table {
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 16px;
}

.card-title {
  font-weight: 600;
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
</style>
