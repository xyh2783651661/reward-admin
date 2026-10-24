import { ref, reactive, computed } from "vue";
import { useRoute } from "vue-router";
import {
  getPublishRecordPage,
  getPublishRecordDetail
} from "@/api/publish-record";
import type { PublishRecord } from "@/api/publish-record";
import type { PublishPlatform } from "@/api/publish-package";
import { getPublishPlatformList as fetchPlatforms } from "@/api/publish-package";
import type { PaginationProps, TableColumns } from "@pureadmin/table";
import type { SearchField } from "@/components/ReSearchBar/types";

/** 结果中文标签 */
export const RECORD_STATUS_LABELS: Record<string, string> = {
  success: "成功",
  failed: "失败"
};

/** 记录来源中文标签 */
export const RECORD_SOURCE_LABELS: Record<string, string> = {
  api: "实时回写",
  replay: "事后补报"
};

/** 状态 → Tag 类型 */
export function getRecordStatusType(status?: string) {
  return status === "success" ? "success" : "danger";
}

/** 时间格式化：后端 LocalDateTime 序列化为 ISO 字符串 */
function formatDateTime(v?: string | null) {
  if (!v) return "-";
  return String(v)
    .replace("T", " ")
    .replace(/\.\d+$/, "")
    .slice(0, 19);
}

/** 毫秒转人类可读：超过 1 分钟用分钟，否则用秒 */
export function formatDuration(ms?: number | null) {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s`;
}

export function usePublishRecord() {
  // ========== 列表 ==========
  const loading = ref(false);
  const dataList = ref<PublishRecord[]>([]);
  const platforms = ref<PublishPlatform[]>([]);

  const form = reactive({
    dateRange: [] as string[],
    platformCode: "",
    status: "",
    errorType: "",
    packageId: undefined as number | undefined,
    current: 1,
    size: 10
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  // ========== 详情抽屉 ==========
  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const detail = ref<PublishRecord | null>(null);

  const route = useRoute();

  async function loadPlatforms() {
    try {
      const { data } = await fetchPlatforms(true);
      platforms.value = data ?? [];
    } catch {
      platforms.value = [];
    }
  }

  /**
   * 套用 URL 带入的过滤条件。
   *
   * 来源是从内容包详情页点的「查看历史」——那里看到的是最后一次结果快照，
   * 想追问「之前失败过几次」就得带着包与平台跳过来，否则要在这边重新筛选一遍。
   */
  function applyRouteQuery() {
    const q = route.query;
    const packageId = Number(q.packageId);
    if (Number.isFinite(packageId) && packageId > 0) {
      form.packageId = packageId;
    }
    if (typeof q.platformCode === "string" && q.platformCode) {
      form.platformCode = q.platformCode;
    }
  }

  /**
   * 组装查询参数。
   *
   * 日期区间用 daterange 控件拿到的是 [start, end] 数组，
   * 而后端要的是平铺的 startDate / endDate 两个独立参数，在这里拆开。
   */
  function buildParams() {
    const [startDate, endDate] = form.dateRange ?? [];
    const params: Record<string, unknown> = {
      current: form.current,
      size: form.size
    };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (form.platformCode) params.platformCode = form.platformCode;
    if (form.status) params.status = form.status;
    if (form.errorType) params.errorType = form.errorType;
    if (form.packageId) params.packageId = form.packageId;
    return params;
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getPublishRecordPage(buildParams());
      dataList.value = data?.records ?? [];
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? form.size;
      pagination.currentPage = data?.current ?? form.current;
    } catch {
      dataList.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  async function refreshAll() {
    await onSearch();
  }

  function handleSearch() {
    form.current = 1;
    refreshAll();
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    // packageId 只来自 URL、没有对应的搜索项，resetFields 清不掉，需手动清除
    form.packageId = undefined;
    form.current = 1;
    form.size = 10;
    refreshAll();
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

  async function openDetail(id: number) {
    detailVisible.value = true;
    detailLoading.value = true;
    detail.value = null;
    try {
      const { data } = await getPublishRecordDetail(id);
      detail.value = data ?? null;
    } catch {
      detail.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  /**
   * 失败归类下拉选项。
   *
   * 取值需与后端 PublishErrorType 的 code 逐个对齐，否则筛出来永远是空列表。
   */
  const ERROR_TYPE_OPTIONS = [
    { label: "账号/登录态", value: "account" },
    { label: "执行超时", value: "timeout" },
    { label: "发布命令失败", value: "cli" },
    { label: "图片下载失败", value: "download" },
    { label: "接口异常", value: "api" },
    { label: "签名鉴权失败", value: "auth" },
    { label: "程序异常", value: "exception" },
    { label: "未归类", value: "unknown" }
  ];

  const searchFields = computed<SearchField[]>(() => [
    { prop: "dateRange", label: "业务日期", type: "daterange", width: "lg" },
    {
      prop: "platformCode",
      label: "平台",
      type: "select",
      options: platforms.value.map(p => ({ label: p.name, value: p.code }))
    },
    {
      prop: "status",
      label: "结果",
      type: "select",
      options: Object.entries(RECORD_STATUS_LABELS).map(([value, label]) => ({
        label,
        value
      }))
    },
    {
      prop: "errorType",
      label: "失败归类",
      type: "select",
      options: ERROR_TYPE_OPTIONS
    }
  ]);

  const columns = computed<TableColumns[]>(() => [
    { label: "业务日期", prop: "bizDate", minWidth: 110 },
    {
      label: "内容包",
      prop: "packageTitle",
      minWidth: 140,
      cellRenderer: ({ row }) => (
        <span>{row.packageTitle || `包 ${row.packageId ?? "-"}`}</span>
      )
    },
    {
      label: "平台",
      prop: "platformName",
      minWidth: 120,
      cellRenderer: ({ row }) => (
        <span>{row.platformName || row.platformCode}</span>
      )
    },
    {
      label: "结果",
      prop: "status",
      minWidth: 110,
      cellRenderer: ({ row, props }) => (
        <div class="flex items-center justify-center gap-1">
          <el-tag
            size={props.size}
            type={getRecordStatusType(row.status)}
            effect="plain"
          >
            {RECORD_STATUS_LABELS[row.status] || row.status}
          </el-tag>
          {row.attemptNo > 1 ? (
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              第{row.attemptNo}次
            </span>
          ) : null}
        </div>
      )
    },
    {
      label: "失败归类",
      prop: "errorType",
      minWidth: 120,
      cellRenderer: ({ row }) =>
        row.status === "success" ? (
          <span>-</span>
        ) : (
          <span>{row.errorTypeLabel || "-"}</span>
        )
    },
    {
      label: "原因摘要",
      prop: "message",
      minWidth: 260,
      cellRenderer: ({ row }) => {
        if (row.status === "success") return <span>-</span>;
        const first = (row.message || "").trim().split("\n")[0];
        return (
          <span class="text-[var(--el-color-danger)]">
            {first ? first.slice(0, 80) : "（无原因信息）"}
          </span>
        );
      }
    },
    {
      label: "耗时",
      prop: "durationMs",
      minWidth: 90,
      cellRenderer: ({ row }) => <span>{formatDuration(row.durationMs)}</span>
    },
    {
      label: "来源",
      prop: "source",
      minWidth: 110,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.source === "replay" ? "warning" : "info"}
          effect="plain"
        >
          {RECORD_SOURCE_LABELS[row.source || "api"] || row.source || "api"}
        </el-tag>
      )
    },
    {
      label: "执行机器",
      prop: "clientHost",
      minWidth: 130,
      cellRenderer: ({ row }) => (
        <span class="text-xs">
          {row.clientHost || "-"}
          {row.clientVersion ? ` / v${row.clientVersion}` : ""}
        </span>
      )
    },
    {
      label: "发布时间",
      prop: "finishedAt",
      minWidth: 165,
      cellRenderer: ({ row }) => (
        <span>{formatDateTime(row.finishedAt || row.createdTime)}</span>
      )
    },
    {
      label: "操作",
      fixed: "right",
      width: 110,
      cellRenderer: ({ row }) => (
        <el-button link type="primary" onClick={() => openDetail(row.id)}>
          详情
        </el-button>
      )
    }
  ]);

  return {
    loading,
    dataList,
    columns,
    searchFields,
    form,
    pagination,
    detail,
    detailVisible,
    detailLoading,
    loadPlatforms,
    applyRouteQuery,
    onSearch,
    refreshAll,
    handleSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    openDetail,
    formatDateTime,
    formatDuration
  };
}
