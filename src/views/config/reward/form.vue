<script setup lang="ts">
import { ReSelect, type SelectOption } from "@/components/ReSelect";
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import ReJsonField from "@/components/ReJsonField/index.vue";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    rewardKey: "",
    rewardType: "",
    rewardValue: "",
    description: "",
    condition: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });

const rewardTypeOptions: SelectOption[] = [
  { label: "BASE", value: "BASE" },
  { label: "EXTRA", value: "EXTRA" },
  { label: "SPECIAL", value: "SPECIAL" }
];
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="82px"
  >
    <el-form-item label="KEY" prop="rewardKey">
      <el-input
        v-model="newFormInline.rewardKey"
        clearable
        placeholder="请输入KEY"
      />
    </el-form-item>

    <el-form-item label="类型" prop="rewardType">
      <ReSelect
        v-model="newFormInline.rewardType"
        placeholder="请选择类型"
        :options="rewardTypeOptions"
      />
    </el-form-item>

    <el-form-item label="数值" prop="rewardValue">
      <el-input-number
        v-model="newFormInline.rewardValue"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入数值"
      />
    </el-form-item>

    <el-form-item label="标签" prop="description">
      <el-input
        v-model="newFormInline.description"
        clearable
        placeholder="请输入标签"
      />
    </el-form-item>

    <el-form-item label="条件" prop="condition">
      <ReJsonField
        v-model="newFormInline.condition"
        placeholder='纯文本描述，或 JSON 参数（如 {"rankDiff": 20, "fallbackTopN": 5}）'
      />
    </el-form-item>
  </el-form>
</template>
