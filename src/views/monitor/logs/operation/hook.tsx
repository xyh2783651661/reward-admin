import dayjs from "dayjs";
import {
  getOperationLogsList,
  exportOperationLogs,
  getTaskLogsFilterOptions,
  getTaskLogDetail,
  getTaskLogStats
} from "@/api/system";
import type { TaskLogListItem, TaskLogPageReq, TaskLogStats } from "@/api/logs";
import { useDownload } from "@/hooks/useDownload";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw, computed } from "vue";
import type { SearchField } from "@/components/ReSearchBar/types";
import { addDialog } from "@/components/ReDialog/index";
import Detail from "@/views/monitor/logs/operation/detail.vue";
import { message } from "@/utils/message";
import {
  getTaskLogStatusMeta,
  getTaskLogTriggerMeta,
  TASK_LOG_STATUS_OPTIONS,
  TASK_LOG_TRIGGER_OPTIONS
} from "./status";
import { formatMs } from "./format";

const EMPTY = <span class="log-empty">-</span>;

/** 任务名 + 记录 ID + 稳定任务码：任务码用于跨环境 / 跨版本定位同一个任务定义 */
function renderTask(row: TaskLogListItem) {
  return (
    <div class="log-task">
      <span class="log-task__name" title={row.taskName}>
        {row.taskName || "-"}
      </span>
      <span class="log-task__sub">
        <span class="log-task__id">#{row.id}</span>
        {row.taskCode ? (
          <span class="log-task__code" title={row.taskCode}>
            {row.taskCode}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** 状态 + 触发方式合并为一列：部分成功 / 超时 / 未获锁等不再折叠成「失败」 */
function renderStatus(row: TaskLogListItem) {
  const meta = getTaskLogStatusMeta(row.status, row.success);
  const trigger = row.triggerType
    ? getTaskLogTriggerMeta(row.triggerType)
    : null;
  return (
    <div class="log-status-cell">
      <el-tooltip content={meta.description} placement="top">
        <span class={["log-status", `is-${meta.tone}`]}>
          <i />
          {meta.label}
        </span>
      </el-tooltip>
      {trigger ? (
        <span class="log-status-cell__trigger" title={trigger.description}>
          {trigger.label}
        </span>
      ) : null}
    </div>
  );
}

/** 业务结果：成功 / 总数 + 进度条，失败、跳过单独标色 */
function renderCounts(row: TaskLogListItem) {
  if (row.totalCount == null) return EMPTY;
  const total = row.totalCount;
  const success = row.successCount ?? 0;
  const failed = row.failedCount ?? 0;
  const skipped = row.skippedCount ?? 0;
  const percent =
    total > 0 ? Math.min(Math.round((success / total) * 100), 100) : 0;
  return (
    <div class="log-counts">
      <div class="log-counts__line">
        <b>{success}</b>
        <span>/ {total}</span>
        <em>{percent}%</em>
      </div>
      <div class="log-bar">
        <span
          class={failed > 0 ? "is-warning" : "is-success"}
          style={{ width: `${percent}%` }}
        />
      </div>
      {failed > 0 || skipped > 0 ? (
        <span class="log-counts__sub">
          {failed > 0 ? <em class="is-danger">失败 {failed}</em> : null}
          {skipped > 0 ? <em>跳过 {skipped}</em> : null}
        </span>
      ) : null}
    </div>
  );
}

/** 步骤统计：失败步骤数直接暴露，避免只看到「有步骤」 */
function renderSteps(row: TaskLogListItem) {
  const hasStepInfo = (row.stepCount ?? 0) > 0 || row.hasSteps;
  if (!hasStepInfo) return EMPTY;
  return (
    <div class="log-steps">
      <span>
        {row.stepCount ? `${row.stepCount} 步` : "有步骤"}
        {row.failedStepCount ? (
          <em class="is-danger">失败 {row.failedStepCount}</em>
        ) : null}
      </span>
      {row.slowestStep ? (
        <span class="log-steps__slowest" title={row.slowestStep}>
          最慢 {row.slowestStep}
          {row.slowestStepTime != null
            ? ` · ${formatMs(row.slowestStepTime)}`
            : ""}
        </span>
      ) : null}
    </div>
  );
}

/** 开始 / 结束时间合并：同一天只显示结束的时分秒 */
function renderTime(row: TaskLogListItem) {
  if (!row.startTime) return EMPTY;
  const start = dayjs(row.startTime);
  const end = row.endTime ? dayjs(row.endTime) : null;
  let endText = "-";
  if (end) {
    endText = end.isSame(start, "day")
      ? end.format("HH:mm:ss")
      : end.format("MM-DD HH:mm:ss");
  }
  return (
    <div class="log-time">
      <span>{start.format("YYYY-MM-DD HH:mm:ss")}</span>
      <span class="log-time__end">至 {endText}</span>
    </div>
  );
}

/** 执行节点：多实例部署时必须能看出是哪台机器跑的 */
function renderNode(row: TaskLogListItem) {
  if (!row.serverHost && !row.serverIp) return EMPTY;
  return (
    <div class="log-node">
      <span class="log-node__host" title={row.serverHost ?? undefined}>
        {row.serverHost || "-"}
      </span>
      <span class="log-node__sub">
        {[row.serverIp, row.environment].filter(Boolean).join(" · ") || "-"}
      </span>
    </div>
  );
}

export function useOperationLog(_tableRef?: Ref) {
  const form = reactive<TaskLogPageReq>({
    taskName: "",
    classMethod: "",
    status: "",
    triggerType: "",
    timeRange: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref<TaskLogListItem[]>([]);
  const loading = ref(true);
  const optionsLoading = ref(false);
  const stats = ref<TaskLogStats | null>(null);
  const statsLoading = ref(false);
  const { loading: exportLoading, runExport } = useDownload();

  const filterOptions = ref({
    taskNames: [] as string[],
    classMethods: [] as string[]
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  /** 当前页最大耗时，用于耗时列的相对长度条 */
  const maxCost = computed(() =>
    Math.max(1, ...dataList.value.map(row => row.timeCost ?? 0))
  );

  /** 耗时 + 相对长度条：一眼看出当前页里谁最慢 */
  function renderCost(row: TaskLogListItem) {
    if (row.timeCost == null) return EMPTY;
    const cost = row.timeCost;
    const level = cost < 5000 ? "fast" : cost < 30000 ? "normal" : "slow";
    const percent = Math.max(Math.round((cost / maxCost.value) * 100), 3);
    return (
      <div class="log-cost">
        <span class={["log-cost__text", `is-${level}`]}>{formatMs(cost)}</span>
        <div class="log-bar">
          <span class={`is-${level}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  const columns: TableColumnList = [
    {
      label: "任务",
      prop: "taskName",
      minWidth: 220,
      align: "left",
      cellRenderer: ({ row }) => renderTask(row)
    },
    {
      label: "状态 / 触发",
      prop: "status",
      minWidth: 120,
      align: "left",
      cellRenderer: ({ row }) => renderStatus(row)
    },
    {
      label: "业务结果",
      prop: "totalCount",
      minWidth: 140,
      align: "left",
      cellRenderer: ({ row }) => renderCounts(row)
    },
    {
      label: "步骤",
      prop: "stepCount",
      minWidth: 160,
      align: "left",
      cellRenderer: ({ row }) => renderSteps(row)
    },
    {
      label: "耗时",
      prop: "timeCost",
      minWidth: 120,
      align: "left",
      cellRenderer: ({ row }) => renderCost(row)
    },
    {
      label: "执行时间",
      prop: "startTime",
      minWidth: 190,
      align: "left",
      cellRenderer: ({ row }) => renderTime(row)
    },
    {
      label: "执行节点",
      prop: "serverHost",
      minWidth: 170,
      align: "left",
      cellRenderer: ({ row }) => renderNode(row)
    },
    {
      label: "调用方法",
      prop: "classMethod",
      minWidth: 260,
      align: "left",
      hide: true
    },
    {
      label: "操作",
      fixed: "right",
      width: 110,
      slot: "operation"
    }
  ];

  async function onDetail(row: TaskLogListItem) {
    try {
      const { data } = await getTaskLogDetail(row.id);
      const statusMeta = getTaskLogStatusMeta(data.status, data.success);
      addDialog({
        title: `任务执行详情 · ${statusMeta.label}`,
        fullscreen: true,
        hideFooter: true,
        contentRenderer: () => Detail,
        props: {
          detail: data
        }
      });
    } catch {
      message("加载详情失败", { type: "error" });
    }
  }

  /**
   * 导出当前筛选条件下的任务日志。
   *
   * 去掉分页参数：后端按「筛选条件 + 行数上限」导出，
   * 带上 current/size 只会导出当前这一页。
   */
  function exportExcel() {
    const payload = { ...toRaw(form) };
    delete payload.current;
    delete payload.size;
    return runExport(
      () => exportOperationLogs(payload),
      () => `任务日志_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.xlsx`
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
      const payload = { ...toRaw(form) };
      // 空串没有筛选语义，去掉后请求体更干净，也避免后端把 "" 当成有效条件
      if (!payload.status) delete payload.status;
      if (!payload.triggerType) delete payload.triggerType;
      const { data } = await getOperationLogsList(payload);
      dataList.value = (data.records ?? []) as TaskLogListItem[];
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } catch {
      dataList.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function loadFilterOptions() {
    optionsLoading.value = true;
    try {
      const { data } = await getTaskLogsFilterOptions();
      filterOptions.value = {
        taskNames: data?.taskNames ?? [],
        classMethods: data?.classMethods ?? []
      };
    } catch (error) {
      console.error("加载任务日志筛选选项失败", error);
    } finally {
      optionsLoading.value = false;
    }
  }

  /** 近 7 天状态统计：部分成功独立成项，未执行不再混进失败 */
  async function loadStats() {
    statsLoading.value = true;
    try {
      const { data } = await getTaskLogStats();
      stats.value = data ?? null;
    } catch (error) {
      console.error("加载任务统计失败", error);
      stats.value = null;
    } finally {
      statsLoading.value = false;
    }
  }

  /** 刷新按钮：列表与近 7 天统计一起刷新 */
  function refreshAll() {
    onSearch();
    loadStats();
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    onSearch();
  };

  // 搜索区字段配置：状态 / 触发方式优先于调用方法展示
  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "taskName",
      label: "任务名",
      type: "select",
      filterable: true,
      allowCreate: true,
      placeholder: "请选择或输入任务名",
      optionsLoading: optionsLoading.value,
      options: filterOptions.value.taskNames.map(v => ({ label: v, value: v }))
    },
    {
      prop: "status",
      label: "执行状态",
      type: "select",
      width: "sm",
      placeholder: "全部状态",
      options: TASK_LOG_STATUS_OPTIONS
    },
    {
      prop: "triggerType",
      label: "触发方式",
      type: "select",
      width: "sm",
      placeholder: "全部方式",
      options: TASK_LOG_TRIGGER_OPTIONS
    },
    {
      prop: "timeRange",
      label: "时间范围",
      type: "datetimerange",
      shortcuts: true
    },
    {
      prop: "classMethod",
      label: "调用方法",
      type: "select",
      width: "lg",
      filterable: true,
      allowCreate: true,
      placeholder: "请选择或输入调用方法",
      optionsLoading: optionsLoading.value,
      options: filterOptions.value.classMethods.map(v => ({
        label: v,
        value: v
      }))
    }
  ]);

  onMounted(() => {
    onSearch();
    loadFilterOptions();
    loadStats();
  });

  return {
    form,
    loading,
    optionsLoading,
    stats,
    statsLoading,
    columns,
    dataList,
    pagination,
    filterOptions,
    searchFields,
    onSearch,
    refreshAll,
    resetForm,
    exportExcel,
    exportLoading,
    handleSizeChange,
    handleCurrentChange,
    onDetail
  };
}
