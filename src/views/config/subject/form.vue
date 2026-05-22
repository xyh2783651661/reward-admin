<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    name: "",
    type: "",
    stage: "",
    base: "",
    full: "",
    excellence: ""
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
    <el-form-item label="科目" prop="name">
      <el-input
        v-model="newFormInline.name"
        clearable
        placeholder="请输入角色名称"
      />
    </el-form-item>

    <el-form-item label="类型" prop="type">
      <el-select
        v-model="newFormInline.type"
        placeholder="请选择类型"
        clearable
      >
        <el-option label="CORE" value="CORE" />
        <el-option label="GENERAL" value="GENERAL" />
      </el-select>
    </el-form-item>

    <el-form-item label="学段" prop="stage">
      <el-select
        v-model="newFormInline.stage"
        placeholder="请选择学段"
        clearable
      >
        <el-option label="小学" value="小学" />
        <el-option label="初中" value="初中" />
        <el-option label="高中" value="高中" />
        <el-option label="大学" value="大学" />
      </el-select>
    </el-form-item>

    <el-form-item label="基础" prop="base">
      <el-input-number
        v-model="newFormInline.base"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入数值"
      />
    </el-form-item>

    <el-form-item label="卓越" prop="excellence">
      <el-input-number
        v-model="newFormInline.excellence"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入数值"
      />
    </el-form-item>

    <el-form-item label="满分" prop="full">
      <el-input-number
        v-model="newFormInline.full"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入数值"
      />
    </el-form-item>
  </el-form>
</template>
