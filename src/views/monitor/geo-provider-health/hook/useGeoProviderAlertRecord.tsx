import dayjs from "dayjs";
import { reactive, ref, onMounted, toRaw, type Ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
import {
  getGeoProviderAlertRecordPage,
  exportGeoProviderAlertRecord,
  resolveGeoProviderAlert,
  batchResolveGeoProviderAlerts,
  getGeoProviderDropdownOptions
} from "@/api/geo-provider-health";
import type {
  GeoProviderAlertRecordItem,
  GeoProviderDropdownOptions,
  GeoProviderAlertRecordPageReq
} from "../types";

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getAlertLevelType(level?: string) {
  if (level === "INFO") return "info";
  if (level === "WARN") return "warning";
  if (level === "ERROR") return "danger";
  if (level === "CRITICAL") return "danger";
  return "info";
}

function getAlertStatusType(status?: string) {
  if (status === "OPEN") return "danger";
  if (status === "RESOLVED") return "success";
  return "info";
}

function getPoolLabel(pool?: string) {
  if (pool === "ip-location-pool") return "IP 归属地";
  if (pool === "reverse-geocode-pool") return "逆地理编码";
  if (pool === "place-search-pool") return "POI 搜索";
  return pool || "-";
}

function buildRequest(
  form: Record<string, any>
): GeoProviderAlertRecordPageReq {
  const payload: GeoProviderAlertRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };
  const stringFields = [
    "poolName",
    "provider",
    "alertType",
    "alertLevel",
    "status"
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

export function useGeoProviderAlertRecord(_tableRef?: Ref) {
  const form = reactive({
    poolName: "",
    provider: "",
    alertType: "",
    alertLevel: "",
    status: "",
    createdTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<GeoProviderAlertRecordItem[]>([]);
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
      label: "告警类型",
      prop: "alertType",
      minWidth: 150,
      cellRenderer: ({ row, props }) => {
        const labelMap: Record<string, string> = {
          PROVIDER_UNAVAILABLE: "供应商不可用",
          PROVIDER_RECOVERED: "供应商已恢复",
          ALL_PROVIDERS_DOWN: "所有供应商不可用",
          QUOTA_EXCEEDED: "配额超限"
        };
        return (
          <el-tag size={props.size} effect="plain">
            {labelMap[row.alertType] || row.alertType}
          </el-tag>
        );
      }
    },
    {
      label: "级别",
      prop: "alertLevel",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getAlertLevelType(row.alertLevel)}
          effect="plain"
        >
          {row.alertLevel}
        </el-tag>
      )
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getAlertStatusType(row.status)}
          effect="plain"
        >
          {row.status === "OPEN" ? "未解决" : "已解决"}
        </el-tag>
      )
    },
    {
      label: "标题",
      prop: "title",
      minWidth: 200
    },
    {
      label: "内容",
      prop: "content",
      minWidth: 260,
      formatter: ({ content }) => content || "-"
    },
    {
      label: "发送次数",
      prop: "sentCount",
      minWidth: 100
    },
    {
      label: "首次告警",
      prop: "firstSentTime",
      minWidth: 180,
      formatter: ({ firstSentTime }) => formatTime(firstSentTime)
    },
    {
      label: "最后告警",
      prop: "lastSentTime",
      minWidth: 180,
      formatter: ({ lastSentTime }) => formatTime(lastSentTime)
    },
    {
      label: "解决时间",
      prop: "resolvedTime",
      minWidth: 180,
      formatter: ({ resolvedTime }) => formatTime(resolvedTime)
    },
    {
      label: "操作",
      fixed: "right",
      width: 120,
      slot: "operation"
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
        await getGeoProviderAlertRecordPage<GeoProviderAlertRecordItem>(
          payload
        );
      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch (error) {
      console.error("加载告警记录失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载告警记录失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onResolve(row: GeoProviderAlertRecordItem) {
    try {
      const { value: resolvedReason } = await ElMessageBox.prompt(
        "请输入解决原因（可为空）",
        "解决告警",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          inputPlaceholder: "解决备注",
          inputValidator: () => true
        }
      );
      const { data } =
        await resolveGeoProviderAlert<GeoProviderAlertRecordItem>(
          row.id,
          resolvedReason || undefined
        );
      Object.assign(row, data);
      message("告警已解决", { type: "success" });
    } catch (error) {
      if (error !== "cancel") {
        console.error("解决告警失败", error);
        message("解决告警失败", { type: "error" });
      }
    }
  }

  async function onBatchResolve() {
    try {
      const openAlerts = dataList.value.filter(item => item.status === "OPEN");
      if (!openAlerts.length) {
        message("没有未解决的告警", { type: "warning" });
        return;
      }
      await ElMessageBox.confirm(
        `确认解决当前 ${openAlerts.length} 条未解决告警?`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      // 去重 (poolName, provider) 组合
      const seen = new Set<string>();
      const items = openAlerts
        .map(a => ({
          poolName: a.poolName as string,
          provider: a.provider
        }))
        .filter(it => {
          const k = it.poolName + "|" + it.provider;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      const { data } = await batchResolveGeoProviderAlerts<number>(items);
      message(`成功解决 ${data} 条告警`, { type: "success" });
      onSearch();
    } catch (error) {
      if (error !== "cancel") {
        console.error("批量解决告警失败", error);
        message("批量解决告警失败", { type: "error" });
      }
    }
  }

  async function onExport() {
    try {
      const payload = buildRequest(toRaw(form));
      delete (payload as any).current;
      delete (payload as any).size;

      const response: any = await exportGeoProviderAlertRecord(payload);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `地理来源告警_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
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
    onResolve,
    onBatchResolve,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
