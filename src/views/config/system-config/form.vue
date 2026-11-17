<script setup lang="ts">
import { ReSelect } from "@/components/ReSelect";
import { computed, ref, watch } from "vue";
import {
  buildConfigValueRules,
  formRules,
  isConfigValueCompatible,
  normalizeBooleanValue
} from "./utils/rule";
import type { FormProps, SystemConfigValueType } from "./utils/types";
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

// ==================== 按值类型切换的配置值编辑器 ====================
//
// 配置值在库里统一是字符串，但语义由「值类型」决定。过去一律给文本域，
// 布尔/数字全靠人手输，很容易写出 valueType=boolean 而值是 "abc" 这种脏数据
// （保存时后端 ValueType 校验会拒，但用户要到提交才知道）。
// 这里按 valueType 换控件：布尔给单选、数字给数字框、JSON 给专用编辑器，
// 从输入源头减少不匹配。

const valueType = computed<SystemConfigValueType | "">(
  () => newFormInline.value.valueType || "string"
);

const isBooleanType = computed(() => valueType.value === "boolean");

const isIntegerType = computed(
  () => valueType.value === "int" || valueType.value === "long"
);

const isNumberType = computed(
  () => isIntegerType.value || valueType.value === "double"
);

const numberLabel = computed(() => {
  if (valueType.value === "double") return "小数";
  return valueType.value === "long" ? "长整数" : "整数";
});

/** int 有明确的 32 位边界；long 交给数字框时不设上下限，避免误拦合法配置 */
const numberBounds = computed(() => {
  if (valueType.value === "int") {
    return { min: -2147483648, max: 2147483647, precision: 0 };
  }
  if (valueType.value === "long") {
    return { min: undefined, max: undefined, precision: 0 };
  }
  return { min: undefined, max: undefined, precision: undefined };
});

const rawConfigValue = computed(() =>
  String(newFormInline.value.configValue ?? "").trim()
);

/**
 * 数值型配置值：表单字段是 string，数字框要 number。
 * <p>
 * 取不到合法数字时返回 undefined 让输入框显示为空，而不是兜底成 0 ——
 * 兜底会把「原值不合法」悄悄改成「0」，属于静默篡改数据。
 */
const numericValue = computed<number | undefined>({
  get() {
    if (!rawConfigValue.value) return undefined;
    const parsed = Number(rawConfigValue.value);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
  set(val) {
    newFormInline.value.configValue =
      val === null || val === undefined || Number.isNaN(val) ? "" : String(val);
  }
});

/** 布尔型配置值：兼容库里存量的 1/0/yes/no/on/off 写法 */
const booleanValue = computed<"true" | "false" | "">({
  get() {
    return normalizeBooleanValue(newFormInline.value.configValue);
  },
  set(val) {
    newFormInline.value.configValue = val;
  }
});

const numberHint = computed(() => {
  if (rawConfigValue.value && numericValue.value === undefined) {
    return `当前值「${rawConfigValue.value}」不是合法${numberLabel.value}，请重新填写`;
  }
  if (valueType.value === "int") {
    return "整数，范围 -2147483648 ~ 2147483647";
  }
  if (valueType.value === "long") {
    return "长整数；超过 ±9007199254740991 会因浏览器数值精度失真，请慎用";
  }
  return "支持小数，如 0.75";
});

const booleanHint = computed(() => {
  if (rawConfigValue.value && !booleanValue.value) {
    return `当前值「${rawConfigValue.value}」不是合法布尔值，请重新选择 true / false`;
  }
  return "保存时写入 true / false";
});

/** 配置值校验随值类型变化，其余字段沿用公共规则 */
const rules = computed(() => ({
  ...formRules,
  configValue: buildConfigValueRules(valueType.value)
}));

/**
 * 切换值类型时清掉不兼容的旧值。
 * <p>
 * 不清会留下「控件显示为空、底层还存着旧值」的隐藏脏值：
 * 用户看着是空的，点确定却被校验拦住，比直接清空更困惑。
 * 此时弹窗尚未提交，清空不影响库里的数据。
 */
watch(valueType, (next, prev) => {
  if (!prev || next === prev) return;
  const raw = String(newFormInline.value.configValue ?? "").trim();
  if (!raw || isConfigValueCompatible(next, raw)) return;

  newFormInline.value.configValue = "";
  message(`值类型已切换，原值「${raw}」不符合新类型，已清空，请重新填写`, {
    type: "warning"
  });
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
    :rules="rules"
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

      <div v-else-if="isNumberType" class="config-value-editor">
        <el-input-number
          v-model="numericValue"
          :min="numberBounds.min"
          :max="numberBounds.max"
          :precision="numberBounds.precision"
          :step="isIntegerType ? 1 : 0.01"
          controls-position="right"
          placeholder="请输入数值"
          class="w-full!"
        />
        <div class="config-value-editor__hint">{{ numberHint }}</div>
      </div>

      <div v-else-if="isBooleanType" class="config-value-editor">
        <el-radio-group v-model="booleanValue">
          <el-radio value="true">true</el-radio>
          <el-radio value="false">false</el-radio>
        </el-radio-group>
        <div class="config-value-editor__hint">{{ booleanHint }}</div>
      </div>

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
