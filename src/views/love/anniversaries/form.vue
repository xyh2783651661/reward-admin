<script setup lang="ts">
import { ReSelect, type SelectOption } from "@/components/ReSelect";
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

const anniversaryTypeOptions: SelectOption[] = [
  { label: "纪念日", value: "DATE" },
  { label: "其他", value: "OTHER" }
];

const repeatTypeOptions: SelectOption[] = [
  { label: "不重复", value: "NONE" },
  { label: "每年", value: "YEARLY" },
  { label: "每月", value: "MONTHLY" },
  { label: "每周", value: "WEEKLY" }
];
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
      <ReSelect
        v-model="newFormInline.anniversaryType"
        placeholder="请选择类型"
        :options="anniversaryTypeOptions"
      />
    </el-form-item>

    <el-form-item label="重复方式" prop="repeatType">
      <ReSelect
        v-model="newFormInline.repeatType"
        placeholder="请选择重复方式"
        :options="repeatTypeOptions"
      />
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
