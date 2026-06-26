<script setup lang="ts">
import { ref } from "vue";

const newFormInline = ref({ password: "", confirm: "" });

function getRef() {
  return newFormInline.value;
}

function reset() {
  newFormInline.value = { password: "", confirm: "" };
}

defineExpose({ getRef, reset });
</script>

<template>
  <el-form label-width="82px">
    <el-form-item label="新密码">
      <el-input
        v-model="newFormInline.password"
        type="password"
        show-password
        placeholder="请输入新密码"
      />
    </el-form-item>
    <el-form-item label="确认密码">
      <el-input
        v-model="newFormInline.confirm"
        type="password"
        show-password
        placeholder="请再次输入新密码"
      />
    </el-form-item>
  </el-form>
</template>
