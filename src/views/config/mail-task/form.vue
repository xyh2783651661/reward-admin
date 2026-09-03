<script setup lang="ts">
import { useMailSendTaskForm } from "./utils/formHook";
import MailRichEditor from "./components/MailRichEditor.vue";
import MailRecipientSelector from "./components/MailRecipientSelector.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ElMessageBox } from "element-plus";

defineOptions({
  name: "MailSendTaskForm"
});

const {
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
} = useMailSendTaskForm();

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
  <div class="main p-6">
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="90px"
    >
      <el-form-item label="任务名称：">
        <el-input
          v-model="form.taskName"
          placeholder="请输入任务名称（可选）"
          clearable
          class="max-w-[480px]"
        />
      </el-form-item>

      <el-form-item label="邮件主题：" prop="subject">
        <el-input
          v-model="form.subject"
          placeholder="请输入邮件主题"
          clearable
          class="max-w-[480px]"
        />
      </el-form-item>

      <el-form-item label="收件人：">
        <div class="w-full">
          <div class="flex items-center gap-3">
            <el-button
              :icon="useRenderIcon('ri/user-add-line')"
              @click="openSelector"
            >
              选择业务好友
            </el-button>
            <span class="text-gray-500">已选择 {{ selectedCount }} 人</span>
          </div>
          <div
            v-if="selectedRecipients.length"
            class="mt-3 flex flex-wrap gap-2"
          >
            <el-tag
              v-for="r in selectedRecipients"
              :key="r.id"
              closable
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
        <div class="w-full">
          <MailRichEditor v-model="form.content" />
        </div>
      </el-form-item>

      <el-form-item label="附件：">
        <div class="w-full">
          <el-upload
            :show-file-list="false"
            :auto-upload="true"
            :before-upload="beforeUpload"
            accept="*"
          >
            <el-button :icon="useRenderIcon('ri-attachment-2')"
              >上传附件</el-button
            >
          </el-upload>
          <div v-if="form.attachments.length" class="mt-3">
            <el-tag
              v-for="(a, i) in form.attachments"
              :key="i"
              closable
              class="mr-2 mb-2"
              @close="removeAttachment(i)"
            >
              {{ a.fileName }}（{{
                a.fileSize ? (a.fileSize / 1024).toFixed(1) + "KB" : "-"
              }}）
            </el-tag>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="备注：">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="备注（可选）"
          class="max-w-[480px]"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save(true)">
          保存草稿
        </el-button>
        <el-button :icon="useRenderIcon('ri/eye-line')" @click="preview"
          >预览</el-button
        >
        <el-button type="success" :loading="sending" @click="send">
          发送
        </el-button>
        <el-button @click="cancel">取消</el-button>
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
