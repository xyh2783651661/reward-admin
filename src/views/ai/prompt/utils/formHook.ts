import { ref, reactive } from "vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { addAiPrompt, updateAiPrompt } from "@/api/prompt";
import type { AiPromptFormData } from "./types";

export interface AiPromptFormProps {
  formInline: AiPromptFormData;
  isEdit: boolean;
}

export function useAiPromptForm(props: AiPromptFormProps) {
  const isEdit = !!props.isEdit;
  const formRef = ref<any>();
  const submitting = ref(false);

  const form = reactive<AiPromptFormData>({ ...props.formInline });

  async function handleSubmit(): Promise<boolean> {
    if (!formRef.value) return false;
    try {
      await formRef.value.validate();
    } catch {
      return false;
    }
    if (!form.content?.trim()) {
      message("提示词正文不能为空", { type: "warning" });
      return false;
    }
    submitting.value = true;
    try {
      const payload: any = {
        code: form.code?.trim(),
        name: form.name?.trim(),
        category: form.category,
        scene: form.scene || null,
        content: form.content,
        contentFormat: form.contentFormat,
        language: form.language,
        modelHint: form.modelHint || null,
        variablesSchema: form.variablesSchema || null,
        outputSchema: form.outputSchema || null,
        status: form.status,
        sortOrder: form.sortOrder,
        tags: form.tags || null,
        remark: form.remark || null
      };
      let r: any;
      if (isEdit) {
        payload.id = form.id;
        r = await updateAiPrompt(payload);
      } else {
        r = await addAiPrompt(payload);
      }
      if (r.code === 200) {
        message(isEdit ? "修改成功" : "新建成功", { type: "success" });
        return true;
      }
      message(r.msg || "操作失败", { type: "error" });
      return false;
    } catch (e) {
      message(getErrorMessage(e, "操作失败"), { type: "error" });
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return {
    form,
    formRef,
    submitting,
    isEdit,
    handleSubmit
  };
}
