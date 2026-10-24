import type { TaskLogStatus, TaskLogTriggerType } from "@/api/logs";

/** Element Plus tag 支持的语义色，和状态语义一一对应 */
export type TaskLogTone = "primary" | "success" | "info" | "warning" | "danger";

export interface TaskLogStatusMeta {
  /** 中文展示名 */
  label: string;
  /** el-tag type */
  tag: TaskLogTone;
  /** 状态胶囊 / 圆点使用的语义色 */
  tone: TaskLogTone;
  /** 用于需要硬编码颜色的场景（如趋势图、圆点） */
  color: string;
  /** 悬浮说明：解释「这个状态到底意味着什么」 */
  description: string;
  /** 是否真正执行过（LOCKED / SKIPPED / CANCELLED 为 false） */
  executed: boolean;
  /** 是否是终态（WAITING / RUNNING 不是） */
  terminal: boolean;
  /** 筛选下拉里的展示顺序 */
  order: number;
}

/**
 * 任务执行状态元数据。
 *
 * <p>与后端 {@code TaskStatus} 对齐，重点是把「部分成功」从成功/失败二元里拆出来：
 * 任务方法没抛异常，但软步骤失败 / 业务降级时落 {@code PARTIAL_SUCCESS}，
 * 它既不是干净成功，也不该按失败去告警，必须单独分色展示。</p>
 */
export const TASK_LOG_STATUS_META: Record<TaskLogStatus, TaskLogStatusMeta> = {
  SUCCESS: {
    label: "成功",
    tag: "success",
    tone: "success",
    color: "#67c23a",
    description: "全部步骤成功，业务产物完整",
    executed: true,
    terminal: true,
    order: 10
  },
  PARTIAL_SUCCESS: {
    label: "部分成功",
    tag: "warning",
    tone: "warning",
    color: "#e6a23c",
    description: "任务未抛异常，但存在失败步骤或业务降级，产物可能不完整",
    executed: true,
    terminal: true,
    order: 20
  },
  FAILED: {
    label: "失败",
    tag: "danger",
    tone: "danger",
    color: "#f56c6c",
    description: "业务或系统异常导致执行失败",
    executed: true,
    terminal: true,
    order: 30
  },
  TIMEOUT: {
    label: "超时",
    tag: "danger",
    tone: "danger",
    color: "#f56c6c",
    description: "超过配置的最大执行时间，被强制中断",
    executed: true,
    terminal: true,
    order: 40
  },
  LOCKED: {
    label: "未获锁",
    tag: "warning",
    tone: "warning",
    color: "#e6a23c",
    description: "分布式锁被其他实例占用，本次未执行",
    executed: false,
    terminal: true,
    order: 50
  },
  SKIPPED: {
    label: "已跳过",
    tag: "info",
    tone: "info",
    color: "#909399",
    description: "业务条件不满足，本次主动跳过",
    executed: false,
    terminal: true,
    order: 60
  },
  CANCELLED: {
    label: "已取消",
    tag: "info",
    tone: "info",
    color: "#909399",
    description: "任务被主动取消",
    executed: false,
    terminal: true,
    order: 70
  },
  RUNNING: {
    label: "执行中",
    tag: "primary",
    tone: "primary",
    color: "#409eff",
    description: "任务正在执行，尚无最终结果",
    executed: true,
    terminal: false,
    order: 80
  },
  WAITING: {
    label: "等待中",
    tag: "info",
    tone: "info",
    color: "#909399",
    description: "已进入队列，等待执行",
    executed: false,
    terminal: false,
    order: 90
  }
};

/** 状态筛选下拉选项（按业务展示顺序排列） */
export const TASK_LOG_STATUS_OPTIONS = (
  Object.keys(TASK_LOG_STATUS_META) as TaskLogStatus[]
)
  .sort((a, b) => TASK_LOG_STATUS_META[a].order - TASK_LOG_STATUS_META[b].order)
  .map(value => ({ value, label: TASK_LOG_STATUS_META[value].label }));

const UNKNOWN_STATUS_META: TaskLogStatusMeta = {
  label: "未知状态",
  tag: "info",
  tone: "info",
  color: "#909399",
  description: "后端返回了前端暂未识别的执行状态",
  executed: true,
  terminal: true,
  order: 999
};

/**
 * 解析状态元数据。
 *
 * <p>历史行可能没有 {@code status}，此时按旧的 {@code success} 兜底成 SUCCESS / FAILED；
 * 后端未来新增状态时也不至于直接渲染空白。</p>
 */
export function getTaskLogStatusMeta(
  status?: string | null,
  success?: boolean | null
): TaskLogStatusMeta {
  if (status && status in TASK_LOG_STATUS_META) {
    return TASK_LOG_STATUS_META[status as TaskLogStatus];
  }
  if (status) {
    return { ...UNKNOWN_STATUS_META, label: status };
  }
  return success ? TASK_LOG_STATUS_META.SUCCESS : TASK_LOG_STATUS_META.FAILED;
}

export interface TaskLogTriggerMeta {
  label: string;
  tag: TaskLogTone;
  description: string;
}

/** 触发来源元数据，与后端 {@code TriggerType} 对齐 */
export const TASK_LOG_TRIGGER_META: Record<
  TaskLogTriggerType,
  TaskLogTriggerMeta
> = {
  SCHEDULE: {
    label: "定时触发",
    tag: "primary",
    description: "调度中心按 Cron 定时触发"
  },
  MANUAL: {
    label: "手动触发",
    tag: "warning",
    description: "管理后台手动触发"
  },
  RETRY: {
    label: "失败重试",
    tag: "danger",
    description: "失败补偿 / 重试链路触发"
  },
  SYSTEM: {
    label: "系统触发",
    tag: "info",
    description: "系统内部事件触发"
  }
};

/** 触发方式筛选下拉选项 */
export const TASK_LOG_TRIGGER_OPTIONS = (
  Object.keys(TASK_LOG_TRIGGER_META) as TaskLogTriggerType[]
).map(value => ({ value, label: TASK_LOG_TRIGGER_META[value].label }));

/** 列表操作列文案：失败/超时看异常，其余看执行详情 */
export function getTaskLogDetailActionText(
  status?: string | null,
  success?: boolean | null
): string {
  const normalized = status || (success ? "SUCCESS" : "FAILED");
  if (normalized === "FAILED" || normalized === "TIMEOUT") return "异常详情";
  if (normalized === "PARTIAL_SUCCESS") return "执行详情";
  return "详情";
}

export function getTaskLogTriggerMeta(
  triggerType?: string | null
): TaskLogTriggerMeta {
  if (triggerType && triggerType in TASK_LOG_TRIGGER_META) {
    return TASK_LOG_TRIGGER_META[triggerType as TaskLogTriggerType];
  }
  return {
    label: triggerType || "-",
    tag: "info",
    description: triggerType ? "未识别的触发来源" : "历史数据未记录触发来源"
  };
}
