import dayjs from "dayjs";
import { reactive, ref, onMounted, toRaw, type Ref } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { PaginationProps } from "@pureadmin/table";
import {
  getAlertRecordPage,
  exportAlertRecord,
  resolveAlert,
  batchResolveAlerts,
  getDropdownOptions
} from "@/api/ai-provider-health";
import type {
  AlertRecordItem,
  DropdownOptions,
  AlertRecordPageReq
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

function buildRequest(form: Record<string, any>): AlertRecordPageReq {
  const payload: AlertRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };

  const stringFields = ["provider", "alertType", "alertLevel", "status"];
  stringFields.forEach(key => {
    const value = `${form[key] ?? ""}`.trim();
    if (value) payload[key] = value as never;
  });

  if (Array.isArray(form.createdTime) && form.createdTime.length === 2) {
    payload.createdTime = [form.createdTime[0], form.createdTime[1]];
  }

  return payload;
}

export function useAlertRecord(_tableRef?: Ref) {
  const form = reactive({
    provider: "",
    alertType: "",
    alertLevel: "",
    status: "",
    createdTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<AlertRecordItem[]>([]);
  const loading = ref(true);

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
          BALANCE_LOW: "余额不足预警"
        };
        return (
          <el-tag size={props.size} effect="plain">
            {labelMap[row.alertType] || row.alertType}
          </el-tag>
        );
      }
    },
    {
      label: "告警级别",
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
      const { data } = await getAlertRecordPage<AlertRecordItem>(payload);

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

  async function onResolve(row: AlertRecordItem) {
    try {
      await ElMessageBox.confirm("确认解决该告警？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      });

      const { data } = await resolveAlert<AlertRecordItem>(row.id);
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
        `确认解决当前页 ${openAlerts.length} 条未解决告警？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );

      const providers = [...new Set(openAlerts.map(item => item.provider))];
      const { data } = await batchResolveAlerts<number>(providers);
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
      delete payload.current;
      delete payload.size;

      const response: any = await exportAlertRecord(payload);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `告警记录_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`;
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
