<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    username: "",
    password: "",
    nickname: "",
    avatar: "",
    phone: "",
    email: "",
    status: 1,
    remark: "",
    roleIds: []
  }),
  roleOptions: () => []
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const roleOptions = ref(props.roleOptions);

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
    <el-form-item label="用户名" prop="username">
      <el-input
        v-model="newFormInline.username"
        :disabled="!!newFormInline.id"
        placeholder="请输入用户名"
      />
    </el-form-item>
    <el-form-item v-if="!newFormInline.id" label="密码">
      <el-input
        v-model="newFormInline.password"
        type="password"
        show-password
        placeholder="留空则默认 123456"
      />
    </el-form-item>
    <el-form-item label="昵称">
      <el-input v-model="newFormInline.nickname" placeholder="请输入昵称" />
    </el-form-item>
    <el-form-item label="手机号">
      <el-input v-model="newFormInline.phone" placeholder="请输入手机号" />
    </el-form-item>
    <el-form-item label="邮箱">
      <el-input v-model="newFormInline.email" placeholder="请输入邮箱" />
    </el-form-item>
    <el-form-item label="角色">
      <el-select
        v-model="newFormInline.roleIds"
        multiple
        clearable
        class="w-full"
        placeholder="请选择角色"
      >
        <el-option
          v-for="r in roleOptions"
          :key="r.id"
          :label="r.roleName"
          :value="r.id"
        />
      </el-select>
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
