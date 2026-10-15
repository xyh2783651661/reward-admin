/**
 * 抓取结果状态。
 *
 * 三态区分是关键：EMPTY 表示信源正常但当日无内容（一般无需处理），
 * FAILED 表示抛异常降级（才需要关注）。混为一谈会让「无数据」被误判成故障。
 */
type FetchStatus = "SUCCESS" | "EMPTY" | "FAILED" | string;

interface ContentFetchRecordPageReq {
  current: number;
  size: number;
  sourceKey?: string;
  contentType?: string;
  status?: FetchStatus | "";
  bizDate?: string;
  traceId?: string;
  requestTime?: [string, string] | string[];
}

interface ContentFetchRecordPageItem {
  id: number;
  /** 内容业务日期 */
  bizDate: string;
  /** 信源标识，如 WEIBO_HOT */
  sourceKey: string;
  /** 内容分类（DailyContentType 枚举名） */
  contentType: string;
  status: FetchStatus;
  /** 返回条目数 */
  itemCount: number;
  /** 耗时（毫秒） */
  costTimeMs: number;
  /** 失败原因（截断） */
  errorMessage?: string;
  /** 失败时的 Java 异常类全名 */
  exceptionClass?: string;
  /** 链路追踪 ID，串联同一次早报任务的多个信源 */
  traceId?: string;
  createdTime: string;
  updatedTime: string;
}

export type {
  FetchStatus,
  ContentFetchRecordPageReq,
  ContentFetchRecordPageItem
};
