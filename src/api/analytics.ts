import { http } from "@/utils/http";

type ApiResult<T> = {
  code: number;
  msg: string;
  success?: boolean;
  data: T;
};

type StatsMeta = {
  startDate: string;
  endDate: string;
  totalRecords: number;
  calculatedAt: string;
  cacheHit: string;
  timezone: string;
  metricVersion: string;
  dataThrough: string;
};

type AnalyticsResult<T> = {
  data: T;
  meta: StatsMeta;
};

// ==================== AI 调用分析 ====================

type ModelStats = {
  model: string;
  total: number;
  success: number;
  fail: number;
  failRate: number;
  avgCostMs: number;
  totalTokens: number;
  fallbackUsed: number;
};

type BizTypeStats = {
  bizType: string;
  count: number;
  percentage: number;
  avgCostMs: number;
  totalTokens: number;
  failCount: number;
};

type MonthlyTrend = {
  month: string;
  total: number;
  success: number;
  fail: number;
  failRate: number;
  avgCostMs: number;
  totalTokens?: number;
  fallbackCount?: number;
  fallbackRate?: number;
};

type FallbackChain = {
  id: number;
  model: string;
  status: string;
  fallbackTried: string;
  attemptCount: number;
  retryCount: number | null;
  costTimeMs: number;
  bizType: string;
  createdTime: string;
  errorMessage: string;
};

type FallbackPattern = {
  pattern: string;
  count: number;
  successCount: number;
  successRate: number;
};

type ProviderHealthCompare = {
  provider: string;
  healthStatus: string;
  healthReason: string;
  actualSuccess: number;
  actualFail: number;
  actualFailRate: number;
  mismatch: boolean;
};

type AnalyticsAiOverview = {
  totalCalls: number;
  successCount: number;
  failCount: number;
  successRate: number;
  failRate: number;
  avgCostMs: number;
  totalTokens: number;
  fallbackTriggered: number;
  fallbackRate: number;
  fallbackSuccessRate: number;
  modelStats: ModelStats[];
  bizTypeStats: BizTypeStats[];
  monthlyTrend: MonthlyTrend[];
  slowCalls: Record<string, any>[];
  providerHealthCompare: ProviderHealthCompare[];
  fallbackChains?: FallbackChain[];
  fallbackPatterns?: FallbackPattern[];
};

export function getAnalyticsAiOverview(range = 30) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsAiOverview>>>(
    "get",
    `/api/analytics/ai/overview?range=${range}`
  );
}

// ==================== 访问行为分析 ====================

type ApiLatencyStats = {
  uri: string;
  count: number;
  avgMs: number;
  p50: number;
  p95: number;
  p99: number;
  maxMs: number;
};

type ApiFailStats = {
  uri: string;
  total: number;
  failCount: number;
  failRate: number;
};

type IpStats = {
  ip: string;
  ipLocation: string;
  requestCount: number;
  distinctUris: number;
  firstSeen: string;
  lastSeen: string;
};

type ClientTypeStats = {
  browserType: string;
  count: number;
  percentage: number;
};

type DailyRequests = {
  date: string;
  effective: number;
  polling: number;
};

type HeatmapPoint = {
  weekday: number;
  hour: number;
  count: number;
};

type AnalyticsAccessOverview = {
  effectiveRequests: number;
  pollingRequests: number;
  uniqueIps: number;
  avgCostMs: number;
  failCount: number;
  failRate: number;
  apiLatency: ApiLatencyStats[];
  failApis: ApiFailStats[];
  topIps: IpStats[];
  clientTypes: ClientTypeStats[];
  dailyTrend: DailyRequests[];
  heatmap?: HeatmapPoint[];
  latencyBuckets?: LatencyBucket[];
  batchScripts?: BatchScript[];
};

type LatencyBucket = {
  bucket: string;
  count: number;
  percentage: number;
};

type BatchScript = {
  ip: string;
  ipLocation: string;
  uri: string;
  requestCount: number;
  zeroCostRate: number;
  firstSeen: string;
  lastSeen: string;
  spanMinutes: number;
  matched: boolean;
  reason: string;
};

export function getAnalyticsAccessOverview(range = 30) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsAccessOverview>>>(
    "get",
    `/api/analytics/access/overview?range=${range}`
  );
}

export function getAnalyticsAccessLatency(range = 30, uri?: string) {
  const uriParam = uri ? `&uri=${encodeURIComponent(uri)}` : "";
  return http.request<ApiResult<AnalyticsResult<ApiLatencyStats>>>(
    "get",
    `/api/analytics/access/latency?range=${range}${uriParam}`
  );
}

// ==================== 任务执行分析 ====================

type TaskStats = {
  taskName: string;
  total: number;
  success: number;
  fail: number;
  partial: number;
  successRate: number;
  avgCostMs: number;
};

type TaskMonthlyTrend = {
  month: string;
  total: number;
  success: number;
  successRate: number;
  avgCostMs: number;
};

type FailTaskDetail = {
  taskName: string;
  status: string;
  timeCost: number;
  startTime: string;
  exception: string;
};

type AnalyticsTaskOverview = {
  totalTasks: number;
  successCount: number;
  failCount: number;
  partialCount: number;
  successRate: number;
  avgCostMs: number;
  taskStats: TaskStats[];
  monthlyTrend: TaskMonthlyTrend[];
  failTasks: FailTaskDetail[];
  partialTasks?: PartialTaskDetail[];
};

type PartialTaskDetail = {
  taskName: string;
  startTime: string;
  timeCost: number;
  detail: string;
  failedStepCount: number;
  totalStepCount: number;
};

export function getAnalyticsTaskExecution(range = 30) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsTaskOverview>>>(
    "get",
    `/api/analytics/task/execution?range=${range}`
  );
}

// ==================== 内容生产分析 ====================

type ContentSourceStats = {
  sourceKey: string;
  total: number;
  success: number;
  failed: number;
  empty: number;
  successRate: number;
  avgCostMs: number;
};

type AnalyticsContentOverview = {
  fetchTotal: number;
  fetchSuccess: number;
  fetchEmpty: number;
  fetchFailed: number;
  fetchSuccessRate: number;
  imageTotal: number;
  visionDone: number;
  visionFailed: number;
  visionPending: number;
  visionCoverage: number;
  sourceStats: ContentSourceStats[];
};

export function getAnalyticsContentProduction(range = 30) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsContentOverview>>>(
    "get",
    `/api/analytics/content/production?range=${range}`
  );
}

// ==================== 图片消费分析 ====================

type ChannelConsumption = {
  channel: string;
  count: number;
  distinctImages: number;
  percentage: number;
  activeDays: number;
  avgDaily: number;
};

type ImageBizTypeStats = {
  bizType: string;
  count: number;
  percentage: number;
};

type ImageDailyUsage = {
  date: string;
  total: number;
  counts: number[];
};

type ReuseBucket = {
  label: string;
  imageCount: number;
  percentage: number;
};

type TopImage = {
  dailyImageId: number;
  imageDate: string;
  source: string;
  authorName: string;
  useCount: number;
  channels: string;
  firstUsed: string;
  lastUsed: string;
};

type ImageDataQuality = {
  orphanRefs: number;
  deletedImageRefs: number;
  validRefs: number;
  message: string;
};

type SourceEfficiency = {
  source: string;
  stock: number;
  usedImages: number;
  useCount: number;
  coverageRate: number;
  avgUses: number;
  avgDownloadCostMs: number;
  useShare: number;
};

type OrientationStats = {
  orientation: string;
  stock: number;
  useCount: number;
  stockShare: number;
  useShare: number;
  demandIndex: number;
};

type FreshnessBucket = {
  label: string;
  count: number;
  percentage: number;
};

type AuthorStats = {
  author: string;
  useCount: number;
  imageCount: number;
  share: number;
};

type ChannelSourceCell = {
  channel: string;
  source: string;
  count: number;
};

type VisionImpact = {
  statusCode: string;
  statusLabel: string;
  stock: number;
  usedImages: number;
  coverageRate: number;
};

type WeekdayUsage = {
  weekday: number;
  label: string;
  count: number;
};

type SelectionEfficiency = {
  totalSelected: number;
  distinctImages: number;
  publishedImages: number;
  failedImages: number;
  otherImages: number;
  utilizationRate: number;
};

type AnalyticsImageConsumption = {
  totalUsageRecords: number;
  distinctImagesUsed: number;
  distinctImagesReferenced: number;
  activeImageTotal: number;
  coverageRate: number;
  reuseRate: number;
  avgUsesPerImage: number;
  unusedImageCount: number;
  maxUses: number;
  channelNames: string[];
  channelStats: ChannelConsumption[];
  bizTypeStats: ImageBizTypeStats[];
  dailyTrend: ImageDailyUsage[];
  reuseDistribution: ReuseBucket[];
  topImages: TopImage[];
  dataQuality: ImageDataQuality;
  sourceStats?: SourceEfficiency[];
  orientationStats?: OrientationStats[];
  freshnessDistribution?: FreshnessBucket[];
  authorStats?: AuthorStats[];
  channelSourceMatrix?: ChannelSourceCell[];
  visionImpact?: VisionImpact[];
  weekdayDistribution?: WeekdayUsage[];
  selectionEfficiency?: SelectionEfficiency;
};

export function getAnalyticsImageUsage(range = 90) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsImageConsumption>>>(
    "get",
    `/api/analytics/content/image-usage?range=${range}`
  );
}

// ==================== 发布链路分析 ====================

type PublishFailReason = {
  errorType: string;
  count: number;
  avgDurationMs: number;
};

type UploadStats = {
  platformCode: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgDurationMs: number;
};

type AnalyticsPublishOverview = {
  totalPackages: number;
  publishedCount: number;
  failedCount: number;
  publishSuccessRate: number;
  failReasons: PublishFailReason[];
  uploadStats: UploadStats[];
  platformAiCost?: PlatformAiCost[];
  packageDailyTrend?: DailyPublish[];
};

type PlatformAiCost = {
  platformCode: string;
  contentCount: number;
  totalTokens: number;
  avgTokens: number;
  avgCostMs: number;
  failCount: number;
  failRate: number;
};

type DailyPublish = {
  date: string;
  published: number;
  failed: number;
};

export function getAnalyticsPublishOverview(range = 30) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsPublishOverview>>>(
    "get",
    `/api/analytics/publish/overview?range=${range}`
  );
}

// ==================== 邮件运营分析 ====================

type MailMonthlyTrend = {
  month: string;
  total: number;
  success: number;
  fail: number;
  successRate: number;
};

type MailTypeStats = {
  type: string;
  count: number;
  percentage: number;
};

type MailFailReason = {
  reason: string;
  count: number;
};

type AnalyticsMailOverview = {
  totalSent: number;
  successCount: number;
  failCount: number;
  successRate: number;
  monthlyTrend: MailMonthlyTrend[];
  typeStats: MailTypeStats[];
  failReasons: MailFailReason[];
};

export function getAnalyticsMailOverview(range = 90) {
  return http.request<ApiResult<AnalyticsResult<AnalyticsMailOverview>>>(
    "get",
    `/api/analytics/mail/overview?range=${range}`
  );
}

// ==================== 学习成绩分析 ====================

type SubjectScoreStats = {
  subjectName: string;
  count: number;
  avgScore: number;
  avgScoreRate: number;
  minScore: number;
  maxScore: number;
};

type ExamResult = {
  examName: string;
  examDate: string;
  stage: string;
  rewardStatus: string;
};

type RankPoint = {
  examDate: string;
  examName: string;
  rankValue: number;
  participantCount: number;
};

type TargetGapStats = {
  subjectName: string;
  count: number;
  avgScore: number;
  avgTarget: number;
  avgGap: number;
  aboveCount: number;
  belowCount: number;
  achievementRate: number;
};

type ScoreTrendPoint = {
  examDate: string;
  examName: string;
  totalScore: number;
  totalFullScore: number;
  scoreRate: number;
  totalReward: number;
};

type AnalyticsRewardOverview = {
  totalExams: number;
  totalRewards: number;
  subjectStats: SubjectScoreStats[];
  examResults: ExamResult[];
  rankTrend?: RankPoint[];
  targetGapStats?: TargetGapStats[];
  scoreTrend?: ScoreTrendPoint[];
};

export function getAnalyticsRewardOverview() {
  return http.request<ApiResult<AnalyticsResult<AnalyticsRewardOverview>>>(
    "get",
    "/api/analytics/reward/overview"
  );
}

export type {
  AnalyticsAiOverview,
  AnalyticsAccessOverview,
  AnalyticsTaskOverview,
  AnalyticsContentOverview,
  AnalyticsImageConsumption,
  ChannelConsumption,
  ImageBizTypeStats,
  ImageDailyUsage,
  ReuseBucket,
  TopImage,
  ImageDataQuality,
  SourceEfficiency,
  OrientationStats,
  FreshnessBucket,
  AuthorStats,
  ChannelSourceCell,
  VisionImpact,
  WeekdayUsage,
  SelectionEfficiency,
  AnalyticsPublishOverview,
  AnalyticsMailOverview,
  AnalyticsRewardOverview,
  ModelStats,
  BizTypeStats,
  MonthlyTrend,
  ProviderHealthCompare,
  ApiLatencyStats,
  ApiFailStats,
  IpStats,
  ClientTypeStats,
  DailyRequests,
  TaskStats,
  FailTaskDetail,
  PartialTaskDetail,
  PublishFailReason,
  UploadStats,
  MailMonthlyTrend,
  MailTypeStats,
  MailFailReason,
  SubjectScoreStats,
  ExamResult,
  RankPoint,
  TargetGapStats,
  ScoreTrendPoint,
  LatencyBucket,
  BatchScript,
  FallbackChain,
  FallbackPattern,
  PlatformAiCost,
  DailyPublish,
  StatsMeta
};
