// ==================== 枚举类型 ====================

type PoolName =
  | "ip-location-pool"
  | "reverse-geocode-pool"
  | "place-search-pool";

type HealthStatus = "UP" | "WARN" | "DOWN" | "SUSPENDED";

type CheckType =
  | "ACTIVE_PROBE"
  | "PASSIVE_FAILURE"
  | "PASSIVE_SUCCESS"
  | "NO_RESULT"
  | "CIRCUIT_BROKEN";

type CheckStatus = "SUCCESS" | "FAIL" | "NO_RESULT";

type FailureReason =
  | "OK"
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "AUTH_FAILED"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "NO_RESULT"
  | "UNKNOWN_ERROR";

type AlertType =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_RECOVERED"
  | "ALL_PROVIDERS_DOWN"
  | "QUOTA_EXCEEDED";

type AlertLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";

type AlertStatus = "OPEN" | "RESOLVED";

// ==================== 请求 ====================

interface GeoProviderHealthPageReq {
  current: number;
  size: number;
  poolName?: PoolName | string;
  provider?: string;
  status?: HealthStatus;
  reason?: FailureReason;
  enabled?: boolean;
  updatedTime?: [string, string] | string[];
}

interface GeoProviderCheckRecordPageReq {
  current: number;
  size: number;
  poolName?: PoolName | string;
  provider?: string;
  checkType?: CheckType;
  status?: CheckStatus;
  reason?: FailureReason;
  createdTime?: [string, string] | string[];
}

interface GeoProviderAlertRecordPageReq {
  current: number;
  size: number;
  poolName?: PoolName | string;
  provider?: string;
  alertType?: AlertType;
  alertLevel?: AlertLevel;
  status?: AlertStatus;
  createdTime?: [string, string] | string[];
}

interface GeoProviderStatsTrendReq {
  poolName?: PoolName | string;
  provider?: string;
  days?: number;
}

interface GeoProviderRoutingReq {
  enabled?: boolean;
  priority?: number;
  weight?: number;
}

interface GeoProviderBatchItem {
  poolName: string;
  provider: string;
}

// ==================== 响应 ====================

interface GeoProviderHealthItem {
  id: number;
  poolName: PoolName | string;
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
  statsDate: string;
  createdTime: string;
  updatedTime: string;
}

interface GeoProviderCheckRecordItem {
  id: number;
  poolName: PoolName | string;
  provider: string;
  checkType: CheckType;
  status: CheckStatus;
  reason: FailureReason;
  httpStatus: number;
  costTimeMs: number;
  sampleInput: string;
  errorMessage: string;
  createdTime: string;
}

interface GeoProviderAlertRecordItem {
  id: number;
  poolName: PoolName | string;
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

interface GeoProviderPoolCount {
  poolName: string;
  total: number;
  up: number;
  down: number;
}

interface GeoProviderStatsOverview {
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
  countsByPool: GeoProviderPoolCount[];
}

interface GeoProviderStatsTrendItem {
  poolName: string;
  provider: string;
  successCounts: number[];
  failCounts: number[];
  avgCostTimeMs: number[];
}

interface GeoProviderStatsTrend {
  dates: string[];
  items: GeoProviderStatsTrendItem[];
}

interface GeoProviderOption {
  poolName: string;
  provider: string;
  name: string;
  status: HealthStatus;
  enabled: boolean;
}

interface DropdownOption {
  value: string;
  label: string;
}

interface GeoProviderDropdownOptions {
  pools: DropdownOption[];
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
  PoolName,
  HealthStatus,
  CheckType,
  CheckStatus,
  FailureReason,
  AlertType,
  AlertLevel,
  AlertStatus,
  GeoProviderHealthPageReq,
  GeoProviderCheckRecordPageReq,
  GeoProviderAlertRecordPageReq,
  GeoProviderStatsTrendReq,
  GeoProviderRoutingReq,
  GeoProviderBatchItem,
  GeoProviderHealthItem,
  GeoProviderCheckRecordItem,
  GeoProviderAlertRecordItem,
  GeoProviderPoolCount,
  GeoProviderStatsOverview,
  GeoProviderStatsTrendItem,
  GeoProviderStatsTrend,
  GeoProviderOption,
  DropdownOption,
  GeoProviderDropdownOptions
};
