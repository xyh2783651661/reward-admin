import { http } from "@/utils/http";

type ApiResult<T> = {
  code: number;
  msg: string;
  success?: boolean;
  data: T;
};

type WorkbenchTrendRange = "7d" | "30d";
type SummaryTrend = "up" | "down" | "flat";

interface WorkbenchHeadline {
  title: string;
  description: string;
  updatedAt: string;
}

interface WorkbenchFocusItem {
  label: string;
  value: string;
  type: "primary" | "success" | "warning" | "info" | "danger";
}

interface WorkbenchSummaryCard {
  key: string;
  label: string;
  value: number;
  unit?: string;
  delta: number;
  trend: SummaryTrend;
  description: string;
  icon: string;
  color: string;
  path?: string;
}

interface WorkbenchQuickEntry {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  accent: string;
}

interface WorkbenchSummaryData {
  headline: WorkbenchHeadline;
  focusItems: WorkbenchFocusItem[];
  summaryCards: WorkbenchSummaryCard[];
  quickEntries: WorkbenchQuickEntry[];
}

interface WorkbenchTrendData {
  range: WorkbenchTrendRange;
  categories: string[];
  rewardIssued: number[];
  mailSuccessRate: number[];
  taskExecutions: number[];
}

interface WorkbenchTodoItem {
  id: string;
  title: string;
  description: string;
  dueTime: string;
  tag: string;
  status: "primary" | "success" | "warning" | "info" | "danger";
  actionText: string;
  path: string;
}

interface WorkbenchActivityItem {
  id: string;
  title: string;
  description: string;
  operator: string;
  time: string;
  path: string;
  icon: string;
}

const getWorkbenchSummary = () => {
  return http.request<ApiResult<WorkbenchSummaryData>>(
    "get",
    "/api/workbench/summary"
  );
};

const getWorkbenchTrends = (range: WorkbenchTrendRange = "7d") => {
  return http.request<ApiResult<WorkbenchTrendData>>(
    "get",
    "/api/workbench/trends",
    {
      params: { range }
    }
  );
};

const getWorkbenchTodos = () => {
  return http.request<ApiResult<WorkbenchTodoItem[]>>(
    "get",
    "/api/workbench/todos"
  );
};

const getWorkbenchActivities = () => {
  return http.request<ApiResult<WorkbenchActivityItem[]>>(
    "get",
    "/api/workbench/activities"
  );
};

const completeWorkbenchTodo = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    `/api/workbench/todos/${id}/complete`
  );
};

export {
  getWorkbenchSummary,
  getWorkbenchTrends,
  getWorkbenchTodos,
  getWorkbenchActivities,
  completeWorkbenchTodo
};

export type {
  WorkbenchTrendRange,
  SummaryTrend,
  WorkbenchHeadline,
  WorkbenchFocusItem,
  WorkbenchSummaryCard,
  WorkbenchQuickEntry,
  WorkbenchSummaryData,
  WorkbenchTrendData,
  WorkbenchTodoItem,
  WorkbenchActivityItem
};
