import dayjs from "dayjs";
import { reactive, ref, onMounted, type Ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
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

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getStatusType(status?: string) {
  if (status === "UP") return "success";
  if (status === "WARN") return "warning";
  if (status === "DOWN") return "danger";
  if (status === "SUSPENDED") return "info";
  return "primary";
}

function getStatusLabel(status?: string) {
  const map: Record<string, string> = {
    UP: "正常",
    WARN: "警告",
    DOWN: "不可用",
    SUSPENDED: "已暂停"
  };
  return map[status || ""] || status || "-";
}

function getReasonLabel(reason?: string) {
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

function getReasonType(reason?: string) {
  if (reason === "OK") return "success";
  if (["QUOTA_EXCEEDED", "AUTH_FAILED"].includes(reason || "")) return "danger";
  if (["RATE_LIMIT", "NETWORK_ERROR", "PROVIDER_ERROR"].includes(reason || ""))
    return "warning";
  return "info";
}

function getPoolLabel(pool?: string) {
  if (pool === "ip-location-pool") return "IP 归属地";
  if (pool === "reverse-geocode-pool") return "逆地理编码";
  if (pool === "place-search-pool") return "POI 搜索";
  return pool || "-";
}

export function useGeoProviderStatus(_tableRef?: Ref) {
  const form = reactive({
    poolName: ""
  });
  const dataList = ref<GeoProviderHealthItem[]>([]);
  const loading = ref(true);
  const selectedRows = ref<GeoProviderHealthItem[]>([]);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

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

  const columns: TableColumnList = [
    {
      type: "selection",
      width: 55,
      align: "left"
    },
    {
      label: "池子",
      prop: "poolName",
      minWidth: 130,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} effect="plain">
          {getPoolLabel(row.poolName)}
        </el-tag>
      )
    },
    {
      label: "来源",
      prop: "provider",
      minWidth: 120
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getStatusType(row.status)}
          effect="plain"
        >
          {getStatusLabel(row.status)}
        </el-tag>
      )
    },
    {
      label: "故障原因",
      prop: "reason",
      minWidth: 120,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getReasonType(row.reason)}
          effect="plain"
        >
          {getReasonLabel(row.reason)}
        </el-tag>
      )
    },
    {
      label: "启用",
      prop: "enabled",
      minWidth: 90,
      cellRenderer: ({ row }) => (
        <el-tag type={row.enabled ? "success" : "info"} effect="plain">
          {row.enabled ? "已启用" : "已禁用"}
        </el-tag>
      )
    },
    {
      label: "优先级",
      prop: "priority",
      minWidth: 90
    },
    {
      label: "权重",
      prop: "weight",
      minWidth: 80
    },
    {
      label: "连续失败",
      prop: "failCount",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <span class={row.failCount > 0 ? "text-danger" : ""}>
          {row.failCount}
        </span>
      )
    },
    {
      label: "今日成功",
      prop: "todaySuccessCount",
      minWidth: 100,
      formatter: ({ todaySuccessCount }) => todaySuccessCount ?? 0
    },
    {
      label: "今日失败",
      prop: "todayFailureCount",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <span class={row.todayFailureCount > 0 ? "text-danger" : ""}>
          {row.todayFailureCount ?? 0}
        </span>
      )
    },
    {
      label: "最后调用",
      prop: "lastCheckTime",
      minWidth: 180,
      formatter: ({ lastCheckTime }) => formatTime(lastCheckTime)
    },
    {
      label: "最后成功",
      prop: "lastSuccessTime",
      minWidth: 180,
      formatter: ({ lastSuccessTime }) => formatTime(lastSuccessTime)
    },
    {
      label: "告警",
      prop: "alertSent",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.alertSent ? "danger" : "info"}
          effect="plain"
        >
          {row.alertSent ? "已告警" : "正常"}
        </el-tag>
      )
    },
    {
      label: "操作",
      fixed: "right",
      width: 240,
      slot: "operation"
    }
  ];

  function handleSizeChange(val: number) {
    pagination.pageSize = val;
    pagination.currentPage = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    pagination.currentPage = val;
    onSearch();
  }

  async function loadDropdown() {
    try {
      const { data } =
        await getGeoProviderDropdownOptions<GeoProviderDropdownOptions>();
      Object.assign(dropdownOptions, data);
    } catch (error) {
      console.error("加载下拉字典失败", error);
    }
  }

  async function loadStats() {
    try {
      const { data } =
        await getGeoProviderStatsOverview<GeoProviderStatsOverview>();
      Object.assign(statsOverview, data);
    } catch (error) {
      console.error("加载统计概览失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const payload: Record<string, any> = {
        current: pagination.currentPage,
        size: pagination.pageSize
      };
      if (form.poolName) payload.poolName = form.poolName;
      const { data } =
        await getGeoProviderHealthPage<GeoProviderHealthItem>(payload);
      dataList.value = (data.records ?? []).map((item: any) => ({
        ...item,
        _probing: false,
        _resetting: false
      }));
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? 10;
      pagination.currentPage = data.current ?? 1;
      await loadStats();
    } catch (error) {
      console.error("加载地理来源健康数据失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载地理来源健康数据失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onProbe(row: GeoProviderHealthItem & { _probing?: boolean }) {
    row._probing = true;
    try {
      const { data } = await probeGeoProvider<GeoProviderHealthItem>(
        row.poolName as string,
        row.provider
      );
      Object.assign(row, data);
      message("探测完成", { type: "success" });
    } catch (error) {
      console.error("探测失败", error);
      message("探测失败", { type: "error" });
    } finally {
      row._probing = false;
    }
  }

  async function onToggleEnable(row: GeoProviderHealthItem) {
    const action = row.enabled ? "禁用" : "启用";
    try {
      await ElMessageBox.confirm(
        `确认${action}地理来源 ${row.poolName}/${row.provider}?`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      const api = row.enabled ? disableGeoProvider : enableGeoProvider;
      const { data } = await api<GeoProviderHealthItem>(
        row.poolName as string,
        row.provider
      );
      Object.assign(row, data);
      message(`${action}成功`, { type: "success" });
      loadStats();
    } catch (error) {
      if (error !== "cancel") {
        console.error(`${action}失败`, error);
        message(`${action}失败`, { type: "error" });
      }
    }
  }

  async function onReset(
    row: GeoProviderHealthItem & { _resetting?: boolean }
  ) {
    try {
      await ElMessageBox.confirm(
        `确认重置 ${row.poolName}/${row.provider} 的熔断状态?`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      row._resetting = true;
      const { data } = await resetGeoProviderCircuit<GeoProviderHealthItem>(
        row.poolName as string,
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

  function selectedItems() {
    return selectedRows.value.map(row => ({
      poolName: row.poolName as string,
      provider: row.provider
    }));
  }

  async function onBatchEnable() {
    if (!selectedRows.value.length) {
      message("请先选择要启用的来源", { type: "warning" });
      return;
    }
    try {
      await batchEnableGeoProviders(selectedItems());
      message("批量启用成功", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("批量启用失败", error);
      message("批量启用失败", { type: "error" });
    }
  }

  async function onBatchDisable() {
    if (!selectedRows.value.length) {
      message("请先选择要禁用的来源", { type: "warning" });
      return;
    }
    try {
      await batchDisableGeoProviders(selectedItems());
      message("批量禁用成功", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("批量禁用失败", error);
      message("批量禁用失败", { type: "error" });
    }
  }

  async function onBatchReset() {
    if (!selectedRows.value.length) {
      message("请先选择要重置的来源", { type: "warning" });
      return;
    }
    try {
      await ElMessageBox.confirm(
        `确认批量重置 ${selectedRows.value.length} 个来源的熔断状态?`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      await batchResetGeoProviders(selectedItems());
      message("批量重置成功", { type: "success" });
      onSearch();
    } catch (error) {
      if (error !== "cancel") {
        console.error("批量重置失败", error);
        message("批量重置失败", { type: "error" });
      }
    }
  }

  function resetForm() {
    form.poolName = "";
    onSearch();
  }

  onMounted(() => {
    loadDropdown();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    statsOverview,
    dropdownOptions,
    selectedRows,
    onSearch,
    onProbe,
    onToggleEnable,
    onReset,
    onBatchEnable,
    onBatchDisable,
    onBatchReset,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    getPoolLabel
  };
}
