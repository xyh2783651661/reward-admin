<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { getProviderModelOptions } from "@/api/ai-provider-model";
import { AI_PROVIDERS, getProviderLabel } from "@/constants/ai-provider";
import type { SelectOption } from "@/components/ReSelect/types";

defineOptions({ name: "ImageProviderModelsField" });

interface ModelRow {
  provider: string;
  modelName: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
  }>(),
  { modelValue: "" }
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const rows = ref<ModelRow[]>([]);
const modelOptions = ref<Record<string, SelectOption[]>>({});
const loadingMap = ref<Record<string, boolean>>({});
/** 记录最近一次自身派发的值，避免父级回写时打断正在输入的模型名 */
let lastEmitted = "";

/** 图片理解只支持已接入的供应商，未接入的即使补录也无法调用 */
const providerOptions = computed(() =>
  AI_PROVIDERS.filter(item => item.enabled).map(item => ({
    value: item.provider,
    label: item.label
  }))
);

function optionsOf(provider: string): SelectOption[] {
  return modelOptions.value[provider] ?? [];
}

async function loadOptions(provider: string) {
  if (!provider || modelOptions.value[provider] || loadingMap.value[provider]) {
    return;
  }
  loadingMap.value[provider] = true;
  try {
    const { data } = await getProviderModelOptions(provider, "VISION");
    modelOptions.value = { ...modelOptions.value, [provider]: data ?? [] };
  } catch (error) {
    message(
      getErrorMessage(
        error,
        `加载「${getProviderLabel(provider)}」视觉模型失败`
      ),
      { type: "error" }
    );
  } finally {
    loadingMap.value[provider] = false;
  }
}

function parse(value?: string) {
  if (!value || !value.trim()) {
    rows.value = [];
    return;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      rows.value = [];
      return;
    }
    rows.value = Object.entries(parsed).map(([provider, modelName]) => ({
      provider,
      modelName: modelName == null ? "" : String(modelName)
    }));
    rows.value.forEach(row => void loadOptions(row.provider));
  } catch {
    // 非法 JSON 交给 ReJsonField 与后端 valueType 校验提示，这里不重复报错
    rows.value = [];
  }
}

function emitChange() {
  const result: Record<string, string> = {};
  rows.value.forEach(({ provider, modelName }) => {
    if (provider && modelName) result[provider] = modelName;
  });
  const json = JSON.stringify(result);
  lastEmitted = json;
  emit("update:modelValue", json);
}

function addRow() {
  rows.value.push({ provider: "", modelName: "" });
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  emitChange();
}

function handleProviderChange(row: ModelRow) {
  row.modelName = "";
  emitChange();
  void loadOptions(row.provider);
}

/** 已被其它行占用的供应商不再重复出现在下拉中 */
function providerOptionsOf(current?: string) {
  const used = rows.value
    .map(row => row.provider)
    .filter(item => item && item !== current);
  return providerOptions.value.filter(item => !used.includes(item.value));
}

function syncStatusOf(provider: string) {
  if (!provider) return "";
  if (loadingMap.value[provider]) return "加载中…";
  const options = optionsOf(provider);
  if (!options.length) return "暂无视觉模型，可直接手输或先同步模型目录";
  return "";
}

watch(
  () => props.modelValue,
  value => {
    if ((value ?? "") === lastEmitted) return;
    parse(value);
  },
  { immediate: true }
);

addRowIfEmpty();

function addRowIfEmpty() {
  if (!rows.value.length) addRow();
}
</script>

<template>
  <div class="image-provider-models">
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="image-provider-models__row"
    >
      <el-select
        v-model="row.provider"
        filterable
        placeholder="供应商"
        class="image-provider-models__provider"
        @change="handleProviderChange(row)"
      >
        <el-option
          v-for="item in providerOptionsOf(row.provider)"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="row.modelName"
        filterable
        clearable
        allow-create
        default-first-option
        :loading="Boolean(loadingMap[row.provider])"
        placeholder="视觉模型（可手输）"
        class="image-provider-models__model"
        @change="emitChange"
      >
        <el-option
          v-for="item in optionsOf(row.provider)"
          :key="String(item.value)"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-button
        link
        type="danger"
        :disabled="rows.length <= 1"
        @click="removeRow(index)"
      >
        移除
      </el-button>

      <span
        v-if="syncStatusOf(row.provider)"
        class="image-provider-models__hint"
      >
        {{ syncStatusOf(row.provider) }}
      </span>
    </div>

    <el-button link type="primary" @click="addRow">+ 添加供应商</el-button>
    <div class="image-provider-models__tip">
      每个供应商只填一个模型，必须支持图片理解（VISION）能力；留空或未填模型的供应商不会写入配置。
    </div>
  </div>
</template>

<style lang="scss" scoped>
.image-provider-models {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.image-provider-models__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.image-provider-models__provider {
  width: 160px;
}

.image-provider-models__model {
  width: 260px;
}

.image-provider-models__hint {
  font-size: var(--ra-font-xs);
  color: var(--el-color-warning);
}

.image-provider-models__tip {
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
