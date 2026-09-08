import dayjs from "dayjs";
import { reactive, ref, toRaw, type Ref, onMounted, computed } from "vue";
import { addDialog } from "@/components/ReDialog";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  getAiCallRecordDetail,
  getAiCallRecordPage,
  getAiCallRecordOptions
} from "@/api/system";
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

  const statusOptions = ref<Array<{ value: any; label: string }>>([]);

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
      label: "总 Tokens",
      prop: "totalTokens",
      minWidth: 110,
      formatter: ({ totalTokens }) =>
        totalTokens != null ? `${totalTokens}` : "-"
    },
    {
      label: "实际模型",
      prop: "remoteModel",
      minWidth: 160,
      formatter: ({ remoteModel }) => remoteModel || "-"
    },
    {
      label: "结束原因",
      prop: "finishReason",
      minWidth: 130,
      formatter: ({ finishReason }) => finishReason || "-"
    },
    {
      label: "重试次数",
      prop: "retryCount",
      minWidth: 100,
      formatter: ({ retryCount }) =>
        retryCount != null ? `${retryCount}` : "-"
    },
    {
      label: "调用模式",
      prop: "streamMode",
      minWidth: 110,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.streamMode === 1 ? "warning" : "info"}
          effect="plain"
        >
          {row.streamMode === 1 ? "流式" : "同步"}
        </el-tag>
      )
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

  async function loadStatusOptions() {
    try {
      const { data } = await getAiCallRecordOptions();
      statusOptions.value = data?.statusOptions ?? [];
    } catch (e) {
      console.error(e);
    }
  }

  // 搜索区字段配置：9 项筛选项（含 datetimerange）
  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "id",
      label: "记录ID",
      type: "input",
      placeholder: "请输入记录ID",
      width: "sm"
    },
    {
      prop: "bizType",
      label: "业务类型",
      type: "input",
      placeholder: "请输入业务类型"
    },
    {
      prop: "bizId",
      label: "业务ID",
      type: "input",
      placeholder: "请输入业务ID"
    },
    {
      prop: "model",
      label: "调用模型",
      type: "input",
      placeholder: "请输入调用模型"
    },
    {
      prop: "templateName",
      label: "模板名称",
      type: "input",
      placeholder: "请输入模板名称",
      width: "lg"
    },
    {
      prop: "status",
      label: "状态",
      type: "select",
      options: statusOptions.value,
      filterable: true,
      allowCreate: true,
      width: "sm"
    },
    {
      prop: "operator",
      label: "操作人",
      type: "input",
      placeholder: "请输入操作人",
      width: "sm"
    },
    {
      prop: "traceId",
      label: "TraceId",
      type: "input",
      placeholder: "请输入 TraceId",
      width: "lg"
    },
    {
      prop: "requestTime",
      label: "请求时间",
      type: "datetimerange",
      shortcuts: true,
      valueFormat: "YYYY-MM-DD HH:mm:ss"
    }
  ]);

  onMounted(() => {
    loadStatusOptions();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    statusOptions,
    searchFields,
    onSearch,
    onDetail,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
