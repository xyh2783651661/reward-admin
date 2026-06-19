// ==================== 枚举类型 ====================

/** 健康状态 */
type HealthStatus = "UP" | "WARN" | "DOWN" | "SUSPENDED";

/** 检测类型 */
type CheckType =
  | "ACTIVE_PROBE"
  | "PASSIVE_FAILURE"
  | "PASSIVE_SUCCESS"
  | "BALANCE_QUERY";

/** 检测结果 */
type CheckStatus = "SUCCESS" | "FAIL";

/** 故障原因 */
type FailureReason =
  | "OK"
  | "INSUFFICIENT_BALANCE"
  | "QUOTA_EXCEEDED"
  | "AUTH_FAILED"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "UNKNOWN_ERROR"
  | "BALANCE_LOW";

/** 告警类型 */
type AlertType =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RECOVERED"
  | "ALL_PROVIDERS_DOWN"
  | "BALANCE_LOW";

/** 告警级别 */
type AlertLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";

/** 告警状态 */
type AlertStatus = "OPEN" | "RESOLVED";

// ==================== 请求类型 ====================

/** 供应商健康分页请求 */
interface ProviderHealthPageReq {
  current: number;
  size: number;
  provider?: string;
  status?: HealthStatus;
  reason?: FailureReason;
  enabled?: boolean;
  updatedTime?: [string, string] | string[];
}

/** 检测流水分页请求 */
interface CheckRecordPageReq {
  current: number;
  size: number;
  provider?: string;
  checkType?: CheckType;
  status?: CheckStatus;
  reason?: FailureReason;
  createdTime?: [string, string] | string[];
}

/** 告警记录分页请求 */
interface AlertRecordPageReq {
  current: number;
  size: number;
  provider?: string;
  alertType?: AlertType;
  alertLevel?: AlertLevel;
  status?: AlertStatus;
  createdTime?: [string, string] | string[];
}

/** 趋势统计请求 */
interface StatsTrendReq {
  provider?: string;
  days?: number;
}

// ==================== 响应类型 ====================

/** 供应商健康记录 */
interface ProviderHealthItem {
  id: number;
  provider: string;
  status: HealthStatus;
  reason: FailureReason;
  enabled: boolean;
  failCount: number;
  successCount: number;
  lastCheckTime: string;
  lastSuccessTime: string;
  lastFailureTime: string;
  lastErrorMessage: string;
  nextCheckTime: string;
  alertSent: boolean;
  lastAlertTime: string;
  balanceAmount: number;
  balanceCurrency: string;
  quotaRemaining: number;
  createdTime: string;
  updatedTime: string;
}

/** 检测流水记录 */
interface CheckRecordItem {
  id: number;
  provider: string;
  checkType: CheckType;
  status: CheckStatus;
  reason: FailureReason;
  httpStatus: number;
  costTimeMs: number;
  requestId: string;
  errorMessage: string;
  balanceAmount: number;
  balanceCurrency: string;
  quotaRemaining: number;
  rawPayload: string;
  createdTime: string;
}

/** 告警记录 */
interface AlertRecordItem {
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
interface StatsOverview {
  totalProviders: number;
  upCount: number;
  warnCount: number;
  downCount: number;
  suspendedCount: number;
  enabledCount: number;
  disabledCount: number;
  todayCheckCount: number;
  todayFailCount: number;
  openAlertCount: number;
}

/** 趋势统计项 */
interface StatsTrendItem {
  provider: string;
  successCounts: number[];
  failCounts: number[];
  avgCostTimeMs: number[];
}

/** 趋势统计响应 */
interface StatsTrend {
  dates: string[];
  items: StatsTrendItem[];
}

/** 供应商下拉项 */
interface ProviderOption {
  provider: string;
  status: HealthStatus;
  enabled: boolean;
}

/** 下拉选项 */
interface DropdownOption {
  value: string;
  label: string;
}

/** 所有下拉选项 */
interface DropdownOptions {
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
  ProviderHealthPageReq,
  CheckRecordPageReq,
  AlertRecordPageReq,
  StatsTrendReq,
  ProviderHealthItem,
  CheckRecordItem,
  AlertRecordItem,
  StatsOverview,
  StatsTrendItem,
  StatsTrend,
  ProviderOption,
  DropdownOption,
  DropdownOptions
};
