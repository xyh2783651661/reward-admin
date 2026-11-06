<script setup lang="ts">
import { ReSelect } from "@/components/ReSelect";
import { computed, ref, watch } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";
import ReJsonField from "@/components/ReJsonField/index.vue";
import ImageProviderModelsField from "./components/image-provider-models-field.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import {
  getProviderModelOptions,
  syncProviderModels
} from "@/api/ai-provider-model";
import { getSystemConfigByKey } from "@/api/system-config";
import {
  AI_IMAGE_MODEL_KEY,
  AI_IMAGE_PROVIDER_KEY,
  AI_IMAGE_PROVIDER_MODELS_KEY,
  findProviderMeta,
  parseProviderModelKey,
  type AiProviderMeta
} from "@/constants/ai-provider";
import type { SelectOption } from "@/components/ReSelect/types";

/** 单供应商同步结果（只取本页需要的字段） */
interface ModelSyncSummary {
  status?: string;
  fetched?: number;
  inserted?: number;
  errorMessage?: string;
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    configKey: "",
    configValue: "",
    configGroup: "",
    valueType: "string",
    description: "",
    status: 1,
    sensitive: 0
  }),
  formOptions: () => ({
    valueTypes: [],
    statusOptions: [],
    sensitiveOptions: [],
    groups: []
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const formOptions = computed(() => props.formOptions);
const isJsonType = computed(() => newFormInline.value.valueType === "json");
const configValuePlaceholder = computed(() => {
  return isJsonType.value
    ? "请输入合法 JSON，提交时会自动压缩为字符串"
    : "请输入配置值";
});

// ==================== AI 模型类配置的值编辑器 ====================
//
// 后端对 ai.<provider>.model / ai.image-understanding.* 会校验「模型存在 + 能力匹配」，
// 因此这里把配置值从手输文本改成「供应商模型目录下拉」；目录为空时仍允许手输，
// 兼容供应商没有 /models 接口或尚未同步的情况。

type EditorMode = "text" | "json" | "model" | "image-provider-models";

const configKey = computed(() => (newFormInline.value.configKey ?? "").trim());

const editorMode = computed<EditorMode>(() => {
  if (configKey.value === AI_IMAGE_PROVIDER_MODELS_KEY) {
    return "image-provider-models";
  }
  if (
    configKey.value === AI_IMAGE_MODEL_KEY ||
    parseProviderModelKey(configKey.value)
  ) {
    return "model";
  }
  return isJsonType.value ? "json" : "text";
});

const modelProvider = ref<AiProviderMeta | null>(null);
const modelCapability = ref<"TEXT" | "VISION">("TEXT");
const modelOptions = ref<SelectOption[]>([]);
const modelOptionsLoading = ref(false);
const modelOptionsError = ref("");
const syncingModels = ref(false);

/** 当前填写的模型是否仍在最新目录中 */
const modelValueInCatalog = computed(() => {
  const value = (newFormInline.value.configValue ?? "").trim();
  if (!value || !modelOptions.value.length) return true;
  return modelOptions.value.some(item => String(item.value) === value);
});

const modelPlaceholder = computed(() => {
  if (modelOptionsLoading.value) return "正在加载模型列表…";
  if (!modelProvider.value) return "未识别到供应商，可直接输入模型名";
  if (!modelOptions.value.length) {
    return `${modelProvider.value.label} 暂无模型目录数据，可直接输入模型名`;
  }
  return "选择模型，或输入未同步的新模型名";
});

const modelHint = computed(() => {
  if (modelOptionsError.value) return modelOptionsError.value;
  if (!modelProvider.value) {
    return "配置 key 未能匹配到已接入的供应商，仅支持手工输入模型名。";
  }
  const capabilityText =
    modelCapability.value === "VISION"
      ? "图片理解（VISION）"
      : "文本对话（TEXT）";
  if (!modelOptions.value.length) {
    return `${modelProvider.value.label} 当前没有可用的${capabilityText}模型：可能尚未同步模型目录，或该供应商没有标准 /models 接口。可点右侧「同步」重试，或手工输入模型名。`;
  }
  return `选项来自 ${modelProvider.value.label} 最近一次同步的${capabilityText}模型，共 ${modelOptions.value.length} 个；未同步的新模型可直接输入。`;
});

async function loadModelOptions() {
  if (!modelProvider.value) {
    modelOptions.value = [];
    return;
  }
  modelOptionsLoading.value = true;
  modelOptionsError.value = "";
  try {
    const { data } = await getProviderModelOptions(
      modelProvider.value.provider,
      modelCapability.value
    );
    modelOptions.value = data ?? [];
  } catch (error) {
    modelOptions.value = [];
    modelOptionsError.value = getErrorMessage(error, "模型列表加载失败");
  } finally {
    modelOptionsLoading.value = false;
  }
}

/** 解析「当前配置 key 对应哪个供应商、哪种能力」 */
async function resolveModelContext() {
  if (editorMode.value !== "model") {
    modelProvider.value = null;
    modelOptions.value = [];
    return;
  }

  if (configKey.value === AI_IMAGE_MODEL_KEY) {
    modelCapability.value = "VISION";
    modelProvider.value = null;
    try {
      const { data } = await getSystemConfigByKey<{ configValue?: string }>(
        AI_IMAGE_PROVIDER_KEY
      );
      const providerName = String(data?.configValue ?? "")
        .trim()
        .toUpperCase()
        .replace(/-/g, "_");
      modelProvider.value = findProviderMeta(providerName) ?? null;
    } catch {
      modelProvider.value = null;
    }
  } else {
    modelCapability.value = "TEXT";
    modelProvider.value =
      parseProviderModelKey(configKey.value)?.provider ?? null;
  }

  await loadModelOptions();
}

async function handleSyncModels() {
  if (!modelProvider.value) return;
  syncingModels.value = true;
  try {
    const { data } = await syncProviderModels<ModelSyncSummary>(
      modelProvider.value.provider
    );
    const result = data?.[0];
    if (result?.status === "SUCCESS") {
      message(
        `已同步 ${modelProvider.value.label}：拉取 ${result.fetched ?? 0} 个，新增 ${result.inserted ?? 0} 个`,
        { type: "success" }
      );
    } else if (result?.status === "SKIPPED") {
      message(
        result.errorMessage ||
          "该供应商没有标准 /models 接口，请到模型目录手工补录",
        { type: "warning" }
      );
    } else {
      message(result?.errorMessage || "同步失败，请检查供应商凭证与地址", {
        type: "error"
      });
    }
    await loadModelOptions();
  } catch (error) {
    message(getErrorMessage(error, "同步模型列表失败"), { type: "error" });
  } finally {
    syncingModels.value = false;
  }
}

let resolveTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => [configKey.value, newFormInline.value.valueType],
  () => {
    if (resolveTimer) clearTimeout(resolveTimer);
    resolveTimer = setTimeout(() => {
      void resolveModelContext();
    }, 400);
  },
  { immediate: true }
);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="96px"
  >
    <el-form-item label="配置 Key" prop="configKey">
      <el-input
        v-model.trim="newFormInline.configKey"
        clearable
        maxlength="128"
        placeholder="请输入配置 Key"
      />
    </el-form-item>

    <el-form-item label="配置分组" prop="configGroup">
      <ReSelect
        v-model="newFormInline.configGroup"
        filterable
        allow-create
        default-first-option
        placeholder="请选择或输入配置分组"
        :options="formOptions.groups"
      />
    </el-form-item>

    <el-form-item label="值类型" prop="valueType">
      <ReSelect
        v-model="newFormInline.valueType"
        placeholder="请选择值类型"
        :options="formOptions.valueTypes"
      />
    </el-form-item>

    <el-form-item label="配置值" prop="configValue">
      <div
        v-if="editorMode === 'image-provider-models'"
        class="config-value-editor"
      >
        <ImageProviderModelsField v-model="newFormInline.configValue" />
      </div>

      <div v-else-if="editorMode === 'model'" class="config-value-editor">
        <div class="config-value-editor__row">
          <el-select
            v-model="newFormInline.configValue"
            filterable
            clearable
            allow-create
            default-first-option
            :loading="modelOptionsLoading"
            :placeholder="modelPlaceholder"
            class="config-value-editor__select"
          >
            <el-option
              v-for="item in modelOptions"
              :key="String(item.value)"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button
            link
            type="primary"
            :loading="syncingModels"
            :disabled="!modelProvider"
            @click="handleSyncModels"
          >
            同步该供应商模型
          </el-button>
        </div>

        <div class="config-value-editor__hint">{{ modelHint }}</div>

        <el-alert
          v-if="!modelValueInCatalog"
          type="warning"
          :closable="false"
          show-icon
          class="config-value-editor__alert"
          title="当前配置值不在最新模型列表中"
          description="该模型可能已被供应商下线。保存时后端会拒绝并给出可选模型；确认仍要使用时，请先同步模型目录或用「手工补录」登记。"
        />
      </div>

      <ReJsonField
        v-else-if="editorMode === 'json'"
        v-model="newFormInline.configValue"
        :placeholder="configValuePlaceholder"
        :min-rows="4"
      />

      <el-input
        v-else
        v-model="newFormInline.configValue"
        :rows="4"
        :placeholder="configValuePlaceholder"
        type="textarea"
      />
    </el-form-item>

    <el-form-item label="配置说明" prop="description">
      <el-input
        v-model="newFormInline.description"
        :rows="3"
        maxlength="255"
        placeholder="请输入配置说明"
        show-word-limit
        type="textarea"
      />
    </el-form-item>

    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="newFormInline.status">
        <el-radio
          v-for="item in formOptions.statusOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="敏感标识" prop="sensitive">
      <el-radio-group v-model="newFormInline.sensitive">
        <el-radio
          v-for="item in formOptions.sensitiveOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.config-value-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.config-value-editor__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-value-editor__select {
  flex: 1;
  min-width: 0;
}

.config-value-editor__hint {
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.config-value-editor__alert {
  margin-top: 2px;
}
</style>
