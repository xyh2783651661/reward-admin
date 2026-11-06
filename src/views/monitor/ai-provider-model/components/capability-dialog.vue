<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import {
  buildCapabilityOptions,
  getCapabilityMeta,
  getProviderLabel
} from "@/constants/ai-provider";
import type { CapabilityForm } from "../types";

defineOptions({ name: "AiProviderModelCapability" });

const props = withDefaults(
  defineProps<{
    formInline?: CapabilityForm;
  }>(),
  {
    formInline: () => ({
      id: 0,
      provider: "",
      modelName: "",
      capabilities: []
    })
  }
);

const ruleFormRef = ref<FormInstance>();
// 保持与父级入参同一对象引用，beforeSure 才能从 options.props.formInline 取到用户输入
const newFormInline = ref<CapabilityForm>(props.formInline);

const capabilityOptions = buildCapabilityOptions();

const formRules: FormRules = {
  capabilities: [
    {
      required: true,
      type: "array",
      min: 1,
      message: "至少选择一个能力标签",
      trigger: "change"
    }
  ]
};

const providerLabel = computed(() =>
  getProviderLabel(newFormInline.value.provider)
);

/** 当前已选能力的含义说明，帮助判断是否选错（如把纯文本模型标成图片理解） */
const selectedHint = computed(() => {
  const labels = newFormInline.value.capabilities
    .map(item => getCapabilityMeta(item)?.label)
    .filter(Boolean);
  return labels.length ? `已选择：${labels.join("、")}` : "未选择能力";
});

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
    <el-form-item label="供应商">
      <span>{{ providerLabel }}（{{ newFormInline.provider }}）</span>
    </el-form-item>

    <el-form-item label="模型 ID">
      <span class="font-mono">{{ newFormInline.modelName }}</span>
    </el-form-item>

    <el-form-item label="能力标签" prop="capabilities">
      <el-select
        v-model="newFormInline.capabilities"
        multiple
        filterable
        placeholder="请选择能力"
        class="w-full"
      >
        <el-option
          v-for="item in capabilityOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <div class="form-tip">{{ selectedHint }}</div>
    </el-form-item>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="手工修正后来源会变为 MANUAL，后续同步不再覆盖该模型的能力标签"
      description="图片理解只能选带「图片理解」能力的模型；向量化 / 重排 / 文生图模型不可用于对话。"
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
</style>
