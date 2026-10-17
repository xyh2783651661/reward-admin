import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/**
 * 发布结果流水记录。
 *
 * 与内容包详情里的 publish_status 的区别：那条是【状态快照】，只保留最后一次结果；
 * 这条是【流水】，每一次尝试都留痕。排查「到底失败过几次、为什么失败」必须看这里。
 */
export type PublishRecord = {
  id: number;
  packageId?: number | null;
  contentId?: number | null;
  /** 业务日期 yyyy-MM-dd */
  bizDate?: string | null;
  platformCode: string;
  platformName?: string;
  /** success=成功 / failed=失败 */
  status: string;
  /** 同一「包 × 平台」的第几次尝试，从 1 开始 */
  attemptNo: number;
  /** 失败归类 code */
  errorType?: string;
  /** 失败归类中文名，后端已给，前端不必再维护映射 */
  errorTypeLabel?: string;
  /** 结果说明；失败时为原因原文 */
  message?: string;
  taskId?: string;
  externalUrl?: string;
  /** 客户端实测耗时（毫秒） */
  durationMs?: number | null;
  startedAt?: string;
  finishedAt?: string;
  clientHost?: string;
  clientVersion?: string;
  /** api=实时回写 / replay=事后补报 */
  source?: string;
  createdTime?: string;
  /** 内容包标题，查询时后端附带 */
  packageTitle?: string;
};

export type PublishRecordStats = {
  total: number;
  successCount: number;
  failedCount: number;
  /** 成功率百分数整数部分 */
  successRate: number;
  avgDurationMs?: number | null;
  platformStats: Array<{
    platformCode: string;
    platformName?: string;
    total: number;
    successCount: number;
    failedCount: number;
  }>;
  errorTypeStats: Array<{
    errorType: string;
    errorTypeLabel: string;
    count: number;
  }>;
  dailyStats: Array<{
    bizDate: string;
    total: number;
    successCount: number;
    failedCount: number;
  }>;
};

/** 分页查询发布记录 */
export const getPublishRecordPage = (params?: object) => {
  return http.request<ApiPageResult<PublishRecord>>(
    "get",
    "/api/publish-records/page",
    { params }
  );
};

/** 查询单条详情（看完整失败原文） */
export const getPublishRecordDetail = (id: number) => {
  return http.request<ApiResult<PublishRecord>>(
    "get",
    `/api/publish-records/${id}`
  );
};

/**
 * 区间概览统计。
 *
 * 不传日期时后端默认覆盖最近 30 天。
 */
export const getPublishRecordStats = (params?: object) => {
  return http.request<ApiResult<PublishRecordStats>>(
    "get",
    "/api/publish-records/stats",
    { params }
  );
};
