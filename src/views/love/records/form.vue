<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    date: "",
    text: "",
    mood: "",
    location: { name: "", latitude: 0, longitude: 0 },
    mediaIds: []
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
    <el-form-item label="日期" prop="date">
      <el-date-picker
        v-model="newFormInline.date"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="请选择日期"
        clearable
      />
    </el-form-item>

    <el-form-item label="内容" prop="text">
      <el-input
        v-model="newFormInline.text"
        type="textarea"
        :rows="4"
        placeholder="请输入内容"
      />
    </el-form-item>

    <el-form-item label="心情" prop="mood">
      <el-input
        v-model="newFormInline.mood"
        clearable
        placeholder="请输入心情"
      />
    </el-form-item>

    <el-form-item label="地点" prop="location.name">
      <el-input
        v-model="newFormInline.location.name"
        clearable
        placeholder="请输入地点名称"
      />
    </el-form-item>
  </el-form>
</template>
