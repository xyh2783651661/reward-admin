<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { message } from "@/utils/message";

interface Props {
  /** v-model 值。始终以字符串形式对外交互，方便直接绑到 form 表单字段。 */
  modelValue?: string;
  /** 只读模式：不显示 textarea，改用 tag 列表展示（用于表格 cellRenderer / 详情展示）。 */
  readonly?: boolean;
  /** textarea 占位符（仅可编辑模式）。 */
  placeholder?: string;
  /**
   * 未识别成 JSON 时的降级展示：
   * - "text"（默认）：直接把原字符串按纯文本渲染
   * - "hide"：只有 JSON 才渲染，纯文本时返回 "-"
   */
  fallback?: "text" | "hide";
  /** textarea 最小行数（仅可编辑模式）。 */
  minRows?: number;
  /** textarea 最大行数（仅可编辑模式）。 */
  maxRows?: number;
  /** description 字段的键名。JSON 中该字段单独渲染为灰色说明，不作为参数 tag。 */
  descriptionKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  readonly: false,
  placeholder: '纯文本或 JSON（如 {"key": "value"}）',
  fallback: "text",
  minRows: 3,
  maxRows: 10,
  descriptionKey: "description"
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const internal = ref(props.modelValue ?? "");
watch(
  () => props.modelValue,
  v => {
    if (v !== internal.value) internal.value = v ?? "";
  }
);
watch(internal, v => emit("update:modelValue", v));

/** 解析当前值 */
const parsed = computed<{
  isJson: boolean;
  invalid: boolean;
  hint: string;
  obj: Record<string, any> | null;
}>(() => {
  const raw = (internal.value ?? "").trim();
  if (!raw) return { isJson: false, invalid: false, hint: "", obj: null };
  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    return { isJson: false, invalid: false, hint: "纯文本", obj: null };
  }
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const keys = Object.keys(obj).filter(k => k !== props.descriptionKey);
      return {
        isJson: true,
        invalid: false,
        hint: `已识别 JSON（${keys.length} 项：${keys.join(", ") || "无"}）`,
        obj
      };
    }
    return {
      isJson: true,
      invalid: false,
      hint: `已识别 JSON（${Array.isArray(obj) ? "数组" : typeof obj}）`,
      obj: null
    };
  } catch (e: any) {
    return {
      isJson: true,
      invalid: true,
      hint: `JSON 解析失败：${e?.message ?? "格式错误"}`,
      obj: null
    };
  }
});

/** 只读模式展示的键值对（description 单独取出） */
const displayParts = computed(() => {
  if (!parsed.value.obj) return { params: [], desc: "" };
  const { [props.descriptionKey]: desc, ...rest } = parsed.value.obj;
  return {
    params: Object.entries(rest),
    desc: desc == null ? "" : String(desc)
  };
});

/** 手动格式化 JSON */
function formatJson() {
  const raw = (internal.value ?? "").trim();
  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    message("非 JSON 内容，无需格式化", { type: "info" });
    return;
  }
  try {
    const obj = JSON.parse(raw);
    internal.value = JSON.stringify(obj, null, 2);
    message("已格式化", { type: "success" });
  } catch (e: any) {
    message(`格式化失败：${e?.message ?? "非法 JSON"}`, { type: "error" });
  }
}

function stringifyValue(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
</script>

<template>
  <!-- ==================== 只读模式 ==================== -->
  <template v-if="readonly">
    <span v-if="!internal" class="text-gray-400">-</span>
    <template v-else-if="parsed.obj">
      <div>
        <div class="flex flex-wrap">
          <el-tag
            v-for="[k, v] in displayParts.params"
            :key="k"
            size="small"
            type="info"
            effect="plain"
            class="mr-1 mb-1"
          >
            {{ k }} = {{ stringifyValue(v) }}
          </el-tag>
        </div>
        <div
          v-if="displayParts.desc"
          class="text-xs text-gray-500 mt-1"
          style="white-space: pre-wrap"
        >
          {{ displayParts.desc }}
        </div>
      </div>
    </template>
    <template v-else-if="fallback === 'text'">
      <span style="word-break: break-all; white-space: pre-wrap">
        {{ internal }}
      </span>
    </template>
    <template v-else>
      <span class="text-gray-400">-</span>
    </template>
  </template>

  <!-- ==================== 可编辑模式 ==================== -->
  <div v-else class="w-full">
    <el-input
      v-model="internal"
      type="textarea"
      :autosize="{ minRows, maxRows }"
      :placeholder="placeholder"
      class="font-mono"
    />
    <div class="flex items-center justify-between mt-1">
      <span
        class="text-xs"
        :class="{
          'text-red-500': parsed.invalid,
          'text-green-600': parsed.isJson && !parsed.invalid,
          'text-gray-500': !parsed.isJson && !parsed.invalid
        }"
      >
        {{ parsed.hint }}
      </span>
      <el-button
        v-if="parsed.isJson"
        link
        type="primary"
        size="small"
        :disabled="parsed.invalid"
        @click="formatJson"
      >
        格式化 JSON
      </el-button>
    </div>
  </div>
</template>
