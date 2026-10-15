<script setup lang="ts">
import { ReSelect } from "@/components/ReSelect";
import { ref, watch } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    ruleKey: "",
    ruleType: "",
    ruleValue: "",
    description: ""
  }),
  ruleKeyOptions: () => [],
  ruleTypeOptions: () => []
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

watch(
  () => newFormInline.value.ruleKey,
  val => {
    if (val) {
      const sanitized = val.replace(/[^A-Za-z0-9_]/g, "").toUpperCase();
      if (sanitized !== val) {
        newFormInline.value.ruleKey = sanitized;
      }
    }
  }
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
    label-width="82px"
  >
    <el-form-item label="规则标识" prop="ruleKey">
      <ReSelect
        v-model="newFormInline.ruleKey"
        placeholder="请选择或输入规则标识"
        :disabled="!!newFormInline.id"
        filterable
        allow-create
        :options="ruleKeyOptions"
      />
    </el-form-item>

    <el-form-item label="规则类型" prop="ruleType">
      <ReSelect
        v-model="newFormInline.ruleType"
        placeholder="请选择规则类型"
        :options="ruleTypeOptions"
      />
    </el-form-item>

    <el-form-item label="金额数值" prop="ruleValue">
      <el-input-number
        v-model="newFormInline.ruleValue"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入金额数值"
      />
    </el-form-item>

    <el-form-item label="规则描述" prop="description">
      <el-input
        v-model="newFormInline.description"
        clearable
        placeholder="请输入规则描述"
      />
    </el-form-item>
  </el-form>
</template>
