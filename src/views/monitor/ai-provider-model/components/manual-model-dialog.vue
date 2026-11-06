<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import {
  AI_CAPABILITIES,
  AI_PROVIDERS,
  buildCapabilityOptions,
  buildProviderOptions
} from "@/constants/ai-provider";
import type { ManualModelForm } from "../types";

defineOptions({ name: "AiProviderModelManual" });

const props = withDefaults(
  defineProps<{
    formInline?: ManualModelForm;
  }>(),
  {
    formInline: () => ({
      provider: "",
      modelName: "",
      displayName: "",
      capabilities: []
    })
  }
);

const ruleFormRef = ref<FormInstance>();
// 保持与父级入参同一对象引用，beforeSure 才能从 options.props.formInline 取到用户输入
const newFormInline = ref<ManualModelForm>(props.formInline);

const providerOptions = buildProviderOptions();
const capabilityOptions = buildCapabilityOptions();

const formRules: FormRules = {
  provider: [{ required: true, message: "请选择供应商", trigger: "change" }],
  modelName: [
    { required: true, message: "请输入供应商真实模型 ID", trigger: "blur" }
  ]
};

/** 不选能力时后端按模型名自动推断，这里给出提示文案 */
const capabilityHint = computed(() =>
  newFormInline.value.capabilities.length
    ? "手工指定的能力标签不会被后续同步覆盖"
    : "留空则由后端按模型名自动推断能力标签"
);

/** 该供应商在后端枚举里是否已接入 */
const providerMeta = computed(() =>
  AI_PROVIDERS.find(item => item.provider === newFormInline.value.provider)
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
    <el-form-item label="供应商" prop="provider">
      <el-select
        v-model="newFormInline.provider"
        filterable
        placeholder="请选择供应商"
        class="w-full"
      >
        <el-option
          v-for="item in providerOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="模型 ID" prop="modelName">
      <el-input
        v-model.trim="newFormInline.modelName"
        clearable
        maxlength="191"
        placeholder="供应商返回的模型 ID，如 ernie-5.1"
      />
    </el-form-item>

    <el-form-item label="展示名" prop="displayName">
      <el-input
        v-model.trim="newFormInline.displayName"
        clearable
        maxlength="191"
        placeholder="留空时与模型 ID 相同"
      />
    </el-form-item>

    <el-form-item label="能力标签" prop="capabilities">
      <el-select
        v-model="newFormInline.capabilities"
        multiple
        filterable
        placeholder="留空自动推断"
        class="w-full"
      >
        <el-option
          v-for="item in capabilityOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <div class="form-tip">{{ capabilityHint }}</div>
    </el-form-item>

    <el-alert
      v-if="providerMeta && !providerMeta.enabled"
      type="warning"
      :closable="false"
      show-icon
      :title="`${providerMeta.label} 在后端供应商枚举中标记为未接入，补录后仍可能无法调用`"
    />

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mt-2"
      title="手工补录用于供应商没有 /models 接口或同步失败时的兜底"
      :description="`仅对话类模型可参与路由；可选能力：${AI_CAPABILITIES.map(item => item.label).join('、')}`"
    />
  </el-form>
</template>

<style lang="scss" scoped>
.form-tip {
  margin-top: 4px;
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.mt-2 {
  margin-top: 8px;
}
</style>
