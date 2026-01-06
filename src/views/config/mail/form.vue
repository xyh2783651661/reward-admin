<script setup lang="ts">
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
      <el-select
        v-model="newFormInline.type"
        clearable
        placeholder="请选择类型"
      >
        <el-option key="NOTIFY" label="NOTIFY" value="NOTIFY" />
        <el-option key="SYSTEM" label="SYSTEM" value="SYSTEM" />
        <el-option key="ALARM" label="ALARM" value="ALARM" />
      </el-select>
    </el-form-item>

    <el-form-item label="组别" prop="groupCode">
      <el-input
        v-model="newFormInline.groupCode"
        clearable
        placeholder="请输入组别"
      />
    </el-form-item>

    <el-form-item label="优先级" prop="priority">
      <el-select
        v-model="newFormInline.priority"
        clearable
        placeholder="请选择优先级"
      >
        <el-option key="0" label="0" value="0" />
        <el-option key="1" label="1" value="1" />
        <el-option key="2" label="2" value="2" />
      </el-select>
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
