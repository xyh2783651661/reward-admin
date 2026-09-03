// 邮件批量发送任务相关类型定义

export interface MailSendTaskAttachment {
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  contentType?: string;
}

export interface MailSendTask {
  id?: number;
  taskNo?: string;
  taskName?: string;
  subject?: string;
  content?: string;
  status?: number;
  totalCount?: number;
  validCount?: number;
  successCount?: number;
  failedCount?: number;
  startedAt?: string;
  finishedAt?: string;
  createdBy?: number;
  createdTime?: string;
  updatedTime?: string;
  remark?: string;
  attachmentCount?: number;
  attachments?: Array<{
    id?: number;
    fileName?: string;
    filePath?: string;
    fileSize?: number;
    contentType?: string;
  }>;
}

export interface MailSendTaskRecipient {
  id?: number;
  taskId?: number;
  recipientId?: number;
  recipientName?: string;
  recipientEmail?: string;
  status?: number;
  invalidReason?: string;
  sendRecordId?: number;
  sendTime?: string;
  errorMessage?: string;
}

export interface MailSendTaskCheck {
  total: number;
  valid: number;
  missingEmail: number;
  invalidEmail: number;
  duplicateEmail: number;
}
