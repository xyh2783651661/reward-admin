<script setup lang="ts">
import { ReSelect, type SelectOption } from "@/components/ReSelect";
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
    excellence: "",
    sort: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });

const typeOptions: SelectOption[] = [
  { label: "CORE", value: "CORE" },
  { label: "GENERAL", value: "GENERAL" }
];

const stageOptions: SelectOption[] = [
  { label: "小学", value: "小学" },
  { label: "初中", value: "初中" },
  { label: "高中", value: "高中" },
  { label: "大学", value: "大学" }
];
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
        placeholder="请输入科目名称"
      />
    </el-form-item>

    <el-form-item label="类型" prop="type">
      <ReSelect
        v-model="newFormInline.type"
        placeholder="请选择类型"
        :options="typeOptions"
      />
    </el-form-item>

    <el-form-item label="学段" prop="stage">
      <ReSelect
        v-model="newFormInline.stage"
        placeholder="请选择学段"
        :options="stageOptions"
      />
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

    <el-form-item label="排序" prop="sort">
      <el-input-number
        v-model="newFormInline.sort"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="数值越小越靠前，留空自动排到末尾"
      />
    </el-form-item>
  </el-form>
</template>
