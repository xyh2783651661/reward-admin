<script setup lang="ts">
import { useMailSendTaskForm } from "./utils/formHook";
import type { MailSendTaskFormInline } from "./utils/types";
import MailRichEditor from "./components/MailRichEditor.vue";
import MailRecipientSelector from "./components/MailRecipientSelector.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

defineOptions({
  name: "MailSendTaskForm"
});

const props = withDefaults(
  defineProps<{
    formInline: MailSendTaskFormInline;
    isEdit: boolean;
    onSuccess?: () => void;
    onClose?: () => void;
  }>(),
  {
    onSuccess: () => {},
    onClose: () => {}
  }
);

const {
  formRef,
  form,
  rules,
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
} = useMailSendTaskForm(props);

function beforeUpload(file: File) {
  handleUpload(file);
  return false; // 阻止 el-upload 默认上传，走自定义
}

async function preview() {
  await formRef.value.validate();
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>邮件预览</title>
    <style>body{max-width:680px;margin:20px auto;font-family:Arial,"Microsoft YaHei",sans-serif;line-height:1.7;color:#333}</style>
    </head>
    <body>
    <div style="border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:16px;color:#999;font-size:13px">
      <div>主题：${form.subject}</div>
      <div>收件人：${selectedCount} 人</div>
    </div>
    ${form.content}
    </body></html>
  `);
  win.document.close();
}
</script>

<template>
  <div class="mail-task-form">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      class="mail-task-form__body"
    >
      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-form-item label="任务名称：" prop="taskName">
            <el-input
              v-model="form.taskName"
              placeholder="请输入任务名称（可选）"
              clearable
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="邮件主题：" prop="subject">
            <el-input
              v-model="form.subject"
              placeholder="请输入邮件主题"
              clearable
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="收件人：" required>
        <div class="w-full">
          <div class="flex items-center gap-3">
            <el-button
              :icon="useRenderIcon('ri/user-add-line')"
              @click="openSelector"
            >
              选择业务好友
            </el-button>
            <el-text v-if="selectedCount" type="info">
              已选择 {{ selectedCount }} 人
            </el-text>
            <el-text v-else type="danger">未选择收件人</el-text>
          </div>
          <div
            v-if="selectedRecipients.length"
            class="mail-task-form__recipients mt-3"
          >
            <el-tag
              v-for="r in selectedRecipients"
              :key="r.id"
              closable
              effect="plain"
              @close="
                onRecipientsChange(form.recipientIds.filter(id => id !== r.id))
              "
            >
              {{ r.name || "-" }} &lt;{{ r.email || "邮箱未设置" }}&gt;
            </el-tag>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="邮件正文：" prop="content">
        <MailRichEditor v-model="form.content" />
      </el-form-item>

      <el-row :gutter="24">
        <el-col :xs="24" :md="12">
          <el-form-item label="附件：">
            <div class="w-full">
              <el-upload
                :show-file-list="false"
                :auto-upload="true"
                :before-upload="beforeUpload"
                accept="*"
              >
                <el-button :icon="useRenderIcon('ri-attachment-2')">
                  上传附件
                </el-button>
              </el-upload>
              <div
                v-if="form.attachments.length"
                class="mail-task-form__attachments mt-3"
              >
                <el-tag
                  v-for="(a, i) in form.attachments"
                  :key="i"
                  closable
                  effect="plain"
                  @close="removeAttachment(i)"
                >
                  {{ a.fileName }}（{{
                    a.fileSize ? (a.fileSize / 1024).toFixed(1) + "KB" : "-"
                  }}）
                </el-tag>
              </div>
            </div>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="备注：">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="4"
              placeholder="备注（可选）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item>
        <div class="mail-task-form__actions">
          <el-button @click="cancel">取消</el-button>
          <el-button :icon="useRenderIcon('ri/eye-line')" @click="preview">
            预览
          </el-button>
          <el-button type="primary" :loading="saving" @click="save(true)">
            保存草稿
          </el-button>
          <el-button type="success" :loading="sending" @click="send">
            发送
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <MailRecipientSelector
      v-if="selectorVisible"
      v-model="form.recipientIds"
      @update:model-value="onRecipientsChange"
      @close="selectorVisible = false"
    />
  </div>
</template>

<style scoped>
.mail-task-form__body {
  padding: 8px 0;
}

.mail-task-form__recipients,
.mail-task-form__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mail-task-form__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  width: 100%;
  padding-top: 8px;
}
</style>
