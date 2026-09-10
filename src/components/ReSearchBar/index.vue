<script setup lang="ts">
import { computed, ref } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "@/views/monitor/utils";
import type { SearchField, SearchFieldWidth } from "./types";
import Refresh from "~icons/ep/refresh";
import ArrowDown from "~icons/ep/arrow-down";
import ArrowUp from "~icons/ep/arrow-up";

interface Props {
  modelValue: Record<string, any>;
  fields: SearchField[];
  loading?: boolean;
  /** 常显项数量；fields.length <= visibleCount 时不显示展开按钮 */
  visibleCount?: number;
  labelWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  visibleCount: 3,
  labelWidth: "auto"
});

const emit = defineEmits<{
  (e: "search"): void;
  /** 携带 el-form 实例，页面 hook 的 resetForm(formEl) 可直接接收 */
  (e: "reset", formEl: any): void;
}>();

// 搜索表单对象由页面 hook 持有（reactive），此处原地读写以保证 resetFields 生效
const model = computed(() => props.modelValue);

const formRef = ref();
const expanded = ref(false);

const collapsible = computed(() => props.fields.length > props.visibleCount);
const visibleFields = computed(() =>
  expanded.value || !collapsible.value
    ? props.fields
    : props.fields.slice(0, props.visibleCount)
);

/**
 * 宽度类名 → 实际宽度由 `src/style/index.scss` 的 `--ra-search-width` token 驱动。
 *
 * 为什么不能把宽度类直接挂在 el-select 上：
 * Element Plus 的宽度规则是 `.el-select { width: var(--el-select-width) }`，
 * `--el-select-width` 默认 100%，与自定义 width 同特异性且后加载，会覆盖掉它。
 * 因此宽度类统一挂在 el-form-item 上，由 CSS 侧改写 EP 各自读取的宽度变量，
 * 这样 el-input / el-select / el-date-editor / el-input-number 能被同一套 token 约束。
 */
function widthClass(field: SearchField) {
  const width: SearchFieldWidth = field.width ?? "md";
  if (field.type === "daterange") return "ra-daterange";
  if (field.type === "datetimerange") return "ra-datetimerange";
  if (field.type === "select") {
    return width === "sm" ? "ra-select-sm" : "ra-select";
  }
  if (width === "lg") return "ra-input-lg";
  if (width === "sm") return "ra-input-sm";
  return "ra-input";
}

function placeholderOf(field: SearchField) {
  if (field.placeholder) return field.placeholder;
  if (field.type === "select") return `全部${field.label}`;
  if (
    field.type === "date" ||
    field.type === "daterange" ||
    field.type === "datetimerange"
  ) {
    return `请选择${field.label}`;
  }
  return `请输入${field.label}`;
}

function handleSearch() {
  emit("search");
}

function handleReset() {
  // 页面 hook 的 resetForm 会调用 resetFields 并重置页码，这里只把表单实例交出去
  emit("reset", formRef.value);
}

function toggleExpanded() {
  expanded.value = !expanded.value;
}

defineExpose({ getRef: () => formRef.value, expanded });
</script>

<template>
  <el-form
    ref="formRef"
    v-search-enter="handleSearch"
    :inline="true"
    :model="modelValue"
    :label-width="labelWidth"
    class="search-form bg-bg_color w-full"
  >
    <el-form-item
      v-for="field in visibleFields"
      :key="field.prop"
      :label="`${field.label}：`"
      :prop="field.prop"
      :class="widthClass(field)"
    >
      <el-select
        v-if="field.type === 'select'"
        v-model="model[field.prop]"
        :placeholder="placeholderOf(field)"
        :loading="field.optionsLoading"
        :filterable="field.filterable"
        :allow-create="field.allowCreate"
        :default-first-option="field.allowCreate"
        popper-class="ra-select-popper"
        clearable
      >
        <el-option
          v-for="option in field.options ?? []"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <el-date-picker
        v-else-if="field.type === 'date'"
        v-model="model[field.prop]"
        type="date"
        :placeholder="placeholderOf(field)"
        :value-format="field.valueFormat ?? 'YYYY-MM-DD'"
        clearable
      />
      <el-date-picker
        v-else-if="field.type === 'daterange'"
        v-model="model[field.prop]"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :value-format="field.valueFormat ?? 'YYYY-MM-DD'"
        :shortcuts="field.shortcuts ? getPickerShortcuts() : undefined"
        clearable
      />
      <el-date-picker
        v-else-if="field.type === 'datetimerange'"
        v-model="model[field.prop]"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始日期时间"
        end-placeholder="结束日期时间"
        :value-format="field.valueFormat"
        :shortcuts="field.shortcuts ? getPickerShortcuts() : undefined"
        clearable
      />
      <el-input-number
        v-else-if="field.type === 'input-number'"
        v-model="model[field.prop]"
        :placeholder="placeholderOf(field)"
        :min="field.min"
        :max="field.max"
        controls-position="right"
      />
      <el-input
        v-else
        v-model="model[field.prop]"
        :placeholder="placeholderOf(field)"
        clearable
      />
    </el-form-item>

    <el-form-item>
      <el-button
        type="primary"
        :icon="useRenderIcon('ri/search-line')"
        :loading="loading"
        @click="handleSearch"
      >
        搜索
      </el-button>
      <el-button :icon="useRenderIcon(Refresh)" @click="handleReset">
        重置
      </el-button>
      <el-button
        v-if="collapsible"
        link
        type="primary"
        :icon="useRenderIcon(expanded ? ArrowUp : ArrowDown)"
        @click="toggleExpanded"
      >
        {{ expanded ? "收起" : "展开" }}
      </el-button>
    </el-form-item>
  </el-form>
</template>
