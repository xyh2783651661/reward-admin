import dayjs from "dayjs";
import editForm from "./form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "./utils/types";
import { deviceDetection } from "@pureadmin/utils";
import { ElMessageBox } from "element-plus";
import {
  getSysNoticePage,
  deleteSysNotice,
  addSysNotice,
  updateSysNotice,
  publishSysNotice,
  withdrawSysNotice
} from "@/api/notice";
import { useCrudTable } from "@/views/config/composables";
import { type Ref, ref, h, computed } from "vue";

type TagType = "primary" | "success" | "warning" | "info" | "danger" | "";

const noticeTypeMap: Record<number, { label: string; type: TagType }> = {
  1: { label: "功能更新", type: "success" },
  2: { label: "系统公告", type: "warning" }
};

const priorityMap: Record<
  number,
  { label: string; type: TagType; weight: string }
> = {
  4: { label: "信息", type: "info", weight: "低" },
  5: { label: "普通", type: "primary", weight: "标准" },
  7: { label: "警告", type: "warning", weight: "高" },
  9: { label: "紧急", type: "danger", weight: "最高" }
};

const statusMap: Record<
  number,
  { label: string; type: TagType; hint: string }
> = {
  0: { label: "草稿", type: "info", hint: "待发布" },
  1: { label: "已发布", type: "success", hint: "线上可见" },
  2: { label: "已撤回", type: "danger", hint: "已停止展示" }
};

const platformOptions = [
  { label: "Web", value: 1, type: "primary" },
  { label: "Android", value: 2, type: "success" },
  { label: "iOS", value: 4, type: "warning" }
] as const;

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizePlatformMask(value: FormItemProps["platformMask"]) {
  if (Array.isArray(value)) {
    return value.reduce((acc, item) => acc | Number(item), 0);
  }

  return toNumber(value);
}

function decomposePlatformMask(mask: FormItemProps["platformMask"]): number[] {
  const numericMask = normalizePlatformMask(mask);
  return platformOptions
    .filter(item => numericMask & item.value)
    .map(item => item.value);
}

function formatDateTime(value?: string) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

function getOnlineState(row: FormItemProps) {
  const status = toNumber(row.status);
  const publishTime = row.publishTime ? dayjs(row.publishTime) : null;
  const offlineTime = row.offlineTime ? dayjs(row.offlineTime) : null;
  const now = dayjs();

  if (status !== 1) return statusMap[status] ?? statusMap[0];
  if (publishTime?.isAfter(now)) {
    return { label: "待生效", type: "warning" as TagType, hint: "定时发布" };
  }
  if (offlineTime?.isBefore(now)) {
    return { label: "已下线", type: "info" as TagType, hint: "已过展示期" };
  }

  return statusMap[1];
}

function getPlatformLabels(mask: FormItemProps["platformMask"]) {
  const numericMask = normalizePlatformMask(mask);
  return platformOptions.filter(item => numericMask & item.value);
}

function getTimeRange(row: FormItemProps) {
  const publishTime = row.publishTime
    ? formatDateTime(row.publishTime)
    : "立即/未设置";
  const offlineTime = row.offlineTime
    ? formatDateTime(row.offlineTime)
    : "长期有效";

  return `${publishTime} 至 ${offlineTime}`;
}

function getErrorMessage(error: unknown, fallback = "操作失败") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function validateTimeRange(data: FormItemProps) {
  if (!data.publishTime || !data.offlineTime) return true;
  return dayjs(data.offlineTime).isAfter(dayjs(data.publishTime));
}

export function useSysNotice(_tableRef?: Ref) {
  const formRef = ref();

  const {
    form,
    loading,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  } = useCrudTable({
    searchApi: getSysNoticePage,
    deleteApi: deleteSysNotice,
    deleteMessage: row => `已删除公告「${row.title ?? row.id}」`,
    defaultForm: {
      keyword: "",
      filterNoticeType: "",
      priority: "",
      platformMask: "",
      status: "",
      current: 1,
      size: 10
    }
  });

  const noticeStats = computed(() => {
    const initialStats = {
      total: dataList.value.length,
      published: 0,
      draft: 0,
      withdrawn: 0,
      urgent: 0
    };

    return dataList.value.reduce((stats, item) => {
      const status = toNumber(item.status);
      const priority = toNumber(item.priority);

      if (status === 1) stats.published += 1;
      if (status === 0) stats.draft += 1;
      if (status === 2) stats.withdrawn += 1;
      if (priority >= 7) stats.urgent += 1;

      return stats;
    }, initialStats);
  });

  const columns: TableColumnList = [
    {
      label: "公告内容",
      prop: "title",
      minWidth: 280,
      cellRenderer: ({ row }) => {
        const typeMeta = noticeTypeMap[toNumber(row.noticeType)] ?? {
          label: row.noticeType || "未知类型",
          type: "info"
        };
        return (
          <div class="notice-title-cell">
            <div class="notice-title-line">
              <span class="notice-title-text">{row.title || "未命名公告"}</span>
              <el-tag size="small" type={typeMeta.type} effect="light" round>
                {typeMeta.label}
              </el-tag>
            </div>
            <div class="notice-content-preview">
              {row.content || "暂无公告内容"}
            </div>
          </div>
        );
      }
    },
    {
      label: "优先级",
      prop: "priority",
      minWidth: 110,
      cellRenderer: ({ row, props }) => {
        const meta = priorityMap[toNumber(row.priority)] ?? {
          label: row.priority || "-",
          type: "info",
          weight: "未知"
        };
        return (
          <div class="notice-priority-cell">
            <el-tag size={props.size} type={meta.type} effect="dark" round>
              {meta.label}
            </el-tag>
            <span>{meta.weight}</span>
          </div>
        );
      }
    },
    {
      label: "目标平台",
      prop: "platformMask",
      minWidth: 160,
      cellRenderer: ({ row }) => {
        const platforms = getPlatformLabels(row.platformMask);
        return platforms.length ? (
          <div class="notice-platform-cell">
            {platforms.map(item => (
              <el-tag key={item.value} type={item.type} effect="plain" round>
                {item.label}
              </el-tag>
            ))}
          </div>
        ) : (
          <span class="notice-empty-text">未设置</span>
        );
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 120,
      cellRenderer: ({ row, props }) => {
        const meta = getOnlineState(row);
        return (
          <div class="notice-status-cell">
            <el-tag size={props.size} type={meta.type} effect="light" round>
              {meta.label}
            </el-tag>
            <span>{meta.hint}</span>
          </div>
        );
      }
    },
    {
      label: "展示周期",
      prop: "publishTime",
      minWidth: 240,
      cellRenderer: ({ row }) => (
        <div class="notice-time-cell">
          <span>{getTimeRange(row)}</span>
          {row.minVersion ? (
            <em>最低版本 {row.minVersion}</em>
          ) : (
            <em>全版本可见</em>
          )}
        </div>
      )
    },
    {
      label: "操作人",
      prop: "operator",
      minWidth: 110,
      formatter: ({ operator }) => operator || "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 250,
      slot: "operation"
    }
  ];

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}公告`,
      props: {
        formInline: {
          id: row?.id ?? "",
          title: row?.title ?? "",
          content: row?.content ?? "",
          noticeType: row?.noticeType ?? 2,
          priority: row?.priority ?? 5,
          platformMask: row?.platformMask
            ? decomposePlatformMask(row.platformMask)
            : [1],
          minVersion: row?.minVersion ?? "",
          publishTime: row?.publishTime ?? "",
          offlineTime: row?.offlineTime ?? "",
          operator: row?.operator ?? "",
          status: row?.status ?? 0
        }
      },
      width: "720px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;

        try {
          const valid = await FormRef.validate().catch(() => false);
          if (!valid) return;
          if (!validateTimeRange(curData)) {
            message("下线时间必须晚于发布时间", { type: "warning" });
            return;
          }

          const submitData = {
            ...curData,
            platformMask: normalizePlatformMask(curData.platformMask)
          };
          const api = title === "新增" ? addSysNotice : updateSysNotice;
          const result = await api(submitData);

          message(result.msg || `${title}公告成功`, {
            type: result.code === 200 ? "success" : "error"
          });
          done();
          onSearch();
        } catch (error) {
          message(getErrorMessage(error, `${title}公告失败`), {
            type: "error"
          });
        } finally {
          closeLoading();
        }
      }
    });
  }

  async function handlePublish(row: FormItemProps) {
    if (!row.id) {
      message("缺少公告 ID，无法发布", { type: "warning" });
      return;
    }

    try {
      await ElMessageBox.confirm(
        `发布后目标用户将在通知中心看到「${row.title}」，是否继续？`,
        "发布公告",
        {
          confirmButtonText: "确认发布",
          cancelButtonText: "取消",
          type: "success"
        }
      );
      const result = await publishSysNotice(row.id);
      message(result.msg || "发布成功", {
        type: result.code === 200 ? "success" : "error"
      });
      onSearch();
    } catch (error) {
      if (error !== "cancel" && error !== "close") {
        message(getErrorMessage(error, "发布失败"), { type: "error" });
      }
    }
  }

  async function handleWithdraw(row: FormItemProps) {
    if (!row.id) {
      message("缺少公告 ID，无法撤回", { type: "warning" });
      return;
    }

    try {
      await ElMessageBox.confirm(
        `撤回后「${row.title}」将停止对用户展示，是否继续？`,
        "撤回公告",
        {
          confirmButtonText: "确认撤回",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      const result = await withdrawSysNotice(row.id);
      message(result.msg || "撤回成功", {
        type: result.code === 200 ? "success" : "error"
      });
      onSearch();
    } catch (error) {
      if (error !== "cancel" && error !== "close") {
        message(getErrorMessage(error, "撤回失败"), { type: "error" });
      }
    }
  }

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    noticeStats,
    platformOptions,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handlePublish,
    handleWithdraw,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
