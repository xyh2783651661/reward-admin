<script setup lang="ts">
import { computed, ref } from "vue";
import { message } from "@/utils/message";
import { testRenderAiPrompt } from "@/api/prompt";

defineOptions({
  name: "AiPromptTestRender"
});

const props = defineProps<{
  /** 列表行（至少含 code / name / variablesSchema） */
  record: any;
}>();

/** 依据 variables_schema 生成变量骨架，降低手写成本（不做复杂动态表单） */
function buildVarsTemplate(): string {
  try {
    const arr = JSON.parse(props.record?.variablesSchema || "[]");
    if (Array.isArray(arr) && arr.length > 0) {
      const obj: Record<string, unknown> = {};
      for (const v of arr) {
        if (!v?.name) continue;
        if (v.type === "array") obj[v.name] = [];
        else if (v.type === "number") obj[v.name] = 0;
        else if (v.type === "object") obj[v.name] = {};
        else obj[v.name] = "";
      }
      return JSON.stringify(obj, null, 2);
    }
  } catch {
    /* ignore */
  }
  return "{}";
}

const varsText = ref(buildVarsTemplate());
const result = ref("");
const loading = ref(false);

const jsonError = computed(() => {
  const t = varsText.value.trim();
  if (!t) return "";
  try {
    JSON.parse(t);
    return "";
  } catch (e: any) {
    return `JSON 解析失败：${e?.message ?? "非法 JSON"}`;
  }
});

async function handleRender() {
  if (jsonError.value) {
    message(jsonError.value, { type: "warning" });
    return;
  }
  let vars: Record<string, unknown> = {};
  try {
    vars = JSON.parse(varsText.value || "{}");
  } catch {
    /* handled by jsonError */
  }
  loading.value = true;
  try {
    const r: any = await testRenderAiPrompt({
      code: props.record.code,
      variables: vars
    });
    if (r.code === 200) {
      result.value = r.data ?? "";
    } else {
      message(r.msg || "渲染失败", { type: "error" });
    }
  } catch (e: any) {
    message(e?.message || "渲染失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="ai-prompt-test-render">
    <el-descriptions :column="2" border size="small" class="mb-3">
      <el-descriptions-item label="编码">{{
        record.code
      }}</el-descriptions-item>
      <el-descriptions-item label="名称">{{
        record.name || "-"
      }}</el-descriptions-item>
    </el-descriptions>

    <el-form label-position="top">
      <el-form-item>
        <template #label>
          变量（JSON）
          <span v-if="jsonError" class="json-error">{{ jsonError }}</span>
        </template>
        <el-input
          v-model="varsText"
          type="textarea"
          :rows="8"
          class="font-mono"
          placeholder='如 {"nickname": "小明", "age": 18}'
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleRender">
          执行渲染
        </el-button>
        <el-button @click="varsText = buildVarsTemplate()">重置变量</el-button>
      </el-form-item>
      <el-form-item label="渲染结果">
        <pre class="render-result">{{ result || "(尚未渲染)" }}</pre>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.ai-prompt-test-render {
  padding: 4px 0;
}

.mb-3 {
  margin-bottom: 12px;
}

.json-error {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.render-result {
  width: 100%;
  max-height: 360px;
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
