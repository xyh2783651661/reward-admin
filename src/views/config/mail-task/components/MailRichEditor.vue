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

const props = defineProps<{
  modelValue: string;
}>();

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
  <div class="mail-rich-editor">
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
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.mail-rich-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color);
}

.mail-rich-editor__editor {
  height: 380px;
  overflow-y: hidden;
}
</style>
