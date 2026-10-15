<script setup lang="ts">
import { computed } from "vue";
import type { SelectOption } from "./types";

defineOptions({ name: "ReSelect" });

const props = withDefaults(
  defineProps<{
    options?: SelectOption[];
    placeholder?: string;
    clearable?: boolean;
    /** 不传时选项超过 8 个自动开启搜索 */
    filterable?: boolean;
    /** 表单内默认撑满容器；筛选栏等固定宽度场景传 false 并自行指定宽度 */
    block?: boolean;
  }>(),
  {
    options: () => [],
    placeholder: "请选择",
    clearable: true,
    filterable: undefined,
    block: true
  }
);

const modelValue = defineModel<any>();

const AUTO_FILTER_THRESHOLD = 8;

const canFilter = computed(
  () => props.filterable ?? props.options.length > AUTO_FILTER_THRESHOLD
);
</script>

<template>
  <el-select
    v-model="modelValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :filterable="canFilter"
    :class="{ 're-select--block': block }"
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

<style scoped>
.re-select--block {
  width: 100%;
}
</style>
