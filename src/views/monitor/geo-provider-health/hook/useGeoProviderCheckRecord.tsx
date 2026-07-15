import dayjs from "dayjs";
import { reactive, ref, onMounted, toRaw, type Ref } from "vue";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import {
  getGeoProviderCheckRecordPage,
  exportGeoProviderCheckRecord,
  getGeoProviderDropdownOptions
} from "@/api/geo-provider-health";
import type {
  GeoProviderCheckRecordItem,
  GeoProviderDropdownOptions,
  GeoProviderCheckRecordPageReq
} from "../types";

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getStatusType(status?: string) {
  if (status === "SUCCESS") return "success";
  if (status === "FAIL") return "danger";
  if (status === "NO_RESULT") return "warning";
  return "info";
}

function getCostType(value?: number) {
  if ((value ?? 0) <= 500) return "success";
  if ((value ?? 0) <= 2000) return "warning";
  return "danger";
}

function getPoolLabel(pool?: string) {
  if (pool === "ip-location-pool") return "IP 归属地";
  if (pool === "reverse-geocode-pool") return "逆地理编码";
  if (pool === "place-search-pool") return "POI 搜索";
  return pool || "-";
}

function buildRequest(
  form: Record<string, any>
): GeoProviderCheckRecordPageReq {
  const payload: GeoProviderCheckRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };
  const stringFields = [
    "poolName",
    "provider",
    "checkType",
    "status",
    "reason"
  ];
  stringFields.forEach(key => {
    const value = `${form[key] ?? ""}`.trim();
    if (value) (payload as any)[key] = value;
  });
  if (Array.isArray(form.createdTime) && form.createdTime.length === 2) {
    payload.createdTime = [form.createdTime[0], form.createdTime[1]];
  }
  return payload;
}

export function useGeoProviderCheckRecord(_tableRef?: Ref) {
  const form = reactive({
    poolName: "",
    provider: "",
    checkType: "",
    status: "",
    reason: "",
    createdTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<GeoProviderCheckRecordItem[]>([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
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
      label: "检测类型",
      prop: "checkType",
      minWidth: 130,
      cellRenderer: ({ row, props }) => {
        const labelMap: Record<string, string> = {
          ACTIVE_PROBE: "主动探测",
          PASSIVE_SUCCESS: "被动-成功",
          PASSIVE_FAILURE: "被动-失败",
          NO_RESULT: "无结果",
          CIRCUIT_BROKEN: "熔断"
        };
        return (
          <el-tag size={props.size} effect="plain">
            {labelMap[row.checkType] || row.checkType}
          </el-tag>
        );
      }
    },
    {
      label: "结果",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const label =
          row.status === "SUCCESS"
            ? "成功"
            : row.status === "FAIL"
              ? "失败"
              : "无结果";
        return (
          <el-tag
            size={props.size}
            type={getStatusType(row.status)}
            effect="plain"
          >
            {label}
          </el-tag>
        );
      }
    },
    {
      label: "故障原因",
      prop: "reason",
      minWidth: 120,
      formatter: ({ reason }) => {
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
    },
    {
      label: "耗时",
      prop: "costTimeMs",
      minWidth: 100,
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
      label: "样例输入",
      prop: "sampleInput",
      minWidth: 180,
      formatter: ({ sampleInput }) => sampleInput || "-"
    },
    {
      label: "错误信息",
      prop: "errorMessage",
      minWidth: 240,
      formatter: ({ errorMessage }) => errorMessage || "-"
    },
    {
      label: "时间",
      prop: "createdTime",
      minWidth: 180,
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

  async function loadDropdownOptions() {
    try {
      const { data } =
        await getGeoProviderDropdownOptions<GeoProviderDropdownOptions>();
      Object.assign(dropdownOptions, data);
    } catch (error) {
      console.error("加载下拉选项失败", error);
    }
  }

  async function onSearch() {
    loading.value = true;
    try {
      const payload = buildRequest(toRaw(form));
      const { data } =
        await getGeoProviderCheckRecordPage<GeoProviderCheckRecordItem>(
          payload
        );
      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch (error) {
      console.error("加载调用流水失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载调用流水失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onExport() {
    try {
      const payload = buildRequest(toRaw(form));
      delete (payload as any).current;
      delete (payload as any).size;

      const response: any = await exportGeoProviderCheckRecord(payload);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `地理来源流水_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      message("导出成功", { type: "success" });
    } catch (error) {
      console.error("导出失败", error);
      message("导出失败", { type: "error" });
    }
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
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
    onSearch,
    onExport,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
