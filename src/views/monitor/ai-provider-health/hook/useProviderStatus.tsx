import dayjs from "dayjs";
import { reactive, ref, type Ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
import {
  getProviderHealthPage,
  getStatsOverview,
  probeProvider,
  enableProvider,
  disableProvider,
  batchEnableProviders,
  batchDisableProviders,
  queryProviderBalance,
  batchQueryBalance
} from "@/api/ai-provider-health";
import type { ProviderHealthItem, StatsOverview } from "../types";

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
  if (status === "UP") return "正常";
  if (status === "WARN") return "警告";
  if (status === "DOWN") return "不可用";
  if (status === "SUSPENDED") return "已暂停";
  return status || "-";
}

function getReasonLabel(reason?: string) {
  const map: Record<string, string> = {
    OK: "正常",
    INSUFFICIENT_BALANCE: "余额不足",
    QUOTA_EXCEEDED: "配额超限",
    AUTH_FAILED: "认证失败",
    RATE_LIMIT: "频率限制",
    NETWORK_ERROR: "网络错误",
    PROVIDER_ERROR: "供应商错误",
    UNKNOWN_ERROR: "未知错误",
    BALANCE_LOW: "余额预警"
  };
  return map[reason || ""] || reason || "-";
}

function getReasonType(reason?: string) {
  if (reason === "OK") return "success";
  if (
    ["INSUFFICIENT_BALANCE", "QUOTA_EXCEEDED", "AUTH_FAILED"].includes(
      reason || ""
    )
  )
    return "danger";
  if (["RATE_LIMIT", "NETWORK_ERROR", "PROVIDER_ERROR"].includes(reason || ""))
    return "warning";
  return "info";
}

export function useProviderStatus(_tableRef?: Ref) {
  const dataList = ref<ProviderHealthItem[]>([]);
  const loading = ref(true);
  const selectedRows = ref<ProviderHealthItem[]>([]);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const statsOverview = reactive<StatsOverview>({
    totalProviders: 0,
    upCount: 0,
    warnCount: 0,
    downCount: 0,
    suspendedCount: 0,
    enabledCount: 0,
    disabledCount: 0,
    todayCheckCount: 0,
    todayFailCount: 0,
    openAlertCount: 0
  });

  const columns: TableColumnList = [
    {
      type: "selection",
      width: 55,
      align: "left"
    },
    {
      label: "供应商",
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
      label: "启用状态",
      prop: "enabled",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-tag type={row.enabled ? "success" : "info"} effect="plain">
          {row.enabled ? "已启用" : "已禁用"}
        </el-tag>
      )
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
      label: "余额",
      prop: "balanceAmount",
      minWidth: 120,
      formatter: ({ balanceAmount, balanceCurrency }) =>
        balanceAmount != null
          ? `${balanceAmount} ${balanceCurrency || ""}`
          : "-"
    },
    {
      label: "剩余配额",
      prop: "quotaRemaining",
      minWidth: 100,
      formatter: ({ quotaRemaining }) => quotaRemaining ?? "-"
    },
    {
      label: "最后检测",
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
      label: "告警状态",
      prop: "alertSent",
      minWidth: 100,
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
      width: 210,
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

  async function loadStats() {
    try {
      const { data } = await getStatsOverview<StatsOverview>();
      Object.assign(statsOverview, data);
    } catch (error) {
      console.error("加载统计概览失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const payload = {
        current: pagination.currentPage,
        size: pagination.pageSize
      };
      const { data } = await getProviderHealthPage<ProviderHealthItem>(payload);
      dataList.value = (data.records ?? []).map(item => ({
        ...item,
        _probing: false
      }));
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? 10;
      pagination.currentPage = data.current ?? 1;

      await loadStats();
    } catch (error) {
      console.error("加载供应商健康数据失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载供应商健康数据失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onProbe(row: ProviderHealthItem & { _probing?: boolean }) {
    row._probing = true;
    try {
      const { data } = await probeProvider<ProviderHealthItem>(row.provider);
      Object.assign(row, data);
      message("探测完成", { type: "success" });
    } catch (error) {
      console.error("探测失败", error);
      message("探测失败", { type: "error" });
    } finally {
      row._probing = false;
    }
  }

  async function onToggleEnable(row: ProviderHealthItem) {
    const action = row.enabled ? "禁用" : "启用";
    try {
      await ElMessageBox.confirm(
        `确认${action}供应商 ${row.provider}？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );

      const api = row.enabled ? disableProvider : enableProvider;
      const { data } = await api<ProviderHealthItem>(row.provider);
      Object.assign(row, data);
      message(`${action}成功`, { type: "success" });
    } catch (error) {
      if (error !== "cancel") {
        console.error(`${action}失败`, error);
        message(`${action}失败`, { type: "error" });
      }
    }
  }

  async function onBatchEnable() {
    if (!selectedRows.value.length) {
      message("请先选择要启用的供应商", { type: "warning" });
      return;
    }
    try {
      const providers = selectedRows.value.map(row => row.provider);
      await batchEnableProviders(providers);
      message("批量启用成功", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("批量启用失败", error);
      message("批量启用失败", { type: "error" });
    }
  }

  async function onBatchDisable() {
    if (!selectedRows.value.length) {
      message("请先选择要禁用的供应商", { type: "warning" });
      return;
    }
    try {
      const providers = selectedRows.value.map(row => row.provider);
      await batchDisableProviders(providers);
      message("批量禁用成功", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("批量禁用失败", error);
      message("批量禁用失败", { type: "error" });
    }
  }

  async function onQueryBalance(
    row: ProviderHealthItem & { _queryingBalance?: boolean }
  ) {
    row._queryingBalance = true;
    try {
      await queryProviderBalance(row.provider);
      message("余额查询完成", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("查询余额失败", error);
      message("查询余额失败", { type: "error" });
    } finally {
      row._queryingBalance = false;
    }
  }

  async function onBatchQueryBalance() {
    if (!selectedRows.value.length) {
      message("请先选择要查询余额的供应商", { type: "warning" });
      return;
    }
    try {
      const providers = selectedRows.value.map(row => row.provider);
      await batchQueryBalance(providers);
      message("批量查询余额成功", { type: "success" });
      onSearch();
    } catch (error) {
      console.error("批量查询余额失败", error);
      message("批量查询余额失败", { type: "error" });
    }
  }

  function resetForm() {
    onSearch();
  }

  return {
    loading,
    columns,
    dataList,
    pagination,
    statsOverview,
    selectedRows,
    onSearch,
    onProbe,
    onToggleEnable,
    onBatchEnable,
    onBatchDisable,
    onQueryBalance,
    onBatchQueryBalance,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
