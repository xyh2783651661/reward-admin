<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
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
      <el-select
        v-model="newFormInline.rewardType"
        placeholder="请选择类型"
        clearable
      >
        <el-option label="BASE" value="BASE" />
        <el-option label="EXTRA" value="EXTRA" />
        <el-option label="SPECIAL" value="SPECIAL" />
      </el-select>
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
      <el-input
        v-model="newFormInline.condition"
        placeholder="请输入条件"
        type="textarea"
      />
    </el-form-item>
  </el-form>
</template>
