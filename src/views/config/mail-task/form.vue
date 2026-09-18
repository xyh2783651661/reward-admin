<script setup lang="ts">
import { useMailSendTaskForm } from "./utils/formHook";
import type { MailSendTaskFormInline } from "./utils/types";
import MailRichEditor from "./components/MailRichEditor.vue";
import ReFriendPicker from "@/components/ReFriendPicker/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";

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

/** 转义文本，避免主题 / 附件名里的 < & " 破坏预览文档结构 */
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 富文本空态判断：wangeditor 未输入时 getHtml() 返回 `<p><br></p>`，
 * 这是 truthy 的，直接 `form.content || 兜底` 永远不生效，预览会渲染成一片空白。
 */
function isEmptyHtml(html: string) {
  return !(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function formatFileSize(size?: number) {
  return size ? `${(size / 1024).toFixed(1)}KB` : "-";
}

function buildPreviewDocument() {
  // 注意：selectedCount 是 computed ref，在 script 里必须取 .value（模板中才会自动解包）
  const recipientCount = form.recipientIds.length;
  const attachments = form.attachments.length
    ? form.attachments
        .map(a => `${escapeHtml(a.fileName)}（${formatFileSize(a.fileSize)}）`)
        .join("、")
    : "无";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>邮件预览</title>
  <style>
    body { max-width: 680px; margin: 20px auto; padding: 0 16px; font-family: Arial, "Microsoft YaHei", sans-serif; line-height: 1.7; color: #333; }
    .preview-meta { padding: 12px 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.9; background: #fafafa; border: 1px solid #eee; border-radius: 6px; }
    .preview-meta__label { display: inline-block; width: 52px; color: #999; }
    .preview-empty { color: #999; }
  </style>
</head>
<body>
  <div class="preview-meta">
    <div><span class="preview-meta__label">主题</span>${escapeHtml(form.subject) || '<span class="preview-empty">未填写</span>'}</div>
    <div><span class="preview-meta__label">收件人</span>${recipientCount} 人</div>
    <div><span class="preview-meta__label">附件</span>${attachments}</div>
  </div>
  ${isEmptyHtml(form.content) ? '<div class="preview-empty">暂无正文内容</div>' : form.content}
</body>
</html>`;
}

async function preview() {
  try {
    await formRef.value.validate();
  } catch {
    // 校验失败时 el-form 已就地标红，这里静默返回即可
    return;
  }

  const win = window.open("", "_blank");
  if (!win) {
    // 原实现直接 return，弹窗被拦截时用户完全无感知
    message("浏览器拦截了预览窗口，请允许本站弹窗后重试", { type: "warning" });
    return;
  }

  win.document.open();
  win.document.write(buildPreviewDocument());
  win.document.close();
  win.focus();
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
      <section class="mail-task-form-section">
        <div class="mail-task-section-title">
          <span>基本信息</span>
          <small>任务名称可选，邮件主题与收件人为必填</small>
        </div>

        <el-row :gutter="16">
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
          <div class="recipient-field">
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
            <span
              v-if="!selectedRecipients.length"
              class="recipient-field__placeholder"
            >
              尚未选择收件人
            </span>
            <span class="recipient-field__ops">
              <el-button
                link
                type="primary"
                :icon="useRenderIcon('ri:user-add-line')"
                @click="openSelector"
              >
                选择业务好友
              </el-button>
              <el-button
                v-if="selectedCount"
                link
                type="danger"
                :icon="useRenderIcon('ri:delete-bin-line')"
                @click="onRecipientsChange([])"
              >
                清空
              </el-button>
            </span>
          </div>
          <div
            v-if="selectedCount > selectedRecipients.length"
            class="recipient-field__meta"
          >
            共选择 {{ selectedCount }} 人，当前仅显示前
            {{ selectedRecipients.length }} 个标签
          </div>
        </el-form-item>
      </section>

      <section class="mail-task-form-section">
        <div class="mail-task-section-title">
          <span>邮件内容</span>
          <small>支持变量、图片与链接，发送前建议先预览</small>
        </div>

        <el-form-item label="邮件正文：" prop="content">
          <MailRichEditor v-model="form.content" height="calc(100vh - 620px)" />
        </el-form-item>
      </section>

      <section class="mail-task-form-section">
        <div class="mail-task-section-title">
          <span>附件与备注</span>
          <small>附件随邮件一并发送</small>
        </div>

        <el-form-item label="附件：">
          <div class="w-full">
            <el-upload
              :show-file-list="false"
              :auto-upload="true"
              :before-upload="beforeUpload"
              accept="*"
            >
              <el-button :icon="useRenderIcon('ri:attachment-2')">
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

        <el-form-item label="备注：">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="备注（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </section>

      <div class="mail-task-form__actions">
        <el-button @click="cancel">取消</el-button>
        <el-button :icon="useRenderIcon('ri:eye-line')" @click="preview">
          预览
        </el-button>
        <el-button :loading="saving" @click="save(true)">保存草稿</el-button>
        <el-button type="primary" :loading="sending" @click="send">
          发送
        </el-button>
      </div>
    </el-form>

    <ReFriendPicker
      v-model:visible="selectorVisible"
      :model-value="form.recipientIds"
      @update:model-value="onRecipientsChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.mail-task-form {
  .mail-task-form__body {
    max-width: 1040px;
    padding: 4px 0 8px;
    margin: 0 auto;
  }

  .mail-task-form-section {
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;

    & + .mail-task-form-section {
      margin-top: 14px;
    }
  }

  .mail-task-section-title {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 14px;

    span {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    small {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .recipient-field {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    width: 100%;
    min-height: 32px;
    padding: 3px 8px;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    transition: border-color var(--el-transition-duration);

    &:hover {
      border-color: var(--el-border-color-hover);
    }
  }

  .recipient-field__placeholder {
    font-size: 13px;
    color: var(--el-text-color-placeholder);
  }

  .recipient-field__ops {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-left: auto;
  }

  .recipient-field__meta {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .mail-task-form__attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mail-task-form__actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 4px 0 8px;
  }
}
</style>
