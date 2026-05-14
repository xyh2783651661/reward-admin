import dayjs from "dayjs";
import { reactive, ref, toRaw, type Ref } from "vue";
import { addDialog } from "@/components/ReDialog";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import { getAiCallRecordDetail, getAiCallRecordPage } from "@/api/system";
import Detail from "./detail.vue";
import type {
  AiCallRecordDetail,
  AiCallRecordPageItem,
  AiCallRecordPageReq,
  AiCallRecordStatus
} from "./types";

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getStatusType(status?: AiCallRecordStatus) {
  const normalized = `${status ?? ""}`.toUpperCase();

  if (normalized === "SUCCESS") return "success";
  if (["FAILED", "ERROR"].includes(normalized)) return "danger";
  if (["RUNNING", "PROCESSING"].includes(normalized)) return "warning";
  if (["PENDING", "WAITING", "INIT"].includes(normalized)) return "info";
  return "primary";
}

function getCostType(value?: number) {
  if ((value ?? 0) <= 1000) return "success";
  if ((value ?? 0) <= 3000) return "warning";
  return "danger";
}

function buildRequest(form: Record<string, any>): AiCallRecordPageReq {
  const payload: AiCallRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };

  const mappings: Array<keyof Omit<AiCallRecordPageReq, "current" | "size">> = [
    "bizType",
    "bizId",
    "model",
    "templateName",
    "status",
    "operator",
    "traceId"
  ];

  mappings.forEach(key => {
    const value = `${form[key] ?? ""}`.trim();
    if (value) payload[key] = value as never;
  });

  const idValue = `${form.id ?? ""}`.trim();
  if (idValue) payload.id = Number(idValue);

  if (Array.isArray(form.requestTime) && form.requestTime.length === 2) {
    payload.requestTime = [form.requestTime[0], form.requestTime[1]];
  }

  return payload;
}

export function useAiCallRecord(_tableRef?: Ref) {
  const form = reactive({
    id: "",
    bizType: "",
    bizId: "",
    model: "",
    templateName: "",
    status: "",
    operator: "",
    traceId: "",
    requestTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<AiCallRecordPageItem[]>([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const statusOptions = [
    "SUCCESS",
    "FAILED",
    "ERROR",
    "RUNNING",
    "PROCESSING",
    "PENDING"
  ];

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "业务类型",
      prop: "bizType",
      minWidth: 160
    },
    {
      label: "业务ID",
      prop: "bizId",
      minWidth: 160
    },
    {
      label: "调用模型",
      prop: "model",
      minWidth: 140
    },
    {
      label: "模板名称",
      prop: "templateName",
      minWidth: 200
    },
    {
      label: "调用状态",
      prop: "status",
      minWidth: 120,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getStatusType(row.status)}
          effect="plain"
        >
          {row.status || "-"}
        </el-tag>
      )
    },
    {
      label: "操作人",
      prop: "operator",
      minWidth: 120
    },
    {
      label: "TraceId",
      prop: "traceId",
      minWidth: 180
    },
    {
      label: "调用耗时",
      prop: "costTimeMs",
      minWidth: 120,
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
      label: "Prompt Tokens",
      prop: "promptTokens",
      minWidth: 120
    },
    {
      label: "Response Tokens",
      prop: "responseTokens",
      minWidth: 130
    },
    {
      label: "Prompt 预览",
      prop: "promptPreview",
      minWidth: 260,
      formatter: ({ promptPreview }) => promptPreview || "-"
    },
    {
      label: "Response 预览",
      prop: "responsePreview",
      minWidth: 260,
      formatter: ({ responsePreview }) => responsePreview || "-"
    },
    {
      label: "错误信息",
      prop: "errorMessage",
      minWidth: 220,
      formatter: ({ errorMessage }) => errorMessage || "-"
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 180,
      formatter: ({ createdTime }) => formatTime(createdTime)
    },
    {
      label: "操作",
      fixed: "right",
      width: 100,
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

  async function onDetail(row: AiCallRecordPageItem) {
    try {
      const { data } = await getAiCallRecordDetail<AiCallRecordDetail>(row.id);

      addDialog({
        title: `AI 调用详情${row.bizType ? ` - ${row.bizType}` : ""}`,
        fullscreen: true,
        hideFooter: true,
        contentRenderer: () => Detail,
        props: {
          record: data
        }
      });
    } catch (error) {
      console.error("加载 AI 调用详情失败", error);
      message("加载 AI 调用详情失败", { type: "error" });
    }
  }

  async function onSearch() {
    loading.value = true;

    try {
      const payload = buildRequest(toRaw(form));
      const { data } = await getAiCallRecordPage<AiCallRecordPageItem>(payload);

      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch (error) {
      console.error("加载 AI 调用记录失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载 AI 调用记录失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    form.size = 10;
    onSearch();
  }

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    statusOptions,
    onSearch,
    onDetail,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
