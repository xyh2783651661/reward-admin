<script setup lang="ts">
import { computed, ref, watch } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import type { JSONDataType } from "vue-json-pretty/types/utils";
import { message } from "@/utils/message";

interface Props {
  /** 字符串输入 + v-model；用于表单绑定后端字符串字段。 */
  modelValue?: string;
  /** 对象/数组/标量直传（与 modelValue 二选一，一般用于详情页只读展示）。 */
  data?: unknown;
  /** 只读模式：不显示编辑器，改用树形展示。 */
  readonly?: boolean;
  /** textarea 占位符（仅源码编辑模式）。 */
  placeholder?: string;
  /**
   * 非 JSON 时的降级方案：
   * - "text"（默认）：直接以 <pre> 渲染原字符串
   * - "hide"：只渲染 JSON，纯文本时返回 "-"
   */
  fallback?: "text" | "hide";
  /** 只读模式下的展开深度，默认 3；设为 Infinity 表示全展开。 */
  deep?: number;
  /** 折叠时展示长度，默认 true。 */
  showLength?: boolean;
  /** 展示标识线，默认 true。 */
  showLine?: boolean;
  /** 展示行号，默认 false。 */
  showLineNumber?: boolean;
  /** 展示折叠图标，默认 true。 */
  showIcon?: boolean;
  /** 编辑模式默认视图：'tree' 结构化 / 'text' 源码，默认 'tree'。 */
  editMode?: "tree" | "text";
  /** 源码模式 textarea 最小行。 */
  minRows?: number;
  /** 源码模式 textarea 最大行。 */
  maxRows?: number;
  /** JSON 中作为说明字段的键名（不参与树展示的顶层键）。 */
  descriptionKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  data: undefined,
  readonly: false,
  placeholder: '纯文本或 JSON（如 {"key": "value"}）',
  fallback: "text",
  deep: 3,
  showLength: true,
  showLine: true,
  showLineNumber: false,
  showIcon: true,
  editMode: "tree",
  minRows: 3,
  maxRows: 20,
  descriptionKey: "description"
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

// 是否走对象直传路径（一般是详情页只读展示）
const hasDataProp = computed(() => props.data !== undefined);

// 编辑模式用：内部维护字符串
const internal = ref(props.modelValue ?? "");
watch(
  () => props.modelValue,
  v => {
    if (v !== internal.value) internal.value = v ?? "";
  }
);

// 从 modelValue 解析出的 JSON 数据（失败为 null）
const parsedFromString = computed<JSONDataType | null>(() => {
  const raw = (internal.value ?? "").trim();
  if (!raw) return null;
  if (!raw.startsWith("{") && !raw.startsWith("[")) return null;
  try {
    return JSON.parse(raw) as JSONDataType;
  } catch {
    return null;
  }
});

// 最终展示用的数据：优先 data，其次从字符串解析
const resolvedData = computed<JSONDataType | null>(() => {
  if (hasDataProp.value) {
    return normalize(props.data);
  }
  return parsedFromString.value;
});

// 是否合法 JSON
const isJsonLike = computed(() => {
  const raw = (internal.value ?? "").trim();
  if (!raw) return false;
  return raw.startsWith("{") || raw.startsWith("[");
});

const parseInvalid = computed(() => {
  return isJsonLike.value && parsedFromString.value === null;
});

const editHint = computed(() => {
  const raw = (internal.value ?? "").trim();
  if (!raw) return "";
  if (!isJsonLike.value) return "纯文本";
  if (parseInvalid.value) return "JSON 解析失败";
  if (
    parsedFromString.value &&
    typeof parsedFromString.value === "object" &&
    !Array.isArray(parsedFromString.value)
  ) {
    const keys = Object.keys(parsedFromString.value).filter(
      k => k !== props.descriptionKey
    );
    return `已识别 JSON（${keys.length} 项：${keys.join(", ") || "无"}）`;
  }
  return `已识别 JSON（${Array.isArray(parsedFromString.value) ? "数组" : typeof parsedFromString.value}）`;
});

// 当前视图（结构化 / 源码）
const view = ref<"tree" | "text">(props.editMode);

// 非法时强制回源码
watch(parseInvalid, invalid => {
  if (invalid) view.value = "text";
});

// tree 模式下 vue-json-pretty 通过 v-model:data 直接改动对象
// 用一个可写代理 map 到 internal 字符串
const treeData = computed<JSONDataType>({
  get: () => parsedFromString.value ?? {},
  set: value => {
    internal.value = JSON.stringify(value);
  }
});

// 内部字符串变化时对外 emit
watch(internal, v => emit("update:modelValue", v));

function switchToTree() {
  if (parseInvalid.value) {
    message("当前不是合法 JSON，请先在源码模式修复", { type: "warning" });
    return;
  }
  // 空值切到树形时初始化为空对象，避免报错
  const raw = (internal.value ?? "").trim();
  if (!raw) internal.value = "{}";
  view.value = "tree";
}

function switchToText() {
  // 切到源码时如果是合法 JSON 顺手 pretty print
  const raw = (internal.value ?? "").trim();
  if (raw && !parseInvalid.value && isJsonLike.value) {
    try {
      internal.value = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* ignore */
    }
  }
  view.value = "text";
}

function formatJson() {
  const raw = (internal.value ?? "").trim();
  if (!isJsonLike.value) {
    message("非 JSON 内容，无需格式化", { type: "info" });
    return;
  }
  try {
    internal.value = JSON.stringify(JSON.parse(raw), null, 2);
    message("已格式化", { type: "success" });
  } catch (e: any) {
    message(`格式化失败：${e?.message ?? "非法 JSON"}`, { type: "error" });
  }
}

/** 将任意值归一化为 vue-json-pretty 能接受的 JSONDataType。 */
function normalize(value: unknown): JSONDataType {
  if (value == null) return null;
  if (Array.isArray(value)) return value as JSONDataType;
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    case "object":
      return value as Record<string, unknown>;
    default:
      return String(value);
  }
}

/** 只读模式下展示的原始字符串（用于纯文本降级）。 */
const fallbackText = computed(() => {
  if (hasDataProp.value) {
    if (props.data == null) return "";
    return typeof props.data === "string"
      ? props.data
      : JSON.stringify(props.data);
  }
  return props.modelValue ?? "";
});

const isEmpty = computed(() => {
  if (hasDataProp.value) return props.data == null || props.data === "";
  return !(internal.value ?? "").trim();
});
</script>

<template>
  <!-- ==================== 只读模式 ==================== -->
  <template v-if="readonly">
    <span v-if="isEmpty" class="text-gray-400">-</span>
    <vue-json-pretty
      v-else-if="resolvedData !== null"
      :data="resolvedData"
      :deep="deep"
      :show-length="showLength"
      :show-line="showLine"
      :show-line-number="showLineNumber"
      :show-icon="showIcon"
    />
    <template v-else-if="fallback === 'text'">
      <pre class="rj-fallback-text">{{ fallbackText }}</pre>
    </template>
    <span v-else class="text-gray-400">-</span>
  </template>

  <!-- ==================== 编辑模式 ==================== -->
  <div v-else class="rj-edit">
    <div class="rj-edit__toolbar">
      <el-radio-group v-model="view" size="small">
        <el-radio-button
          value="tree"
          :disabled="parseInvalid"
          @click="switchToTree"
        >
          结构化
        </el-radio-button>
        <el-radio-button value="text" @click="switchToText">
          源码
        </el-radio-button>
      </el-radio-group>
      <span
        class="rj-edit__hint"
        :class="{
          'rj-edit__hint--ok': isJsonLike && !parseInvalid,
          'rj-edit__hint--bad': parseInvalid,
          'rj-edit__hint--text': !isJsonLike && editHint
        }"
      >
        {{ editHint }}
      </span>
    </div>

    <div v-if="view === 'tree' && !parseInvalid" class="rj-edit__tree">
      <vue-json-pretty
        v-model:data="treeData"
        :deep="deep"
        :show-length="showLength"
        :show-line="showLine"
        :show-line-number="showLineNumber"
        :show-icon="showIcon"
        editable
        editable-trigger="click"
      />
    </div>

    <div v-else class="rj-edit__text">
      <el-input
        v-model="internal"
        type="textarea"
        :autosize="{ minRows, maxRows }"
        :placeholder="placeholder"
        class="font-mono"
      />
      <div class="rj-edit__actions">
        <el-button
          v-if="isJsonLike"
          link
          type="primary"
          size="small"
          :disabled="parseInvalid"
          @click="formatJson"
        >
          格式化 JSON
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.rj-fallback-text {
  padding: 6px 8px;
  margin: 0;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.rj-edit {
  width: 100%;

  &__toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 6px;
  }

  &__hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);

    &--ok {
      color: var(--el-color-success);
    }

    &--bad {
      color: var(--el-color-danger);
    }

    &--text {
      color: var(--el-text-color-secondary);
    }
  }

  &__tree {
    padding: 8px 10px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
}
</style>
