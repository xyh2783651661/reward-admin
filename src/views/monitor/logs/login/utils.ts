import type { DetailTagType } from "@/components/ReDetail";

interface StatusMeta {
  label: string;
  type: DetailTagType;
}

const UNKNOWN: StatusMeta = { label: "未知", type: "info" };

const MAIL_STATUS_MAP: Record<number, StatusMeta> = {
  0: { label: "待发送", type: "info" },
  1: { label: "成功", type: "success" },
  2: { label: "失败", type: "danger" },
  3: { label: "发送中", type: "warning" },
  4: { label: "重试中", type: "warning" },
  5: { label: "已取消", type: "info" },
  6: { label: "状态未知", type: "info" }
};

const MQ_STATUS_MAP: Record<number, StatusMeta> = {
  0: { label: "待投递", type: "info" },
  1: { label: "投递中", type: "warning" },
  2: { label: "已投递", type: "success" },
  3: { label: "投递失败", type: "danger" }
};

const PRIORITY_MAP: Record<number, StatusMeta> = {
  1: { label: "高", type: "danger" },
  2: { label: "较高", type: "warning" },
  3: { label: "中", type: "info" },
  4: { label: "较低", type: "info" },
  5: { label: "低", type: "info" }
};

export const getMailStatusMeta = (status?: number): StatusMeta =>
  MAIL_STATUS_MAP[status ?? -1] ?? UNKNOWN;

export const getMqStatusMeta = (status?: number): StatusMeta =>
  MQ_STATUS_MAP[status ?? -1] ?? UNKNOWN;

export const getPriorityMeta = (priority?: number): StatusMeta | null =>
  priority == null
    ? null
    : (PRIORITY_MAP[priority] ?? { label: String(priority), type: "info" });

/** 附件路径支持分号或换行分隔 */
export function splitAttachmentPaths(paths?: string) {
  if (!paths) return [];
  return paths
    .split(/[;\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}
