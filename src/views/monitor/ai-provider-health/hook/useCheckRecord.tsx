import dayjs from "dayjs";
import { reactive, ref, computed, onMounted, toRaw, type Ref } from "vue";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import {
  getCheckRecordPage,
  exportCheckRecord,
  getDropdownOptions
} from "@/api/ai-provider-health";
import type {
  CheckRecordItem,
  DropdownOptions,
  CheckRecordPageReq
} from "../types";

export function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getStatusType(status?: string) {
  if (status === "SUCCESS") return "success";
  if (status === "FAIL") return "danger";
  return "info";
}

function getCostType(value?: number) {
  if ((value ?? 0) <= 1000) return "success";
  if ((value ?? 0) <= 3000) return "warning";
  return "danger";
}

function getHttpStatusType(status?: number) {
  if (!status) return "info";
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500) return "warning";
  if (status >= 500) return "danger";
  return "info";
}

export const CHECK_TYPE_LABELS: Record<string, string> = {
  ACTIVE_PROBE: "主动探测",
  PASSIVE_FAILURE: "被动检测-失败",
  PASSIVE_SUCCESS: "被动检测-成功",
  BALANCE_QUERY: "余额查询"
};

export const REASON_LABELS: Record<string, string> = {
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

function buildRequest(form: Record<string, any>): CheckRecordPageReq {
  const payload: CheckRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };

  const stringFields = ["provider", "checkType", "status", "reason"];
  stringFields.forEach(key => {
    const value = `${form[key] ?? ""}`.trim();
    if (value) payload[key] = value as never;
  });

  if (Array.isArray(form.createdTime) && form.createdTime.length === 2) {
    payload.createdTime = [form.createdTime[0], form.createdTime[1]];
  }

  return payload;
}

export function useCheckRecord(_tableRef?: Ref, initialProvider?: string) {
  const form = reactive({
    provider: initialProvider || "",
    checkType: "",
    status: "",
    reason: "",
    createdTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<CheckRecordItem[]>([]);
  const loading = ref(true);

  /** 详情抽屉 */
  const drawerVisible = ref(false);
  const drawerItem = ref<CheckRecordItem | null>(null);
  const drawerIndex = computed(() =>
    drawerItem.value
      ? dataList.value.findIndex(i => i.id === drawerItem.value!.id)
      : -1
  );

  /** 更多筛选是否激活（有值） */
  const hasAdvancedFilters = computed(
    () => Boolean(form.checkType) || Boolean(form.reason)
  );

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const dropdownOptions = reactive<DropdownOptions>({
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
      label: "供应商",
      prop: "provider",
      minWidth: 110
    },
    {
      label: "检测类型",
      prop: "checkType",
      minWidth: 120,
      formatter: ({ checkType }) => CHECK_TYPE_LABELS[checkType] || checkType
    },
    {
      label: "结果",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getStatusType(row.status)}
          effect="plain"
        >
          {row.status === "SUCCESS" ? "成功" : "失败"}
        </el-tag>
      )
    },
    {
      label: "故障原因",
      prop: "reason",
      minWidth: 110,
      formatter: ({ reason }) => REASON_LABELS[reason || ""] || reason || "-"
    },
    {
      label: "HTTP",
      prop: "httpStatus",
      minWidth: 80,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getHttpStatusType(row.httpStatus)}
          effect="plain"
        >
          {row.httpStatus || "-"}
        </el-tag>
      )
    },
    {
      label: "耗时",
      prop: "costTimeMs",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getCostType(row.costTimeMs)}
          effect="plain"
        >
          {(row.costTimeMs ?? 0) + " ms"}
        </el-tag>
      )
    },
    {
      label: "错误信息",
      prop: "errorMessage",
      minWidth: 200,
      formatter: ({ errorMessage }) => errorMessage || "-"
    },
    {
      label: "检测时间",
      prop: "createdTime",
      minWidth: 165,
      formatter: ({ createdTime }) => formatTime(createdTime)
    }
  ];

  function handleSizeChange(val: number) {
    form.size = val;
    form.current = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    form.current = val;
    onSearch();
  }

  /** 行点击打开详情抽屉 */
  function openDetail(row: CheckRecordItem) {
    drawerItem.value = row;
    drawerVisible.value = true;
  }

  function navigateDetail(delta: number) {
    const next = drawerIndex.value + delta;
    if (next >= 0 && next < dataList.value.length) {
      drawerItem.value = dataList.value[next];
    }
  }

  /** 失败行高亮 */
  function rowClassName({ row }: { row: CheckRecordItem }) {
    return row.status === "FAIL" ? "check-row-fail" : "";
  }

  async function loadDropdownOptions() {
    try {
      const { data } = await getDropdownOptions<DropdownOptions>();
      Object.assign(dropdownOptions, data);
    } catch (error) {
      console.error("加载下拉选项失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const payload = buildRequest(toRaw(form));
      const { data } = await getCheckRecordPage<CheckRecordItem>(payload);

      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch (error) {
      console.error("加载检测流水失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载检测流水失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onExport() {
    try {
      const payload = buildRequest(toRaw(form));
      delete payload.current;
      delete payload.size;

      const response: any = await exportCheckRecord(payload);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `检测流水_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message("导出成功", { type: "success" });
    } catch (error) {
      console.error("导出失败", error);
      message("导出失败", { type: "error" });
    }
  }

  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    form.provider = "";
    form.checkType = "";
    form.reason = "";
    form.current = 1;
    form.size = 10;
    onSearch();
  }

  onMounted(() => {
    loadDropdownOptions();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    dropdownOptions,
    drawerVisible,
    drawerItem,
    drawerIndex,
    hasAdvancedFilters,
    openDetail,
    navigateDetail,
    rowClassName,
    onSearch,
    onExport,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
