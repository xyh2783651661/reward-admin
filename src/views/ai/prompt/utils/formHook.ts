import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { getAiPromptDetail, addAiPrompt, updateAiPrompt } from "@/api/prompt";

const DEFAULT_FORM = {
  id: undefined as number | undefined,
  code: "",
  name: "",
  category: "other",
  scene: "",
  content: "",
  contentFormat: "text",
  language: "zh",
  modelHint: "",
  variablesSchema: "",
  outputSchema: "",
  status: 1,
  sortOrder: 0,
  tags: "",
  remark: ""
};

export type AiPromptForm = typeof DEFAULT_FORM;

export function useAiPromptForm() {
  const route = useRoute();
  const router = useRouter();
  const isEdit = !!route.params.id;
  const formRef = ref<any>();
  const loading = ref(false);
  const submitting = ref(false);

  const form = reactive<AiPromptForm>({ ...DEFAULT_FORM });

  async function loadDetail() {
    if (!isEdit) return;
    loading.value = true;
    try {
      const { data } = await getAiPromptDetail(route.params.id as string);
      Object.assign(form, {
        id: data.id,
        code: data.code,
        name: data.name,
        category: data.category,
        scene: data.scene ?? "",
        content: data.content,
        contentFormat: data.contentFormat ?? "text",
        language: data.language ?? "zh",
        modelHint: data.modelHint ?? "",
        variablesSchema: data.variablesSchema ?? "",
        outputSchema: data.outputSchema ?? "",
        status: data.status,
        sortOrder: data.sortOrder ?? 0,
        tags: data.tags ?? "",
        remark: data.remark ?? ""
      });
    } catch (e) {
      message(getErrorMessage(e, "加载失败"), { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function handleSubmit() {
    if (!formRef.value) return;
    try {
      await formRef.value.validate();
    } catch {
      return;
    }
    if (!form.content?.trim()) {
      message("提示词正文不能为空", { type: "warning" });
      return;
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
        router.push("/ai/prompt/index");
      } else {
        message(r.msg || "操作失败", { type: "error" });
      }
    } catch (e) {
      message(getErrorMessage(e, "操作失败"), { type: "error" });
    } finally {
      submitting.value = false;
    }
  }

  function handleCancel() {
    router.back();
  }

  onMounted(loadDetail);

  return {
    form,
    formRef,
    loading,
    submitting,
    isEdit,
    handleSubmit,
    handleCancel
  };
}
