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

/** 收件人姓名/邮箱快照（编辑态回显标签用） */
export interface MailSendTaskRecipientSnapshot {
  recipientId?: number;
  recipientName?: string;
  recipientEmail?: string;
}

/** 新建/编辑表单内联数据（父组件 fetch 后传入，弹层内容组件接收） */
export interface MailSendTaskFormInline {
  id?: number;
  taskName?: string;
  subject?: string;
  content?: string;
  remark?: string;
  recipientIds?: number[];
  attachments?: MailSendTaskAttachment[];
  recipients?: MailSendTaskRecipientSnapshot[];
}
