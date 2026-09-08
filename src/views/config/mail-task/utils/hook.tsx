import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { ref, h, computed } from "vue";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  getMailSendTaskList,
  deleteMailSendTask,
  sendMailSendTask,
  retryMailSendTask,
  checkMailSendTask,
  getMailSendTaskOptions
} from "@/api/system";
import { useCrudTable } from "../../composables";

// 任务状态 -> 展示文案与 tag 类型（与后端 MailSendTaskStatus.code 对齐）
export const taskStatusMap: Record<number, { label: string; tag: string }> = {
  0: { label: "草稿", tag: "info" },
  1: { label: "发送中", tag: "warning" },
  2: { label: "发送成功", tag: "success" },
  3: { label: "部分成功", tag: "warning" },
  4: { label: "发送失败", tag: "danger" },
  5: { label: "已取消", tag: "info" }
};

export function useMailSendTask() {
  const router = useRouter();
  const statusOptions = ref<Array<{ value: number; label: string }>>([]);
  const sendLoadingMap = ref<Record<string, boolean>>({});

  const {
    form,
    loading,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  } = useCrudTable({
    searchApi: getMailSendTaskList,
    deleteApi: deleteMailSendTask,
    defaultForm: { taskNo: "", taskName: "", subject: "", status: "" },
    deleteMessage: row => `已删除任务「${row.taskName || row.taskNo}」`
  });

  const columns: TableColumnList = [
    { label: "任务编号", prop: "taskNo", minWidth: 150 },
    { label: "任务名称", prop: "taskName", minWidth: 130 },
    {
      label: "邮件主题",
      prop: "subject",
      minWidth: 200,
      showOverflowTooltip: true
    },
    { label: "发送人数", prop: "validCount", minWidth: 90, align: "center" },
    { label: "成功数", prop: "successCount", minWidth: 80, align: "center" },
    { label: "失败数", prop: "failedCount", minWidth: 80, align: "center" },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      align: "center",
      cellRenderer: ({ row }) =>
        h(
          "el-tag",
          { type: taskStatusMap[row.status]?.tag ?? "info", size: "small" },
          taskStatusMap[row.status]?.label ?? row.status
        )
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 260, slot: "operation" }
  ];

  function goCreate() {
    router.push("/config/mail-task/create");
  }

  function goEdit(row: any) {
    router.push(`/config/mail-task/edit/${row.id}`);
  }

  function goDetail(row: any) {
    router.push(`/config/mail-task/detail/${row.id}`);
  }

  /** 发送：先检查再确认 */
  async function handleSend(row: any) {
    try {
      const { data } = await checkMailSendTask(row.id);
      const check = data as any;
      if (check.valid <= 0) {
        message("没有有效收件人，无法发送", { type: "warning" });
        return;
      }
      await ElMessageBox.confirm(
        `主题：${row.subject}<br/>收件人：${check.valid} 人<br/>发送后将进入异步发送队列。`,
        "确认发送？",
        {
          confirmButtonText: "确认发送",
          cancelButtonText: "取消",
          type: "warning",
          dangerouslyUseHTMLString: true
        }
      );
      sendLoadingMap.value[row.id] = true;
      const r: any = await sendMailSendTask(row.id);
      if (r.code === 200) {
        message("任务已提交发送！", { type: "success" });
        onSearch();
      } else {
        message(r.msg || "发送失败", { type: "error" });
      }
    } catch (e: any) {
      if (e !== "cancel" && e?.message !== "cancel") {
        message(e?.msg || e?.message || "发送失败", { type: "error" });
      }
    } finally {
      sendLoadingMap.value[row.id] = false;
    }
  }

  function handleRetry(row: any) {
    ElMessageBox.confirm(
      `确认重新发送任务「${row.taskName || row.taskNo}」中失败的收件人？`,
      "失败重试",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    )
      .then(async () => {
        try {
          const r: any = await retryMailSendTask(row.id);
          if (r.code !== 200) throw new Error(r.msg || "重试失败");
          message("失败收件人已重新进入发送队列", { type: "success" });
          onSearch();
        } catch (e) {
          message(getErrorMessage(e, "重试失败"), { type: "error" });
        }
      })
      // 用户取消确认框时静默处理
      .catch(() => {});
  }

  // 搜索区字段配置：4 项一行平铺
  const searchFields = computed<SearchField[]>(() => [
    { prop: "taskNo", label: "任务编号", type: "input" },
    { prop: "taskName", label: "任务名称", type: "input" },
    { prop: "subject", label: "邮件主题", type: "input" },
    {
      prop: "status",
      label: "状态",
      type: "select",
      width: "sm",
      options: statusOptions.value
    }
  ]);

  async function loadStatusOptions() {
    try {
      const { data } = await getMailSendTaskOptions();
      statusOptions.value = data?.statusOptions ?? [];
    } catch (e) {
      message(getErrorMessage(e, "加载状态选项失败"), { type: "error" });
    }
  }

  return {
    form,
    loading,
    dataList,
    columns,
    pagination,
    statusOptions,
    searchFields,
    sendLoadingMap,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    goCreate,
    goEdit,
    goDetail,
    handleSend,
    handleRetry,
    loadStatusOptions
  };
}
