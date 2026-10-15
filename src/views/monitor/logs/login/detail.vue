<script setup lang="ts">
import dayjs from "dayjs";
import { computed, ref } from "vue";
import {
  DetailCodeBlock,
  DetailFields,
  DetailHeader,
  DetailLayout,
  DetailPage,
  DetailSection,
  DetailSummary,
  type DetailFieldItem,
  type DetailSummaryItem
} from "@/components/ReDetail";
import MailPreview from "./components/MailPreview.vue";
import {
  getMailStatusMeta,
  getMqStatusMeta,
  getPriorityMeta,
  splitAttachmentPaths
} from "./utils";
import type { MailSendRecordItem } from "./types";

defineOptions({ name: "MailLogDetail" });

const props = defineProps<{
  record: MailSendRecordItem;
}>();

const activeTab = ref("preview");

const fmtTime = (t?: string) =>
  t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "";

const statusMeta = computed(() => getMailStatusMeta(props.record.status));
const mqStatusMeta = computed(() => getMqStatusMeta(props.record.mqStatus));
const priorityMeta = computed(() => getPriorityMeta(props.record.priority));
const attachmentPaths = computed(() =>
  splitAttachmentPaths(props.record.attachmentPaths)
);
const hasError = computed(
  () =>
    !!(
      props.record.errorMessage ||
      props.record.lastErrorCode ||
      props.record.lastErrorType
    )
);

const summaryItems = computed<DetailSummaryItem[]>(() => [
  {
    label: "发送状态",
    value: statusMeta.value.label,
    tagType: statusMeta.value.type
  },
  {
    label: "MQ 状态",
    value: mqStatusMeta.value.label,
    tagType: mqStatusMeta.value.type
  },
  {
    label: "优先级",
    value: priorityMeta.value?.label,
    tagType: priorityMeta.value?.type
  },
  {
    label: "发送次数",
    value: props.record.sendAttempts,
    hint:
      props.record.maxRetryCount != null
        ? `最大重试 ${props.record.maxRetryCount} 次`
        : undefined
  },
  { label: "发布次数", value: props.record.publishAttempts }
]);

const recipientFields = computed<DetailFieldItem[]>(() => [
  { label: "收件人", value: props.record.recipient, copy: true, full: true },
  {
    label: "抄送",
    value: props.record.cc,
    full: true,
    hidden: !props.record.cc
  },
  { label: "邮件类型", value: props.record.type },
  {
    label: "模板编码",
    value: props.record.templateCode,
    mono: true,
    copy: true
  },
  { label: "供应商", value: props.record.provider },
  {
    label: "消息 ID",
    value: props.record.messageId,
    mono: true,
    copy: true,
    full: true
  },
  {
    label: "供应商消息 ID",
    value: props.record.providerMessageId,
    mono: true,
    copy: true,
    full: true
  }
]);

const timelineFields = computed<DetailFieldItem[]>(() => [
  { label: "创建时间", value: fmtTime(props.record.createdTime) },
  { label: "发布时间", value: fmtTime(props.record.publishedTime) },
  { label: "发送时间", value: fmtTime(props.record.lastSendTime) },
  { label: "最后尝试时间", value: fmtTime(props.record.lastAttemptTime) },
  { label: "下次重试时间", value: fmtTime(props.record.nextRetryTime) },
  { label: "完成时间", value: fmtTime(props.record.finishedTime) },
  { label: "更新时间", value: fmtTime(props.record.updatedTime) }
]);

const errorFields = computed<DetailFieldItem[]>(() => [
  {
    label: "错误码",
    value: props.record.lastErrorCode,
    mono: true,
    copy: true
  },
  { label: "错误类型", value: props.record.lastErrorType }
]);
</script>

<template>
  <DetailPage>
    <DetailHeader :title="record.subject || '无主题邮件'">
      <template #tags>
        <el-tag :type="statusMeta.type" effect="light">
          {{ statusMeta.label }}
        </el-tag>
      </template>
      <template #subtitle>
        收件人：{{ record.recipient || "-" }}
        <template v-if="record.createdTime">
          · 创建于 {{ fmtTime(record.createdTime) }}
        </template>
      </template>
    </DetailHeader>

    <DetailSummary :items="summaryItems" />

    <el-alert
      v-if="record.errorMessage"
      type="error"
      show-icon
      :closable="false"
      title="失败原因"
      :description="record.errorMessage"
    />

    <DetailLayout :aside-width="380">
      <DetailSection title="邮件内容" flush>
        <el-tabs v-model="activeTab" class="mail-tabs">
          <el-tab-pane label="邮件预览" name="preview">
            <MailPreview :content="record.content" :record-key="record.id" />
          </el-tab-pane>
          <el-tab-pane label="原始 HTML" name="source" lazy>
            <div class="mail-source">
              <DetailCodeBlock
                :content="record.content"
                label="邮件 HTML"
                empty-text="暂无邮件内容"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </DetailSection>

      <template #aside>
        <DetailSection title="收发信息">
          <DetailFields :items="recipientFields" :min-column-width="150" />
        </DetailSection>

        <DetailSection title="时间线">
          <DetailFields :items="timelineFields" :min-column-width="150" />
        </DetailSection>

        <DetailSection
          v-if="hasError || attachmentPaths.length"
          title="错误与附件"
        >
          <DetailFields
            v-if="hasError"
            :items="errorFields"
            :min-column-width="150"
          />
          <div v-if="attachmentPaths.length" class="mail-attachments">
            <span class="mail-attachments__label">
              附件（{{ attachmentPaths.length }}）
            </span>
            <div class="mail-attachments__list">
              <el-tag
                v-for="path in attachmentPaths"
                :key="path"
                effect="plain"
                type="info"
              >
                {{ path }}
              </el-tag>
            </div>
          </div>
        </DetailSection>
      </template>
    </DetailLayout>
  </DetailPage>
</template>

<style scoped>
.mail-tabs :deep(.el-tabs__header) {
  padding: 0 16px;
  margin: 0;
}

.mail-source {
  padding: 16px;
}

.mail-attachments {
  margin-top: 16px;
}

.mail-attachments__label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mail-attachments__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
