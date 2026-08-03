import dayjs from "dayjs";
import { computed, reactive, ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getImageProviderHealthPage,
  getImageProviderStatsOverview,
  probeImageProvider,
  enableImageProvider,
  disableImageProvider,
  resetImageProviderCircuit,
  batchEnableImageProviders,
  batchDisableImageProviders,
  batchResetImageProviders
} from "@/api/image-provider-health";
import type {
  HealthStatus,
  ImageProviderHealthItem,
  ImageProviderStatsOverview
} from "../types";

/** 卡片视图行数据（附带行内 loading 态） */
export interface ImageProviderCardItem extends ImageProviderHealthItem {
  _probing?: boolean;
  _resetting?: boolean;
  _toggling?: boolean;
}

/** 状态过滤器：all 全部 / abnormal 异常(WARN+DOWN) / 单一状态 */
export type StatusFilter = "all" | "abnormal" | HealthStatus;

const STATUS_SEVERITY: Record<string, number> = {
  DOWN: 0,
  WARN: 1,
  SUSPENDED: 2,
  UP: 3
};

export function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

/** 相对时间（面向运维快速扫读） */
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

export function useImageProviderStatus() {
  const dataList = ref<ImageProviderCardItem[]>([]);
  const loading = ref(true);
  /** 勾选的 provider 名单（卡片复选框） */
  const selectedProviders = ref<string[]>([]);
  /** 统计条点击过滤 */
  const statusFilter = ref<StatusFilter>("all");
  const batchWorking = ref(false);

  const statsOverview = reactive<ImageProviderStatsOverview>({
    totalProviders: 0,
    upCount: 0,
    warnCount: 0,
    downCount: 0,
    suspendedCount: 0,
    enabledCount: 0,
    disabledCount: 0,
    todayCheckCount: 0,
    todayFailCount: 0,
    todayImageCount: 0,
    openAlertCount: 0
  });

  /** 异常优先排序 + 状态过滤后的卡片列表 */
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

  function toggleSelect(provider: string) {
    const idx = selectedProviders.value.indexOf(provider);
    if (idx >= 0) selectedProviders.value.splice(idx, 1);
    else selectedProviders.value.push(provider);
  }

  function clearSelection() {
    selectedProviders.value = [];
  }

  function selectAllVisible() {
    selectedProviders.value = filteredList.value.map(i => i.provider);
  }

  async function loadStats() {
    try {
      const { data } =
        await getImageProviderStatsOverview<ImageProviderStatsOverview>();
      Object.assign(statsOverview, data);
    } catch (error) {
      console.error("加载统计概览失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      // 来源数量有限，卡片看板一次性拉取全部（复用分页接口，size 放大）
      const { data } =
        await getImageProviderHealthPage<ImageProviderHealthItem>({
          current: 1,
          size: 100
        });
      dataList.value = (data.records ?? []).map(item => ({
        ...item,
        _probing: false,
        _resetting: false,
        _toggling: false
      }));
      // 清理已不存在的勾选项
      const names = new Set(dataList.value.map(i => i.provider));
      selectedProviders.value = selectedProviders.value.filter(p =>
        names.has(p)
      );
      await loadStats();
    } catch (error) {
      console.error("加载图片来源健康数据失败", error);
      dataList.value = [];
      message("加载图片来源健康数据失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onProbe(row: ImageProviderCardItem) {
    row._probing = true;
    try {
      const { data } = await probeImageProvider<ImageProviderHealthItem>(
        row.provider
      );
      Object.assign(row, data);
      message(`探测完成：${row.provider} ${getStatusLabel(row.status)}`, {
        type: row.status === "UP" ? "success" : "warning"
      });
      loadStats();
    } catch (error) {
      console.error("探测失败", error);
      message("探测失败", { type: "error" });
    } finally {
      row._probing = false;
    }
  }

  async function onToggleEnable(row: ImageProviderCardItem) {
    const action = row.enabled ? "禁用" : "启用";
    try {
      await ElMessageBox.confirm(
        `确认${action}图片来源 ${row.provider}？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      row._toggling = true;
      const api = row.enabled ? disableImageProvider : enableImageProvider;
      const { data } = await api<ImageProviderHealthItem>(row.provider);
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

  async function onReset(row: ImageProviderCardItem) {
    try {
      await ElMessageBox.confirm(
        `确认重置来源 ${row.provider} 的熔断状态？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      row._resetting = true;
      const { data } = await resetImageProviderCircuit<ImageProviderHealthItem>(
        row.provider
      );
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

  async function runBatch(action: "enable" | "disable" | "reset") {
    if (!selectedProviders.value.length) {
      message("请先勾选来源", { type: "warning" });
      return;
    }
    const labelMap = {
      enable: "批量启用",
      disable: "批量禁用",
      reset: "批量重置熔断"
    } as const;
    const label = labelMap[action];
    try {
      await ElMessageBox.confirm(
        `确认对已选 ${selectedProviders.value.length} 个来源执行「${label}」？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      batchWorking.value = true;
      const providers = [...selectedProviders.value];
      if (action === "enable") await batchEnableImageProviders(providers);
      else if (action === "disable")
        await batchDisableImageProviders(providers);
      else await batchResetImageProviders(providers);
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

  return {
    loading,
    dataList,
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
    onReset,
    runBatch
  };
}
