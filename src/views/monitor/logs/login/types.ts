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
  createdTime?: string;
  updatedTime?: string;
}

type MailPreviewMode = "desktop" | "mobile";

export type { MailPreviewMode, MailSendRecordItem };
