import { getErrorMessage } from "@/utils/error";
import dayjs from "dayjs";
import { reactive, ref, toRaw, onMounted, computed } from "vue";
import { message } from "@/utils/message";
import type { PaginationProps } from "@pureadmin/table";
import type { SearchField } from "@/components/ReSearchBar/types";
import { useDownload } from "@/hooks/useDownload";
import {
  getContentFetchRecordPage,
  exportContentFetchRecords,
  getContentFetchRecordOptions
} from "@/api/system";
import type {
  ContentFetchRecordPageItem,
  ContentFetchRecordPageReq,
  FetchStatus
} from "./types";

function formatTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

/**
 * 三态配色：EMPTY 用 info 而非 warning——信源正常只是当日无内容，
 * 标成警示色会让运维对「无数据」过度紧张。
 */
function getStatusType(status?: FetchStatus) {
  const normalized = `${status ?? ""}`.toUpperCase();
  if (normalized === "SUCCESS") return "success";
  if (normalized === "FAILED") return "danger";
  if (normalized === "EMPTY") return "info";
  return "primary";
}

function getCostType(value?: number) {
  if ((value ?? 0) <= 1000) return "success";
  if ((value ?? 0) <= 5000) return "warning";
  return "danger";
}

function buildRequest(form: Record<string, any>): ContentFetchRecordPageReq {
  const payload: ContentFetchRecordPageReq = {
    current: Number(form.current || 1),
    size: Number(form.size || 10)
  };

  const mappings: Array<
    keyof Omit<ContentFetchRecordPageReq, "current" | "size">
  > = ["sourceKey", "contentType", "status", "bizDate", "traceId"];

  mappings.forEach(key => {
    const value = `${form[key] ?? ""}`.trim();
    if (value) payload[key] = value as never;
  });

  if (Array.isArray(form.requestTime) && form.requestTime.length === 2) {
    payload.requestTime = [form.requestTime[0], form.requestTime[1]];
  }

  return payload;
}

export function useContentFetchRecord() {
  const form = reactive({
    sourceKey: "",
    contentType: "",
    status: "",
    bizDate: "",
    traceId: "",
    requestTime: [] as string[],
    current: 1,
    size: 10
  });

  const dataList = ref<ContentFetchRecordPageItem[]>([]);
  const loading = ref(true);
  const { loading: exportLoading, runExport } = useDownload();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const statusOptions = ref<Array<{ value: any; label: string }>>([]);
  const sourceKeyOptions = ref<Array<{ value: any; label: string }>>([]);

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "业务日期",
      prop: "bizDate",
      minWidth: 120,
      formatter: ({ bizDate }) => bizDate || "-"
    },
    {
      label: "信源",
      prop: "sourceKey",
      minWidth: 160
    },
    {
      label: "内容分类",
      prop: "contentType",
      minWidth: 120,
      formatter: ({ contentType }) => contentType || "-"
    },
    {
      label: "抓取结果",
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
      label: "条目数",
      prop: "itemCount",
      minWidth: 100,
      formatter: ({ itemCount }) => (itemCount != null ? `${itemCount}` : "-")
    },
    {
      label: "耗时",
      prop: "costTimeMs",
      minWidth: 110,
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
      minWidth: 240,
      formatter: ({ errorMessage }) => errorMessage || "-"
    },
    {
      label: "异常类",
      prop: "exceptionClass",
      minWidth: 240,
      formatter: ({ exceptionClass }) => exceptionClass || "-"
    },
    {
      label: "TraceId",
      prop: "traceId",
      minWidth: 180,
      formatter: ({ traceId }) => traceId || "-"
    },
    {
      label: "抓取时间",
      prop: "createdTime",
      minWidth: 180,
      formatter: ({ createdTime }) => formatTime(createdTime)
    }
  ];

  /**
   * 导出当前筛选条件下的抓取流水。
   *
   * 复用 buildRequest 后删掉分页参数：后端按「筛选条件 + 行数上限」导出，
   * 带上 current/size 只会导出当前这一页。
   */
  function exportExcel() {
    const payload = buildRequest(toRaw(form));
    delete payload.current;
    delete payload.size;
    return runExport(
      () => exportContentFetchRecords(payload),
      () => `内容源抓取流水_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`
    );
  }

  function handleSizeChange(val: number) {
    form.size = val;
    form.current = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    form.current = val;
    onSearch();
  }

  async function onSearch() {
    loading.value = true;

    try {
      const payload = buildRequest(toRaw(form));
      const { data } =
        await getContentFetchRecordPage<ContentFetchRecordPageItem>(payload);

      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch (error) {
      console.error("加载内容源抓取流水失败", error);
      dataList.value = [];
      pagination.total = 0;
      message("加载内容源抓取流水失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    form.size = 10;
    onSearch();
  }

  async function loadOptions() {
    try {
      const { data } = await getContentFetchRecordOptions();
      statusOptions.value = data?.statusOptions ?? [];
      sourceKeyOptions.value = data?.sourceKeyOptions ?? [];
    } catch (e) {
      message(getErrorMessage(e, "加载筛选选项失败"), { type: "error" });
    }
  }

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "sourceKey",
      label: "信源",
      type: "select",
      options: sourceKeyOptions.value,
      filterable: true
    },
    {
      prop: "contentType",
      label: "内容分类",
      type: "input",
      placeholder: "如 NEWS / TECHNOLOGY",
      width: "md"
    },
    {
      prop: "status",
      label: "抓取结果",
      type: "select",
      options: statusOptions.value,
      filterable: true,
      width: "sm"
    },
    {
      prop: "bizDate",
      label: "业务日期",
      type: "date",
      valueFormat: "YYYY-MM-DD",
      width: "md"
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
      label: "抓取时间",
      type: "datetimerange",
      shortcuts: true,
      valueFormat: "YYYY-MM-DD HH:mm:ss"
    }
  ]);

  onMounted(() => {
    loadOptions();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    statusOptions,
    sourceKeyOptions,
    searchFields,
    onSearch,
    resetForm,
    exportExcel,
    exportLoading,
    handleSizeChange,
    handleCurrentChange
  };
}
