<script setup lang="ts">
import { computed, ref } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    configKey: "",
    configValue: "",
    configGroup: "",
    valueType: "string",
    description: "",
    status: 1,
    sensitive: 0
  }),
  formOptions: () => ({
    valueTypes: [],
    statusOptions: [],
    sensitiveOptions: [],
    groups: []
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const formOptions = computed(() => props.formOptions);
const configValuePlaceholder = computed(() => {
  return newFormInline.value.valueType === "json"
    ? "请输入合法 JSON，提交时会自动压缩为字符串"
    : "请输入配置值";
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
    label-width="96px"
  >
    <el-form-item label="配置 Key" prop="configKey">
      <el-input
        v-model.trim="newFormInline.configKey"
        clearable
        maxlength="128"
        placeholder="请输入配置 Key"
      />
    </el-form-item>

    <el-form-item label="配置分组" prop="configGroup">
      <el-select
        v-model="newFormInline.configGroup"
        filterable
        allow-create
        default-first-option
        clearable
        placeholder="请选择或输入配置分组"
      >
        <el-option
          v-for="item in formOptions.groups"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="值类型" prop="valueType">
      <el-select
        v-model="newFormInline.valueType"
        clearable
        placeholder="请选择值类型"
      >
        <el-option
          v-for="item in formOptions.valueTypes"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="配置值" prop="configValue">
      <el-input
        v-model="newFormInline.configValue"
        :rows="4"
        :placeholder="configValuePlaceholder"
        type="textarea"
      />
    </el-form-item>

    <el-form-item label="配置说明" prop="description">
      <el-input
        v-model="newFormInline.description"
        :rows="3"
        maxlength="255"
        placeholder="请输入配置说明"
        show-word-limit
        type="textarea"
      />
    </el-form-item>

    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="newFormInline.status">
        <el-radio
          v-for="item in formOptions.statusOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="敏感标识" prop="sensitive">
      <el-radio-group v-model="newFormInline.sensitive">
        <el-radio
          v-for="item in formOptions.sensitiveOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>
  </el-form>
</template>
