<script setup lang="ts">
import { ref, computed } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    title: "",
    content: "",
    noticeType: "",
    priority: "",
    platformMask: [] as number[],
    minVersion: "",
    publishTime: "",
    offlineTime: "",
    operator: "",
    status: 0
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

// Computed property to ensure platformMask is always an array for checkbox group
const platformMaskArray = computed({
  get: () => {
    const val = newFormInline.value.platformMask;
    if (Array.isArray(val)) return val;
    if (typeof val === "number") {
      const result: number[] = [];
      if (val & 1) result.push(1);
      if (val & 2) result.push(2);
      if (val & 4) result.push(4);
      return result;
    }
    return [];
  },
  set: (val: number[]) => {
    newFormInline.value.platformMask = val;
  }
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
    label-width="100px"
  >
    <el-form-item label="标题" prop="title">
      <el-input
        v-model="newFormInline.title"
        clearable
        placeholder="请输入公告标题"
      />
    </el-form-item>

    <el-form-item label="内容" prop="content">
      <el-input
        v-model="newFormInline.content"
        type="textarea"
        :rows="4"
        placeholder="请输入公告内容"
      />
    </el-form-item>

    <el-form-item label="公告类型" prop="noticeType">
      <el-select
        v-model="newFormInline.noticeType"
        placeholder="请选择公告类型"
        clearable
      >
        <el-option label="功能更新" :value="1" />
        <el-option label="系统公告" :value="2" />
      </el-select>
    </el-form-item>

    <el-form-item label="优先级" prop="priority">
      <el-select
        v-model="newFormInline.priority"
        placeholder="请选择优先级"
        clearable
      >
        <el-option label="信息" :value="4" />
        <el-option label="普通" :value="5" />
        <el-option label="警告" :value="7" />
        <el-option label="紧急" :value="9" />
      </el-select>
    </el-form-item>

    <el-form-item label="目标平台" prop="platformMask">
      <el-checkbox-group v-model="platformMaskArray">
        <el-checkbox :value="1" label="Web" />
        <el-checkbox :value="2" label="Android" />
        <el-checkbox :value="4" label="iOS" />
      </el-checkbox-group>
    </el-form-item>

    <el-form-item label="最低版本" prop="minVersion">
      <el-input
        v-model="newFormInline.minVersion"
        clearable
        placeholder="请输入最低版本号"
      />
    </el-form-item>

    <el-form-item label="发布时间" prop="publishTime">
      <el-date-picker
        v-model="newFormInline.publishTime"
        type="datetime"
        placeholder="请选择发布时间"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DD HH:mm:ss"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="下线时间" prop="offlineTime">
      <el-date-picker
        v-model="newFormInline.offlineTime"
        type="datetime"
        placeholder="请选择下线时间"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DD HH:mm:ss"
        style="width: 100%"
      />
    </el-form-item>
  </el-form>
</template>
