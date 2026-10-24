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

/** 任务名 + 稳定任务码：任务码用于跨环境 / 跨版本定位同一个任务定义 */
function renderTaskName(row: TaskLogListItem) {
  return (
    <div class="flex min-w-0 flex-col leading-tight">
      <span class="truncate font-medium text-[var(--el-text-color-primary)]">
        {row.taskName || "-"}
      </span>
      {row.taskCode ? (
        <span class="truncate text-xs text-[var(--el-text-color-secondary)]">
          {row.taskCode}
        </span>
      ) : null}
    </div>
  );
}

/** 执行状态：部分成功 / 超时 / 未获锁等不再折叠成「失败」 */
function renderStatus(row: TaskLogListItem, size?: string) {
  const meta = getTaskLogStatusMeta(row.status, row.success);
  return (
    <el-tooltip content={meta.description} placement="top">
      <el-tag size={size} type={meta.tag} effect="plain">
        {meta.label}
      </el-tag>
    </el-tooltip>
  );
}

/** 触发方式：定时 / 手动 / 重试 / 系统 */
function renderTrigger(row: TaskLogListItem, size?: string) {
  if (!row.triggerType) {
    return <span class="text-[var(--el-text-color-placeholder)]">-</span>;
  }
  const meta = getTaskLogTriggerMeta(row.triggerType);
  return (
    <el-tooltip content={meta.description} placement="top">
      <el-tag size={size} type={meta.tag} effect="plain">
        {meta.label}
      </el-tag>
    </el-tooltip>
  );
}

/** 业务计数：成功 / 总数，并把失败、跳过单独标色 */
function renderCounts(row: TaskLogListItem) {
  if (row.totalCount == null) {
    return <span class="text-[var(--el-text-color-placeholder)]">-</span>;
  }
  const success = row.successCount ?? 0;
  const failed = row.failedCount ?? 0;
  const skipped = row.skippedCount ?? 0;
  return (
    <div class="flex flex-col gap-0.5 text-xs leading-tight">
      <span>
        <span class="font-medium text-[var(--el-color-success)]">
          {success}
        </span>
        <span class="text-[var(--el-text-color-secondary)]">
          {" "}
          / {row.totalCount}
        </span>
      </span>
      {failed > 0 || skipped > 0 ? (
        <span class="text-[var(--el-text-color-secondary)]">
          {failed > 0 ? (
            <span class="text-[var(--el-color-danger)]">失败 {failed}</span>
          ) : null}
          {failed > 0 && skipped > 0 ? " · " : null}
          {skipped > 0 ? `跳过 ${skipped}` : null}
        </span>
      ) : null}
    </div>
  );
}

/** 步骤统计：失败步骤数直接暴露，避免只看到「有步骤」 */
function renderSteps(row: TaskLogListItem) {
  const hasStepInfo = (row.stepCount ?? 0) > 0 || row.hasSteps;
  if (!hasStepInfo) {
    return <span class="text-[var(--el-text-color-placeholder)]">-</span>;
  }
  return (
    <div class="flex flex-col gap-0.5 text-xs leading-tight">
      <span>
        {row.stepCount ? `${row.stepCount} 步` : "有步骤"}
        {row.failedStepCount ? (
          <span class="ml-1 text-[var(--el-color-danger)]">
            失败 {row.failedStepCount}
          </span>
        ) : null}
      </span>
      {row.slowestStep ? (
        <span
          class="truncate text-[var(--el-text-color-secondary)]"
          title={row.slowestStep}
        >
          最慢 {row.slowestStep}
        </span>
      ) : null}
    </div>
  );
}

/** 执行节点：多实例部署时必须能看出是哪台机器跑的 */
function renderNode(row: TaskLogListItem) {
  if (!row.serverHost && !row.serverIp) {
    return <span class="text-[var(--el-text-color-placeholder)]">-</span>;
  }
  return (
    <div class="flex min-w-0 flex-col gap-0.5 text-xs leading-tight">
      <span class="truncate" title={row.serverHost ?? undefined}>
        {row.serverHost || "-"}
      </span>
      <span class="truncate text-[var(--el-text-color-secondary)]">
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

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "任务",
      prop: "taskName",
      minWidth: 190,
      align: "left",
      cellRenderer: ({ row }) => renderTaskName(row)
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 110,
      cellRenderer: ({ row, props }) => renderStatus(row, props.size)
    },
    {
      label: "触发方式",
      prop: "triggerType",
      minWidth: 100,
      cellRenderer: ({ row, props }) => renderTrigger(row, props.size)
    },
    {
      label: "业务计数",
      prop: "totalCount",
      minWidth: 130,
      cellRenderer: ({ row }) => renderCounts(row)
    },
    {
      label: "步骤",
      prop: "stepCount",
      minWidth: 120,
      cellRenderer: ({ row }) => renderSteps(row)
    },
    {
      label: "执行耗时",
      prop: "timeCost",
      minWidth: 110,
      cellRenderer: ({ row, props }) => {
        if (row.timeCost == null) {
          return <span class="text-[var(--el-text-color-placeholder)]">-</span>;
        }
        const cost = row.timeCost;
        return (
          <el-tag
            size={props.size}
            type={
              cost < 5000 ? "success" : cost < 30000 ? "primary" : "warning"
            }
            effect="plain"
          >
            {cost < 1000 ? `${cost} ms` : `${(cost / 1000).toFixed(2)} s`}
          </el-tag>
        );
      }
    },
    {
      label: "开始时间",
      prop: "startTime",
      minWidth: 170,
      formatter: row =>
        row.startTime ? dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "结束时间",
      prop: "endTime",
      minWidth: 170,
      formatter: row =>
        row.endTime ? dayjs(row.endTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "执行节点",
      prop: "serverHost",
      minWidth: 180,
      align: "left",
      cellRenderer: ({ row }) => renderNode(row)
    },
    {
      label: "调用方法",
      prop: "classMethod",
      minWidth: 260,
      align: "left"
    },
    {
      label: "操作",
      fixed: "right",
      width: 100,
      slot: "operation"
    }
  ];

  async function onDetail(row: TaskLogListItem) {
    try {
      const { data } = await getTaskLogDetail(row.id);
      const statusMeta = getTaskLogStatusMeta(data.status, data.success);
      addDialog({
        title: `${data.taskName || "任务"} · ${statusMeta.label}`,
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

  interface StatCard {
    key: string;
    label: string;
    value: number | string;
    color?: string;
    hint?: string;
  }

  const statCards = computed<StatCard[]>(() => {
    const s = stats.value;
    if (!s) return [];
    const notExecuted =
      (s.skippedCount ?? 0) + (s.lockedCount ?? 0) + (s.cancelledCount ?? 0);
    return [
      {
        key: "total",
        label: "近 7 天执行",
        value: s.totalCount ?? 0
      },
      {
        key: "success",
        label: "成功",
        value: s.successCount ?? 0,
        color: "var(--el-color-success)"
      },
      {
        key: "partial",
        label: "部分成功",
        value: s.partialSuccessCount ?? 0,
        color: "var(--el-color-warning)"
      },
      {
        key: "failure",
        label: "失败",
        value: s.failureCount ?? 0,
        color: "var(--el-color-danger)",
        hint: `含超时 ${s.timeoutCount ?? 0}`
      },
      {
        key: "notExecuted",
        label: "未执行",
        value: notExecuted,
        color: "var(--el-text-color-secondary)",
        hint: `跳过 ${s.skippedCount ?? 0} · 未获锁 ${s.lockedCount ?? 0} · 取消 ${s.cancelledCount ?? 0}`
      },
      {
        key: "inProgress",
        label: "执行中 / 等待",
        value: (s.runningCount ?? 0) + (s.waitingCount ?? 0),
        color: "var(--el-color-primary)",
        hint: `执行中 ${s.runningCount ?? 0} · 等待 ${s.waitingCount ?? 0}`
      },
      {
        key: "rate",
        label: "执行成功率",
        value: `${s.executedSuccessRate ?? 0}%`,
        color: "var(--el-color-primary)",
        hint: `共执行 ${s.executedCount ?? 0} 次`
      }
    ];
  });

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
    statCards,
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
