import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getGeoProviderHealthPage,
  getGeoProviderStatsOverview,
  getGeoProviderDropdownOptions,
  probeGeoProvider,
  enableGeoProvider,
  disableGeoProvider,
  resetGeoProviderCircuit,
  batchEnableGeoProviders,
  batchDisableGeoProviders,
  batchResetGeoProviders
} from "@/api/geo-provider-health";
import type {
  GeoProviderHealthItem,
  GeoProviderStatsOverview,
  GeoProviderDropdownOptions
} from "../types";

export interface ProviderCardItem extends GeoProviderHealthItem {
  _probing?: boolean;
  _resetting?: boolean;
  _toggling?: boolean;
}

// 状态过滤器
export type StatusFilter = "all" | "abnormal" | "UP" | "WARN" | "DOWN" | "SUSPENDED";

const STATUS_SEVERITY: Record<string, number> = {
  DOWN: 0,
  WARN: 1,
  SUSPENDED: 2,
  UP: 3
};

export function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

export function formatRelative(value?: string | null) {
  if (!value) return "-";
  const target = dayjs(value);
  const diffMin = dayjs().diff(target, "minute");
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} 天前`;
  return target.format("YYYY-MM-DD");
}

export function getStatusLabel(status?: string) {
  if (status === "UP") return "正常";
  if (status === "WARN") return "警告";
  if (status === "DOWN") return "不可用";
  if (status === "SUSPENDED") return "已暂停";
  return status || "-";
}

export function getReasonLabel(reason?: string) {
  const map: Record<string, string> = {
    OK: "正常",
    RATE_LIMIT: "频率限制",
    QUOTA_EXCEEDED: "配额超限",
    AUTH_FAILED: "认证失败",
    NETWORK_ERROR: "网络错误",
    PROVIDER_ERROR: "供应商错误",
    NO_RESULT: "无结果",
    UNKNOWN_ERROR: "未知错误"
  };
  return map[reason || ""] || reason || "-";
}

export function getPoolLabel(pool?: string) {
  if (pool === "ip-location-pool") return "IP 归属地";
  if (pool === "reverse-geocode-pool") return "逆地理编码";
  if (pool === "place-search-pool") return "POI 搜索";
  return pool || "-";
}

export function useGeoProviderStatus() {
  const dataList = ref<ProviderCardItem[]>([]);
  const loading = ref(true);
  const selectedProviders = ref<{ poolName?: string; provider: string }[]>([]);
  const statusFilter = ref<StatusFilter>("all");
  const batchWorking = ref(false);

  const statsOverview = reactive<GeoProviderStatsOverview>({
    totalProviders: 0,
    upCount: 0,
    warnCount: 0,
    downCount: 0,
    suspendedCount: 0,
    enabledCount: 0,
    disabledCount: 0,
    todayCheckCount: 0,
    todayFailCount: 0,
    openAlertCount: 0,
    countsByPool: []
  });

  const dropdownOptions = reactive<GeoProviderDropdownOptions>({
    pools: [],
    providers: [],
    healthStatusList: [],
    failureReasonList: [],
    checkTypeList: [],
    checkStatusList: [],
    alertTypeList: [],
    alertLevelList: [],
    alertStatusList: []
  });

  const filteredList = computed(() => {
    let list = dataList.value;
    if (statusFilter.value === "abnormal") {
      list = list.filter(i => i.status === "WARN" || i.status === "DOWN");
    } else if (statusFilter.value !== "all") {
      list = list.filter(i => i.status === statusFilter.value);
    }
    return [...list].sort((a, b) => {
      const sa = STATUS_SEVERITY[a.status] ?? 9;
      const sb = STATUS_SEVERITY[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.failCount ?? 0) - (a.failCount ?? 0);
    });
  });

  const selectedCount = computed(() => selectedProviders.value.length);

  function toggleStatusFilter(filter: StatusFilter) {
    statusFilter.value = statusFilter.value === filter ? "all" : filter;
  }

  function toggleSelect(provider: string, poolName?: string) {
    const idx = selectedProviders.value.findIndex(p => p.provider === provider && p.poolName === poolName);
    if (idx >= 0) selectedProviders.value.splice(idx, 1);
    else selectedProviders.value.push({ poolName, provider });
  }

  function clearSelection() {
    selectedProviders.value = [];
  }

  function selectAllVisible() {
    selectedProviders.value = filteredList.value.map(i => ({ poolName: i.poolName, provider: i.provider }));
  }

  async function loadStats() {
    try {
      const { data } = await getGeoProviderStatsOverview<GeoProviderStatsOverview>();
      Object.assign(statsOverview, data);
    } catch (error) {
      console.error("加载统计概览失败", error);
    }
  }

  async function loadDropdown() {
    try {
      const { data } = await getGeoProviderDropdownOptions<GeoProviderDropdownOptions>();
      Object.assign(dropdownOptions, data);
    } catch (error) {
      console.error("加载下拉字典失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getGeoProviderHealthPage<GeoProviderHealthItem>({ current: 1, size: 100 });
      dataList.value = (data.records ?? []).map(item => ({ ...item, _probing: false, _resetting: false, _toggling: false }));
      // clean selections
      const names = new Set(dataList.value.map(i => `${i.poolName}|${i.provider}`));
      selectedProviders.value = selectedProviders.value.filter(p => names.has(`${p.poolName}|${p.provider}`));
      await loadStats();
    } catch (error) {
      console.error("加载地理来源健康数据失败", error);
      dataList.value = [];
      message("加载地理来源健康数据失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onProbe(row: ProviderCardItem) {
    row._probing = true;
    try {
      const { data } = await probeGeoProvider<GeoProviderHealthItem>(row.poolName as string, row.provider);
      Object.assign(row, data);
      message(`探测完成：${row.provider} ${getStatusLabel(row.status)}`, { type: row.status === "UP" ? "success" : "warning" });
      loadStats();
    } catch (error) {
      console.error("探测失败", error);
      message("探测失败", { type: "error" });
    } finally {
      row._probing = false;
    }
  }

  async function onToggleEnable(row: ProviderCardItem) {
    const action = row.enabled ? "禁用" : "启用";
    try {
      await ElMessageBox.confirm(`确认${action}来源 ${row.poolName}/${row.provider}？`, "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" });
      row._toggling = true;
      const api = row.enabled ? disableGeoProvider : enableGeoProvider;
      const { data } = await api<GeoProviderHealthItem>(row.poolName as string, row.provider);
      Object.assign(row, data);
      message(`${action}成功`, { type: "success" });
      loadStats();
    } catch (error) {
      if (error !== "cancel") {
        console.error(`${action}失败`, error);
        message(`${action}失败`, { type: "error" });
      }
    } finally {
      row._toggling = false;
    }
  }

  async function onReset(row: ProviderCardItem) {
    try {
      await ElMessageBox.confirm(`确认重置 ${row.poolName}/${row.provider} 的熔断状态？`, "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" });
      row._resetting = true;
      const { data } = await resetGeoProviderCircuit<GeoProviderHealthItem>(row.poolName as string, row.provider);
      Object.assign(row, data);
      message("熔断已重置", { type: "success" });
      loadStats();
    } catch (error) {
      if (error !== "cancel") {
        console.error("重置熔断失败", error);
        message("重置熔断失败", { type: "error" });
      }
    } finally {
      row._resetting = false;
    }
  }

  function selectedItems() {
    return selectedProviders.value.map(row => ({ poolName: row.poolName as string, provider: row.provider }));
  }

  async function runBatch(action: "enable" | "disable" | "reset") {
    if (!selectedProviders.value.length) {
      message("请先勾选来源", { type: "warning" });
      return;
    }
    const labelMap = { enable: "批量启用", disable: "批量禁用", reset: "批量重置熔断" } as const;
    const label = labelMap[action];
    try {
      await ElMessageBox.confirm(`确认对已选 ${selectedProviders.value.length} 个来源执行「${label}」？`, "提示", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" });
      batchWorking.value = true;
      const providers = selectedItems();
      if (action === "enable") await batchEnableGeoProviders(providers);
      else if (action === "disable") await batchDisableGeoProviders(providers);
      else await batchResetGeoProviders(providers);
      message(`${label}成功`, { type: "success" });
      clearSelection();
      onSearch();
    } catch (error) {
      if (error !== "cancel") {
        console.error(`${label}失败`, error);
        message(`${label}失败`, { type: "error" });
      }
    } finally {
      batchWorking.value = false;
    }
  }

  onMounted(() => {
    loadDropdown();
  });

  return {
    loading,
    filteredList,
    statsOverview,
    statusFilter,
    selectedProviders,
    selectedCount,
    batchWorking,
    toggleStatusFilter,
    toggleSelect,
    clearSelection,
    selectAllVisible,
    onSearch,
    onProbe,
    onToggleEnable,
    runBatch,
    onReset,
    getPoolLabel
  };
}
