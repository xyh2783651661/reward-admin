/**
 * 抓取结果状态。
 *
 * 三态区分是关键：EMPTY 表示信源正常但当日无内容（一般无需处理），
 * FAILED 表示抛异常降级（才需要关注）。混为一谈会让「无数据」被误判成故障。
 */
type FetchStatus = "SUCCESS" | "EMPTY" | "FAILED" | string;

/**
 * HTTP 明细状态：解释这条流水为什么有/没有明细。
 *
 * 没有这个字段时，「大量流水点进去没有明细」看起来就像数据丢了；
 * 实际上 SUCCESS 里绝大多数是命中 Redis 缓存、根本没发请求。
 */
type DetailStatus = "CAPTURED" | "CACHE_HIT" | "NO_HTTP" | "FAILED" | string;

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
  /** HTTP 明细状态；迁移前的历史行为空（无从判断） */
  detailStatus?: DetailStatus;
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

/** 单条抓取内容（解析后的结果，用于回答「这条流水到底抓到了什么」）。 */
interface ContentFetchItemRow {
  id: number;
  recordId: number;
  /** 在本次抓取结果中的序号，从 1 开始 */
  seqNo: number;
  contentType?: string;
  title?: string;
  /** 原文链接 */
  url?: string;
  /** 条目自身标注的来源站点 */
  source?: string;
  sourceKey?: string;
  summary?: string;
  publishTime?: string;
  /** 条目自带日期文本（如历史事件年份） */
  dateText?: string;
  /** 1 = AI 补位生成，0/null = 真实信源 */
  aiGenerated?: number;
}

export type {
  FetchStatus,
  DetailStatus,
  ContentFetchRecordPageReq,
  ContentFetchRecordPageItem,
  ContentFetchItemRow
};
