import { http } from "@/utils/http";
import type { ApiResult } from "./types";

/** 单个可补偿任务的元数据，来自后端 @TaskGuard 注解 + 反射 */
export interface TaskMetadata {
  /** 唯一任务码，补偿接口按它定位任务 */
  code: string;
  /** 任务展示名 */
  name: string;
  /** 任务描述 */
  description: string;
  /** Spring bean 名（一般不用，仅排查反射问题时看） */
  beanName: string;
  /** 方法名 */
  methodName: string;
  /** 分布式锁 key，空串表示未启用并发控制 */
  lockKey: string;
  /** false = 后端显式禁用手动补偿，前端应禁用触发按钮 */
  compensable: boolean;
  /** 前置依赖 bean 名列表，空数组表示无依赖 */
  dependsOn: string[];
}

/** 触发补偿的请求体 */
export interface TaskCompensationTriggerReq {
  /** 是否强制释放分布式锁再执行；默认 false */
  force?: boolean;
  /** 依赖检查失败时是否尝试自动修复；默认 false */
  autoFix?: boolean;
  /** 是否跳过依赖检查（危险）；默认 false */
  skipDeps?: boolean;
  /** 是否异步执行；默认 false。同步模式下 HTTP 会阻塞到任务跑完，大任务务必置 true */
  async?: boolean;
  /** 触发原因，写入日志供审计 */
  reason?: string;
}

/**
 * 触发结果状态：
 * - EXECUTED 同步=已执行完成；异步=已提交
 * - DEPENDENCY_FAILED 前置依赖未满足
 * - NOT_COMPENSABLE 该任务显式禁用了手动补偿
 * - NOT_FOUND 任务码不存在
 * - ERROR 执行异常
 *
 * 注：后端 TriggerResult 注释里还声明了 LOCK_BUSY，但当前实现并未产出该状态，
 * 这里一并保留以便后端补齐后前端无需改动。
 */
export type TriggerStatus =
  | "EXECUTED"
  | "DEPENDENCY_FAILED"
  | "LOCK_BUSY"
  | "NOT_COMPENSABLE"
  | "NOT_FOUND"
  | "ERROR";

/** 补偿触发结果 */
export interface TriggerResult {
  /** 仅 EXECUTED 为 true；异步模式下代表「提交成功」而非「执行成功」 */
  success: boolean;
  status: TriggerStatus;
  taskCode: string;
  /** 展示消息，后端已写好可直接给用户的文案 */
  message: string;
  /** 任务耗时（ms），仅同步模式（async=false）有值 */
  timeCostMs?: number | null;
  /** 触发原因回显 */
  reason?: string | null;
}

/** 获取全部可补偿任务列表（不分页，约 34 条） */
export const getCompensableTasks = () => {
  return http.request<ApiResult<TaskMetadata[]>>("get", "/api/admin/tasks");
};

/** 获取单个任务详情 */
export const getCompensableTaskDetail = (code: string) => {
  return http.request<ApiResult<TaskMetadata>>(
    "get",
    `/api/admin/tasks/${code}`
  );
};

/** 触发一次任务补偿 */
export const triggerTaskCompensation = (
  code: string,
  data?: TaskCompensationTriggerReq
) => {
  return http.request<ApiResult<TriggerResult>>(
    "post",
    `/api/admin/tasks/${code}/trigger`,
    { data }
  );
};
