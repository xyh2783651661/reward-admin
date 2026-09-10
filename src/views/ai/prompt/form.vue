<script setup lang="ts">
import { computed, ref } from "vue";
import { useAiPromptForm } from "./utils/formHook";
import type { AiPromptFormData } from "./utils/types";
import PromptEditor from "./components/PromptEditor.vue";
import {
  PROMPT_CATEGORIES,
  CONTENT_FORMATS,
  LANGUAGES,
  STATUS_OPTIONS
} from "./utils/types";
import { testRenderAiPrompt } from "@/api/prompt";
import { message } from "@/utils/message";

defineOptions({
  name: "AiPromptForm"
});

const props = defineProps<{
  formInline: AiPromptFormData;
  isEdit: boolean;
}>();

const { form, formRef, submitting, isEdit, handleSubmit } =
  useAiPromptForm(props);

defineExpose({ handleSubmit, getRef: () => formRef.value });

// CodeMirror 语言模式推断
const contentLanguage = computed<"text" | "html" | "json" | "markdown">(() => {
  if (form.contentFormat === "json") return "json";
  if (form.contentFormat === "html") return "html";
  if (form.contentFormat === "markdown") return "markdown";
  return "text";
});

// 暗色主题
const isDark = ref(false);
function toggleTheme() {
  isDark.value = !isDark.value;
}

// 渲染预览（抽屉内）
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
    // fall through
  }
  return {};
}

async function renderPreview() {
  if (!form.content) {
    message("提示词正文为空", { type: "warning" });
    return;
  }
  previewLoading.value = true;
  try {
    const r: any = await testRenderAiPrompt({
      content: form.content,
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

const rules = {
  code: [{ required: true, message: "编码不能为空", trigger: "blur" }],
  name: [{ required: true, message: "名称不能为空", trigger: "blur" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
  contentFormat: [
    { required: true, message: "请选择输出格式", trigger: "change" }
  ],
  language: [{ required: true, message: "请选择语言", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

// 模板中用于示例展示的 mustache 占位（避免与 Vue 模板冲突）
const mustache = "{{varName}}";
</script>

<template>
  <div class="ai-prompt-form">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="编码" prop="code">
            <el-input
              v-model="form.code"
              :disabled="isEdit"
              placeholder="业务唯一编码，如 email.birthday"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input
              v-model="form.name"
              placeholder="中文名称"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="分类" prop="category">
            <el-select
              v-model="form.category"
              placeholder="请选择"
              allow-create
              filterable
            >
              <el-option
                v-for="c in PROMPT_CATEGORIES"
                :key="c.value"
                :value="c.value"
                :label="c.label"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="输出格式" prop="contentFormat">
            <el-select v-model="form.contentFormat" placeholder="请选择">
              <el-option
                v-for="f in CONTENT_FORMATS"
                :key="f.value"
                :value="f.value"
                :label="f.label"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="语言" prop="language">
            <el-select v-model="form.language" placeholder="请选择">
              <el-option
                v-for="l in LANGUAGES"
                :key="l.value"
                :value="l.value"
                :label="l.label"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择">
              <el-option
                v-for="s in STATUS_OPTIONS"
                :key="s.value"
                :value="s.value"
                :label="s.label"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="绑定场景">
            <el-input v-model="form.scene" placeholder="可选" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="模型标签">
            <el-input
              v-model="form.modelHint"
              placeholder="可选，如 deepseek-chat"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="标签">
        <el-input v-model="form.tags" placeholder="逗号分隔，如 hot,new,v2" />
      </el-form-item>

      <el-form-item label="变量定义">
        <el-input
          v-model="form.variablesSchema"
          type="textarea"
          :rows="3"
          placeholder="JSON 数组：[ {name, type, required, default, description} ]"
        />
      </el-form-item>

      <el-form-item label="提示词正文" prop="content">
        <div class="editor-toolbar">
          <el-button
            size="small"
            :loading="previewLoading"
            @click="renderPreview"
          >
            渲染预览
          </el-button>
          <el-button size="small" text @click="toggleTheme">
            {{ isDark ? "切换浅色" : "切换深色" }}
          </el-button>
        </div>
        <PromptEditor
          v-model="form.content"
          :language="contentLanguage"
          :theme="isDark ? 'dark' : 'light'"
          height="420px"
          placeholder="在此输入提示词正文，使用 {{varName}} 标记变量"
        />
        <div class="editor-tip">
          支持
          <code>{{ mustache }}</code>
          变量语法，变量名在编辑器中高亮显示。
        </div>
      </el-form-item>

      <el-form-item label="输出结构">
        <el-input
          v-model="form.outputSchema"
          type="textarea"
          :rows="2"
          placeholder="可选：JSON Schema 或结构说明"
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>

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
            :loading="previewLoading"
            type="primary"
            @click="renderPreview"
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
.ai-prompt-form {
  padding: 8px 0;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.editor-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preview-result {
  max-height: 400px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
