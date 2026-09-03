import { ref, reactive, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  addMailSendTask,
  updateMailSendTask,
  getMailSendTaskDetail,
  getMailRecipientList,
  checkMailSendTask,
  sendMailSendTask,
  uploadMailAttachment
} from "@/api/system";
import type { MailSendTask } from "./types";

export interface RecipientOption {
  id: number;
  email: string;
  name: string;
  recipientId?: number;
  recipientName?: string;
  recipientEmail?: string;
}

export function useMailSendTaskForm() {
  const router = useRouter();
  const route = useRoute();
  const isEdit = computed(() => !!route.params.id);

  const formRef = ref();
  const loading = ref(false);
  const saving = ref(false);
  const sending = ref(false);

  const form = reactive({
    id: undefined as number | undefined,
    taskName: "",
    subject: "",
    content: "",
    remark: "",
    recipientIds: [] as number[],
    attachments: [] as Array<{
      fileName: string;
      filePath: string;
      fileSize: number;
      contentType: string;
    }>
  });

  const selectedRecipients = ref<RecipientOption[]>([]);
  const selectorVisible = ref(false);

  const rules = {
    subject: [{ required: true, message: "请输入邮件主题", trigger: "blur" }],
    content: [{ required: true, message: "请输入邮件正文", trigger: "blur" }]
  };

  const selectedCount = computed(() => form.recipientIds.length);

  function openSelector() {
    selectorVisible.value = true;
  }

  function onRecipientsChange(ids: number[]) {
    form.recipientIds = ids;
    loadRecipientLabels(ids);
  }

  /** 回显已选收件人姓名/邮箱标签 */
  async function loadRecipientLabels(ids: number[]) {
    if (!ids?.length) {
      selectedRecipients.value = [];
      return;
    }
    try {
      // 分批回显已选收件人（默认一页最多 100 条，超出仅显示数量）
      const { data } = await getMailRecipientList({ current: 1, size: 200 });
      const all = data.records as RecipientOption[];
      selectedRecipients.value = all.filter(r => ids.includes(r.id));
    } catch {
      selectedRecipients.value = [];
    }
  }

  async function loadDetail() {
    if (!isEdit.value) return;
    loading.value = true;
    try {
      const { data } = await getMailSendTaskDetail<
        MailSendTask & {
          recipientIds?: number[];
          recipients?: RecipientOption[];
        }
      >(route.params.id as string);
      form.id = data.id;
      form.taskName = data.taskName ?? "";
      form.subject = data.subject ?? "";
      form.content = data.content ?? "";
      form.remark = data.remark ?? "";
      form.attachments = (data.attachments ?? []).map(a => ({
        fileName: a.fileName ?? "",
        filePath: (a as any).filePath ?? "",
        fileSize: a.fileSize ?? 0,
        contentType: a.contentType ?? ""
      }));
      // 编辑态回显收件人（后端详情接口已返回 recipientIds 与姓名邮箱快照）
      form.recipientIds = data.recipientIds ?? [];
      selectedRecipients.value = (data.recipients ?? []).map(r => ({
        id: r.recipientId,
        name: r.recipientName,
        email: r.recipientEmail
      }));
    } finally {
      loading.value = false;
    }
  }

  /** 附件上传（复用后端统一文件存储） */
  async function handleUpload(file: File) {
    try {
      const res: any = await uploadMailAttachment(file);
      if (res.code === 200 && res.data) {
        form.attachments.push({
          fileName: res.data.fileName,
          filePath: res.data.filePath,
          fileSize: res.data.fileSize,
          contentType: res.data.contentType
        });
        message("附件上传成功", { type: "success" });
      } else {
        message(res.msg || "附件上传失败", { type: "error" });
      }
    } catch {
      message("附件上传失败", { type: "error" });
    }
  }

  function removeAttachment(index: number) {
    form.attachments.splice(index, 1);
  }

  async function save(draft = true) {
    if (form.recipientIds.length === 0) {
      message("请选择收件人", { type: "warning" });
      return;
    }
    await formRef.value.validate();
    saving.value = true;
    try {
      const payload = {
        id: form.id,
        taskName: form.taskName,
        subject: form.subject,
        content: form.content,
        remark: form.remark,
        recipientIds: form.recipientIds,
        attachments: form.attachments
      };
      const r: any = isEdit.value
        ? await updateMailSendTask(payload)
        : await addMailSendTask(payload);
      if (r.code === 200) {
        message(draft ? "草稿已保存" : "保存成功", { type: "success" });
        router.push("/config/mail-task");
      } else {
        message(r.msg || "保存失败", { type: "error" });
      }
    } finally {
      saving.value = false;
    }
  }

  /** 发送前检查并确认 */
  async function send() {
    if (!form.id) {
      // 未保存，先保存
      await save(false);
      return;
    }
    const { data } = await checkMailSendTask(form.id);
    const check = data as any;
    if (check.valid <= 0) {
      message("没有有效收件人，无法发送", { type: "warning" });
      return;
    }
    let tip = `共选择 ${check.total} 人<br/>有效邮箱：${check.valid}<br/>缺少邮箱：${check.missingEmail}`;
    tip += `<br/>格式错误：${check.invalidEmail}<br/>重复邮箱：${check.duplicateEmail}`;
    tip += `<br/>最终发送：${check.valid} 人`;
    await ElMessageBox.confirm(tip, "发送确认", {
      confirmButtonText: "确认发送",
      cancelButtonText: "取消",
      type: "warning",
      dangerouslyUseHTMLString: true
    });
    sending.value = true;
    try {
      const r: any = await sendMailSendTask(form.id);
      if (r.code === 200) {
        message("任务已提交发送！", { type: "success" });
        router.push("/config/mail-task");
      } else {
        message(r.msg || "发送失败", { type: "error" });
      }
    } finally {
      sending.value = false;
    }
  }

  function cancel() {
    router.push("/config/mail-task");
  }

  onMounted(() => {
    loadDetail();
  });

  return {
    formRef,
    form,
    rules,
    loading,
    saving,
    sending,
    isEdit,
    selectedRecipients,
    selectedCount,
    selectorVisible,
    openSelector,
    onRecipientsChange,
    handleUpload,
    removeAttachment,
    save,
    send,
    cancel
  };
}
