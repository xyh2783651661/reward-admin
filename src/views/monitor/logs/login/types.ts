interface MailSendRecordItem {
  id?: string | number;
  recipient: string;
  cc?: string;
  subject: string;
  content: string;
  status: number;
  errorMessage?: string;
  sendAttempts?: number;
  lastSendTime?: string;
  attachmentPaths?: string;
  templateCode?: string;
  type?: string;
  priority?: number;
  provider?: string;
  providerMessageId?: string;
  mqStatus?: number;
  messageId?: string;
  publishedTime?: string;
  nextPublishTime?: string;
  publishAttempts?: number;
  nextRetryTime?: string;
  maxRetryCount?: number;
  lastAttemptTime?: string;
  lastErrorCode?: string;
  lastErrorType?: string;
  finishedTime?: string;
  createdTime?: string;
  updatedTime?: string;
}

type MailPreviewMode = "desktop" | "mobile";

export type { MailPreviewMode, MailSendRecordItem };
