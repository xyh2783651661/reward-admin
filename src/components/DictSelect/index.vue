<script setup lang="ts">
import { computed } from "vue";
import type { SelectOption } from "./types";

interface Props {
  /** v-model 绑定值（由各页面对应的筛选字段类型决定） */
  modelValue?: any;
  /** 选项列表 */
  options?: SelectOption[];
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: "large" | "default" | "small";
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  placeholder: "请选择",
  clearable: true,
  filterable: false,
  disabled: false,
  loading: false,
  size: "default"
});

const emit = defineEmits<{
  "update:modelValue": [value: any];
}>();

const value = computed({
  get: () => props.modelValue,
  set: v => emit("update:modelValue", v)
});
</script>

<template>
  <el-select
    v-model="value"
    :placeholder="placeholder"
    :clearable="clearable"
    :filterable="filterable"
    :disabled="disabled"
    :loading="loading"
    :size="size"
    v-bind="$attrs"
  >
    <el-option
      v-for="opt in options"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value"
      :disabled="opt.disabled"
    />
  </el-select>
</template>
