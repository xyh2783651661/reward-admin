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
  getContentFetchRecordOptions,
  getContentFetchRecordItems
} from "@/api/system";
import type {
  ContentFetchItemRow,
  ContentFetchRecordPageItem,
  ContentFetchRecordPageReq,
  DetailStatus,
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

type TagType = "primary" | "success" | "warning" | "info" | "danger";

interface DetailStatusMeta {
  label: string;
  type: TagType;
  /** 鼠标悬浮说明：让「为什么没明细」自解释，而不是让人以为数据丢了 */
  tip: string;
}

/**
 * 明细状态的展示口径。
 *
 * CACHE_HIT 刻意用中性的 info 而不是警告色——命中缓存是正常优化，
 * 标成告警会让运维误以为出了问题，反而制造噪音。
 */
function detailStatusMeta(status?: DetailStatus): DetailStatusMeta {
  const normalized = `${status ?? ""}`.toUpperCase();
  if (normalized === "CAPTURED") {
    return {
      label: "已抓取",
      type: "success",
      tip: "本次有真实 HTTP 请求，报文可在「原始请求」中查看"
    };
  }
  if (normalized === "CACHE_HIT") {
    return {
      label: "缓存命中",
      type: "info",
      tip: "命中 Redis 缓存，本次未发起外部请求，因此没有 HTTP 明细——属正常"
    };
  }
  if (normalized === "NO_HTTP") {
    return {
      label: "无 HTTP",
      type: "warning",
      tip: "该信源本次未发起 HTTP 请求（非 HTTP 源或直接返回）"
    };
  }
  if (normalized === "FAILED") {
    return {
      label: "明细丢失",
      type: "danger",
      tip: "父流水已保存，但明细写入失败，属可观测性丢失，需关注"
    };
  }
  return {
    label: "未知",
    type: "info",
    tip: "历史数据（明细状态字段上线前写入），无从判断"
  };
}

function formatItemTime(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
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

  /** 抓取内容抽屉 */
  const itemsVisible = ref(false);
  const itemsLoading = ref(false);
  const itemsList = ref<ContentFetchItemRow[]>([]);
  const itemsRecord = ref<ContentFetchRecordPageItem | null>(null);

  /**
   * 打开「抓到了什么」抽屉。
   * 先清空再拉取，避免网络慢时短暂显示上一条流水的条目。
   */
  async function openItems(row: ContentFetchRecordPageItem) {
    itemsRecord.value = row;
    itemsList.value = [];
    itemsVisible.value = true;
    itemsLoading.value = true;
    try {
      const { data } = await getContentFetchRecordItems<ContentFetchItemRow>(
        row.id
      );
      itemsList.value = data ?? [];
    } catch (error) {
      console.error("加载抓取内容失败", error);
      message(getErrorMessage(error, "加载抓取内容失败"), { type: "error" });
    } finally {
      itemsLoading.value = false;
    }
  }

  const itemColumns: TableColumnList = [
    { label: "#", prop: "seqNo", width: 60 },
    {
      label: "标题",
      prop: "title",
      minWidth: 280,
      showOverflowTooltip: true,
      formatter: ({ title }) => title || "-"
    },
    {
      label: "来源",
      prop: "source",
      minWidth: 120,
      formatter: ({ source }) => source || "-"
    },
    {
      label: "发布时间",
      prop: "publishTime",
      minWidth: 160,
      formatter: ({ publishTime }) => formatItemTime(publishTime)
    },
    {
      label: "生成方式",
      prop: "aiGenerated",
      width: 110,
      cellRenderer: ({ row, props }) =>
        row.aiGenerated === 1 ? (
          <el-tag size={props.size} type="warning" effect="plain">
            AI 补位
          </el-tag>
        ) : (
          <el-tag size={props.size} type="info" effect="plain">
            真实信源
          </el-tag>
        )
    },
    {
      label: "原文",
      prop: "url",
      width: 90,
      cellRenderer: ({ row }) =>
        row.url ? (
          <el-link
            type="primary"
            href={row.url}
            target="_blank"
            underline={false}
          >
            打开
          </el-link>
        ) : (
          "-"
        )
    }
  ];

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
      label: "明细状态",
      prop: "detailStatus",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const meta = detailStatusMeta(row.detailStatus);
        return (
          <el-tooltip content={meta.tip} placement="top">
            <el-tag size={props.size} type={meta.type} effect="plain">
              {meta.label}
            </el-tag>
          </el-tooltip>
        );
      }
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
    },
    {
      label: "操作",
      prop: "operation",
      fixed: "right",
      width: 120,
      cellRenderer: ({ row, props }) => (
        <el-button
          size={props.size}
          type="primary"
          link
          onClick={() => openItems(row)}
        >
          查看内容
        </el-button>
      )
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
    itemColumns,
    itemsVisible,
    itemsLoading,
    itemsList,
    itemsRecord,
    openItems,
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
