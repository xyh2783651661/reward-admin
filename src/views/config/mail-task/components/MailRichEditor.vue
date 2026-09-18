<script setup lang="ts">
import { ref, shallowRef, onBeforeUnmount } from "vue";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { IDomEditor, IEditorConfig } from "@wangeditor/editor";
import "@wangeditor/editor/dist/css/style.css";
import { uploadMailImage } from "@/api/system";
import { message } from "@/utils/message";

defineOptions({
  name: "MailRichEditor"
});

const props = withDefaults(
  defineProps<{
    modelValue: string;
    /**
     * 编辑器整体高度（含工具栏），如 `380px` 或 `calc(100vh - 620px)`。
     *
     * 注意：高度必须落在**外层** `.mail-rich-editor` 上。
     * wangeditor 内部的可编辑区靠一条百分比高度链撑开：
     *   .mail-rich-editor → .w-e-text-container(height:100%)
     *   → .w-e-scroll(height:100%) → [data-slate-editor](min-height:100%)
     * 只要这条链的起点高度不确定，`100%` 就会退化成 `auto`，
     * 可编辑区塌缩成一行高（表现为「必须点到第一行才能输入」）。
     */
    height?: string;
  }>(),
  {
    height: "380px"
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorRef = shallowRef();
const toolbarConfig = {
  excludeKeys: ["group-video", "fullScreen"]
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: "请输入邮件正文……",
  MENU_CONF: {
    uploadImage: {
      async customUpload(
        file: File,
        insertFn: (url: string, alt: string, href: string) => void
      ) {
        try {
          const res: any = await uploadMailImage(file);
          if (res.code === 200 && res.data?.filePath) {
            // 优先用公网 URL；未配置公网基址时提示并回退本地路径（会裂图）
            const url = res.data.publicUrl || res.data.filePath;
            if (!res.data.publicUrl) {
              message("未配置图片公网域名，正文图片可能无法在收件端显示", {
                type: "warning"
              });
            }
            insertFn(url, file.name, url);
          } else {
            message(res.msg || "图片上传失败", { type: "error" });
          }
        } catch (e) {
          message("图片上传失败", { type: "error" });
        }
      }
    }
  }
};

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor;
}

function handleChange(editor: IDomEditor) {
  emit("update:modelValue", editor.getHtml());
}

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
</script>

<template>
  <div class="mail-rich-editor" :style="{ height: props.height }">
    <Toolbar
      class="mail-rich-editor__toolbar"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      mode="default"
    />
    <Editor
      :modelValue="props.modelValue"
      class="mail-rich-editor__editor"
      :defaultConfig="editorConfig"
      mode="default"
      @onCreated="handleCreated"
      @onChange="handleChange"
    />
  </div>
</template>

<style scoped>
.mail-rich-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 240px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.mail-rich-editor__toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color);
}

/*
 * min-height 必须是 0，不能用 min-height 撑高：
 * 本元素是 flex 子项，父级 .mail-rich-editor 的高度才是这条百分比链的「确定值」来源。
 * 在这里写 min-height 会让父容器高度变成内容推导（不确定），
 * 进而使下面 :deep 里的 height:100% 全部退化成 auto。
 */
.mail-rich-editor__editor {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 百分比高度链的显式声明（父级已有确定高度，这几条才能解析为实际像素） */
.mail-rich-editor__editor :deep(.w-e-text-container) {
  height: 100%;
}

.mail-rich-editor__editor :deep(.w-e-scroll) {
  height: 100%;
}

.mail-rich-editor__editor :deep([data-slate-editor]) {
  min-height: 100%;
}
</style>
