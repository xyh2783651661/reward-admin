<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    roleCode: "",
    roleName: "",
    status: 1,
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
    <el-form-item label="角色编码" prop="roleCode">
      <el-input
        v-model="newFormInline.roleCode"
        :disabled="!!newFormInline.id"
        placeholder="如 admin / common"
      />
    </el-form-item>
    <el-form-item label="角色名称" prop="roleName">
      <el-input v-model="newFormInline.roleName" placeholder="请输入角色名称" />
    </el-form-item>
    <el-form-item label="状态">
      <el-switch
        v-model="newFormInline.status"
        :active-value="1"
        :inactive-value="0"
      />
    </el-form-item>
    <el-form-item label="备注">
      <el-input
        v-model="newFormInline.remark"
        type="textarea"
        placeholder="请输入备注"
      />
    </el-form-item>
  </el-form>
</template>
