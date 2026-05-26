<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    title: "",
    anniversaryDate: "",
    anniversaryType: "DATE",
    repeatType: "YEARLY",
    remark: "",
    remindDays: 3,
    status: 1
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
    label-width="100px"
  >
    <el-form-item label="标题" prop="title">
      <el-input
        v-model="newFormInline.title"
        clearable
        placeholder="请输入标题"
      />
    </el-form-item>

    <el-form-item label="日期" prop="anniversaryDate">
      <el-date-picker
        v-model="newFormInline.anniversaryDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="请选择日期"
        clearable
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="类型" prop="anniversaryType">
      <el-select
        v-model="newFormInline.anniversaryType"
        placeholder="请选择类型"
        clearable
      >
        <el-option label="纪念日" value="DATE" />
        <el-option label="其他" value="OTHER" />
      </el-select>
    </el-form-item>

    <el-form-item label="重复方式" prop="repeatType">
      <el-select
        v-model="newFormInline.repeatType"
        placeholder="请选择重复方式"
        clearable
      >
        <el-option label="不重复" value="NONE" />
        <el-option label="每年" value="YEARLY" />
        <el-option label="每月" value="MONTHLY" />
        <el-option label="每周" value="WEEKLY" />
      </el-select>
    </el-form-item>

    <el-form-item label="提前提醒天数" prop="remindDays">
      <el-input-number
        v-model="newFormInline.remindDays"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入提前提醒天数"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="newFormInline.remark"
        type="textarea"
        placeholder="请输入备注"
      />
    </el-form-item>
  </el-form>
</template>
