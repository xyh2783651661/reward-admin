// ==================== 枚举类型 ====================

/** 健康状态 */
type HealthStatus = "UP" | "WARN" | "DOWN" | "SUSPENDED";

/** 检测类型 */
type CheckType =
  | "ACTIVE_PROBE"
  | "PASSIVE_FAILURE"
  | "PASSIVE_SUCCESS"
  | "NO_RESULT"
  | "CIRCUIT_BROKEN";

/** 检测结果 */
type CheckStatus = "SUCCESS" | "FAIL" | "NO_RESULT";

/** 故障原因 */
type FailureReason =
  | "OK"
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "AUTH_FAILED"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "NO_RESULT"
  | "UNKNOWN_ERROR";

/** 告警类型 */
type AlertType =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RECOVERED"
  | "ALL_PROVIDERS_DOWN"
  | "QUOTA_EXCEEDED";

/** 告警级别 */
type AlertLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";

/** 告警状态 */
type AlertStatus = "OPEN" | "RESOLVED";

// ==================== 请求类型 ====================

/** 图片来源健康分页请求 */
interface ImageProviderHealthPageReq {
  current: number;
  size: number;
  provider?: string;
  status?: HealthStatus;
  reason?: FailureReason;
  enabled?: boolean;
  updatedTime?: [string, string] | string[];
}

/** 检测流水分页请求 */
interface ImageProviderCheckRecordPageReq {
  current: number;
  size: number;
  provider?: string;
  checkType?: CheckType;
  status?: CheckStatus;
  reason?: FailureReason;
  createdTime?: [string, string] | string[];
}

/** 告警记录分页请求 */
interface ImageProviderAlertRecordPageReq {
  current: number;
  size: number;
  provider?: string;
  alertType?: AlertType;
  alertLevel?: AlertLevel;
  status?: AlertStatus;
  createdTime?: [string, string] | string[];
}

/** 趋势统计请求 */
interface ImageProviderStatsTrendReq {
  provider?: string;
  days?: number;
}

/** 路由参数更新 */
interface ImageProviderRoutingReq {
  enabled?: boolean;
  priority?: number;
  weight?: number;
}

// ==================== 响应类型 ====================

/** 图片来源健康记录 */
interface ImageProviderHealthItem {
  id: number;
  provider: string;
  status: HealthStatus;
  reason: FailureReason;
  enabled: boolean;
  priority: number;
  weight: number;
  failCount: number;
  successCount: number;
  lastCheckTime: string;
  lastSuccessTime: string;
  lastFailureTime: string;
  lastErrorMessage: string;
  nextCheckTime: string;
  alertSent: boolean;
  lastAlertTime: string;
  todaySuccessCount: number;
  todayFailureCount: number;
  todayImageCount: number;
  statsDate: string;
  createdTime: string;
  updatedTime: string;
}

/** 检测流水记录 */
interface ImageProviderCheckRecordItem {
  id: number;
  provider: string;
  checkType: CheckType;
  status: CheckStatus;
  reason: FailureReason;
  httpStatus: number;
  costTimeMs: number;
  imageCount: number;
  keyword: string;
  errorMessage: string;
  createdTime: string;
}

/** 告警记录 */
interface ImageProviderAlertRecordItem {
  id: number;
  provider: string;
  alertType: AlertType;
  alertLevel: AlertLevel;
  status: AlertStatus;
  title: string;
  content: string;
  sentCount: number;
  firstSentTime: string;
  lastSentTime: string;
  resolvedTime: string;
  createdTime: string;
  updatedTime: string;
}

/** 统计概览 */
interface ImageProviderStatsOverview {
  totalProviders: number;
  upCount: number;
  warnCount: number;
  downCount: number;
  suspendedCount: number;
  enabledCount: number;
  disabledCount: number;
  todayCheckCount: number;
  todayFailCount: number;
  todayImageCount: number;
  openAlertCount: number;
}

/** 趋势统计项 */
interface ImageProviderStatsTrendItem {
  provider: string;
  successCounts: number[];
  failCounts: number[];
  avgCostTimeMs: number[];
}

/** 趋势统计响应 */
interface ImageProviderStatsTrend {
  dates: string[];
  items: ImageProviderStatsTrendItem[];
}

/** 供应商下拉项 */
interface ImageProviderOption {
  provider: string;
  name: string;
  status: HealthStatus;
  enabled: boolean;
}

/** 下拉选项 */
interface DropdownOption {
  value: string;
  label: string;
}

/** 所有下拉选项 */
interface ImageProviderDropdownOptions {
  providers: DropdownOption[];
  healthStatusList: DropdownOption[];
  failureReasonList: DropdownOption[];
  checkTypeList: DropdownOption[];
  checkStatusList: DropdownOption[];
  alertTypeList: DropdownOption[];
  alertLevelList: DropdownOption[];
  alertStatusList: DropdownOption[];
}

export type {
  HealthStatus,
  CheckType,
  CheckStatus,
  FailureReason,
  AlertType,
  AlertLevel,
  AlertStatus,
  ImageProviderHealthPageReq,
  ImageProviderCheckRecordPageReq,
  ImageProviderAlertRecordPageReq,
  ImageProviderStatsTrendReq,
  ImageProviderRoutingReq,
  ImageProviderHealthItem,
  ImageProviderCheckRecordItem,
  ImageProviderAlertRecordItem,
  ImageProviderStatsOverview,
  ImageProviderStatsTrendItem,
  ImageProviderStatsTrend,
  ImageProviderOption,
  DropdownOption,
  ImageProviderDropdownOptions
};
