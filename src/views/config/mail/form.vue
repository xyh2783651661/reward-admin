<script setup lang="ts">
import { ReSelect, type SelectOption } from "@/components/ReSelect";
import { ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    email: "",
    name: "",
    enabled: true,
    type: "",
    groupCode: "",
    priority: "",
    remark: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });

const typeOptions: SelectOption[] = [
  { label: "NOTIFY", value: "NOTIFY" },
  { label: "SYSTEM", value: "SYSTEM" },
  { label: "ALARM", value: "ALARM" }
];

const priorityOptions: SelectOption[] = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" }
];
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="82px"
  >
    <el-form-item label="邮件" prop="email">
      <el-input
        v-model="newFormInline.email"
        type="email"
        clearable
        placeholder="请输入邮件"
      />
    </el-form-item>

    <el-form-item label="姓名" prop="name">
      <el-input
        v-model="newFormInline.name"
        clearable
        placeholder="请输入姓名"
      />
    </el-form-item>

    <el-form-item label="状态" prop="enabled">
      <el-switch
        v-model="newFormInline.enabled"
        active-text="已启用"
        inactive-text="已禁用"
        class="ml-2"
        inline-prompt
        style="

--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
      />
    </el-form-item>

    <el-form-item label="类型" prop="type">
      <ReSelect
        v-model="newFormInline.type"
        placeholder="请选择类型"
        :options="typeOptions"
      />
    </el-form-item>

    <el-form-item label="组别" prop="groupCode">
      <el-input
        v-model="newFormInline.groupCode"
        clearable
        placeholder="请输入组别"
      />
    </el-form-item>

    <el-form-item label="优先级" prop="priority">
      <ReSelect
        v-model="newFormInline.priority"
        placeholder="请选择优先级"
        :options="priorityOptions"
      />
    </el-form-item>

    <el-form-item label="备注">
      <el-input
        v-model="newFormInline.remark"
        placeholder="请输入备注信息"
        type="textarea"
      />
    </el-form-item>
  </el-form>
</template>
