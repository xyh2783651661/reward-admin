<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, shallowRef } from "vue";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
  MatchDecorator
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  indentOnInput,
  foldGutter,
  foldKeymap,
  HighlightStyle
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { html as htmlLang } from "@codemirror/lang-html";
import { json as jsonLang } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from "@codemirror/autocomplete";
import { searchKeymap } from "@codemirror/search";

interface Props {
  modelValue: string;
  language?: "text" | "html" | "json" | "markdown";
  theme?: "light" | "dark";
  readonly?: boolean;
  height?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: "text",
  theme: "light",
  readonly: false,
  height: "360px",
  placeholder: ""
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  ready: [view: EditorView];
}>();

const editorHost = ref<HTMLDivElement>();
const viewRef = shallowRef<EditorView | null>(null);

// 受控 Compartment（用于切换主题/语言时不重建整个 Editor）
const languageCompartment = new Compartment();
const themeCompartment = new Compartment();
const readonlyCompartment = new Compartment();

// ========== {{varName}} 变量高亮（MatchDecorator） ==========
const variableMatcher = new MatchDecorator({
  regexp: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
  decoration: () =>
    Decoration.mark({
      class: "cm-prompt-variable",
      attributes: { title: "提示词变量" }
    })
});

const variablePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = variableMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = variableMatcher.createDeco(update.view);
      }
    }
  },
  { decorations: v => v.decorations }
);

// ========== 高亮主题扩展（变量 + 关键字） ==========
const promptHighlight = HighlightStyle.define([
  { tag: t.variableName, class: "cm-prompt-freemarker" },
  { tag: t.special(t.string), class: "cm-prompt-freemarker" }
]);

function buildLanguageExtension(lang: Props["language"]) {
  switch (lang) {
    case "html":
    case "markdown":
      return htmlLang();
    case "json":
      return jsonLang();
    default:
      return [];
  }
}

function buildThemeExtension(theme: Props["theme"]) {
  return theme === "dark" ? oneDark : [];
}

function buildState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      syntaxHighlighting(promptHighlight),
      variablePlugin,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        indentWithTab
      ]),
      languageCompartment.of(buildLanguageExtension(props.language)),
      themeCompartment.of(buildThemeExtension(props.theme)),
      readonlyCompartment.of(EditorState.readOnly.of(props.readonly)),
      EditorView.lineWrapping,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          emit("update:modelValue", update.state.doc.toString());
        }
      })
    ]
  });
}

onMounted(() => {
  if (!editorHost.value) return;
  const view = new EditorView({
    state: buildState(props.modelValue ?? ""),
    parent: editorHost.value
  });
  viewRef.value = view;
  emit("ready", view);
});

onBeforeUnmount(() => {
  viewRef.value?.destroy();
  viewRef.value = null;
});

// 外部 → 内部：受控值同步（避免在用户输入时覆盖光标）
let isInternalChange = false;
watch(
  () => props.modelValue,
  val => {
    const view = viewRef.value;
    if (!view) return;
    if (view.state.doc.toString() === val) return;
    isInternalChange = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: val ?? "" }
    });
    isInternalChange = false;
  }
);

// 主题切换
watch(
  () => props.theme,
  t => {
    viewRef.value?.dispatch({
      effects: themeCompartment.reconfigure(buildThemeExtension(t))
    });
  }
);

// 只读切换
watch(
  () => props.readonly,
  r => {
    viewRef.value?.dispatch({
      effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(r))
    });
  }
);

// 语言切换
watch(
  () => props.language,
  lang => {
    viewRef.value?.dispatch({
      effects: languageCompartment.reconfigure(buildLanguageExtension(lang))
    });
  }
);

defineExpose({
  getView: () => viewRef.value
});
</script>

<template>
  <div
    ref="editorHost"
    class="prompt-editor"
    :class="[`prompt-editor--${theme}`, { 'is-readonly': readonly }]"
    :style="{ height }"
  />
</template>

<style scoped>
.prompt-editor {
  width: 100%;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  transition: border-color 0.2s;
}

.prompt-editor:focus-within {
  border-color: var(--el-color-primary);
}

.prompt-editor--dark {
  background: #282c34;
  border-color: #1e2127;
}

.prompt-editor.is-readonly {
  background: var(--el-fill-color-light);
}

.prompt-editor :deep(.cm-editor) {
  height: 100%;
  font-family:
    "JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "Source Code Pro",
    "Courier New", monospace;
  font-size: 13px;
}

.prompt-editor :deep(.cm-scroller) {
  font-family: inherit;
  line-height: 1.6;
}

.prompt-editor :deep(.cm-content) {
  padding: 8px 0;
}

.prompt-editor :deep(.cm-prompt-variable) {
  padding: 0 2px;
  font-weight: 600;
  color: #d97706;
  background: rgb(217 119 6 / 12%);
  border-radius: 3px;
}

.prompt-editor :deep(.cm-prompt-freemarker) {
  font-weight: 500;
  color: #c2410c;
}

.prompt-editor--dark :deep(.cm-prompt-variable) {
  color: #fbbf24;
  background: rgb(217 119 6 / 25%);
}

.prompt-editor--dark :deep(.cm-prompt-freemarker) {
  color: #fb923c;
}
</style>
