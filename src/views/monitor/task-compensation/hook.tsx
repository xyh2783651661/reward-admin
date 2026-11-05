import { RA_DIALOG_WIDTH } from "@/constants";
import { computed, h, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import {
  getCompensableTasks,
  triggerTaskCompensation,
  type TaskMetadata,
  type TaskCompensationTriggerReq,
  type TriggerResult
} from "@/api/task";
import { addDialog } from "@/components/ReDialog/index";
import { message } from "@/utils/message";
import TriggerForm from "./trigger.vue";

/** 补偿状态 -> 提示类型的映射 */
const STATUS_TYPE: Record<string, "success" | "warning" | "error"> = {
  EXECUTED: "success",
  DEPENDENCY_FAILED: "warning",
  LOCK_BUSY: "warning",
  NOT_COMPENSABLE: "warning",
  NOT_FOUND: "error",
  ERROR: "error"
};

export function useTaskCompensation() {
  const router = useRouter();
  const loading = ref(true);
  const taskList = ref<TaskMetadata[]>([]);
  const keyword = ref("");

  /** 任务量级只有几十条，直接在前端过滤，不再走后端 */
  const filteredList = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    if (!kw) return taskList.value;
    return taskList.value.filter(
      t =>
        t.code.toLowerCase().includes(kw) ||
        (t.name ?? "").toLowerCase().includes(kw) ||
        (t.description ?? "").toLowerCase().includes(kw)
    );
  });

  const columns: TableColumnList = [
    {
      label: "任务名称",
      prop: "name",
      minWidth: 160,
      align: "left"
    },
    {
      label: "任务码",
      prop: "code",
      minWidth: 200,
      align: "left",
      cellRenderer: ({ row }) => <el-text type="primary">{row.code}</el-text>
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 260,
      align: "left",
      showOverflowTooltip: true,
      formatter: row => row.description || "-"
    },
    {
      label: "前置依赖",
      prop: "dependsOn",
      minWidth: 120,
      cellRenderer: ({ row, props }) =>
        row.dependsOn?.length ? (
          <el-tag size={props.size} type="warning" effect="plain">
            {row.dependsOn.length} 个
          </el-tag>
        ) : (
          <el-text type="info">无</el-text>
        )
    },
    {
      label: "分布式锁",
      prop: "lockKey",
      minWidth: 200,
      align: "left",
      showOverflowTooltip: true,
      formatter: row => row.lockKey || "-"
    },
    {
      label: "可补偿",
      prop: "compensable",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.compensable ? "success" : "danger"}
          effect="plain"
        >
          {row.compensable ? "允许" : "已禁用"}
        </el-tag>
      )
    },
    {
      label: "操作",
      fixed: "right",
      width: 130,
      slot: "operation"
    }
  ];

  /**
   * 处理触发结果。
   * 注意：依赖阻断、任务不可补偿这类情况后端仍返回 HTTP 200，
   * 只能靠 data.status 区分，不能只看请求有没有抛错。
   */
  function handleResult(
    res: TriggerResult,
    task: TaskMetadata,
    isAsync: boolean
  ) {
    const type = STATUS_TYPE[res?.status] ?? "error";

    if (res?.status === "EXECUTED") {
      if (isAsync) {
        ElMessageBox.confirm(
          `任务「${task.name}」已提交异步执行。异步模式下无法立即拿到结果，需前往任务执行日志查看。`,
          "已提交",
          {
            confirmButtonText: "前往日志",
            cancelButtonText: "知道了",
            type: "success"
          }
        )
          .then(() => router.push("/log/operation"))
          .catch(() => {});
      } else {
        message(`执行完成，耗时 ${res.timeCostMs ?? 0} ms`, {
          type: "success"
        });
      }
      return;
    }

    message(res?.message ?? "触发失败", { type });
  }

  function openTriggerDialog(task: TaskMetadata) {
    const payload = reactive<TaskCompensationTriggerReq>({
      force: false,
      autoFix: false,
      skipDeps: false,
      async: true,
      reason: ""
    });

    addDialog({
      title: `触发补偿 · ${task.name}`,
      width: RA_DIALOG_WIDTH.sm,
      props: { task, payload },
      // 用 h 而非组件引用，才能把 update 事件挂上：子组件 emit 回变更，这里合并进 payload
      contentRenderer: () =>
        h(TriggerForm, {
          task,
          payload,
          onUpdate: (patch: Partial<TaskCompensationTriggerReq>) =>
            Object.assign(payload, patch)
        }),
      sureBtnLoading: true,
      // 二次确认：这些任务有真实外部副作用（发邮件 / 群发推送 / 上传视频），误触发不可撤销
      popconfirm: {
        title: "确认触发？该任务会产生真实的外部副作用，误触发不可撤销。",
        confirmButtonText: "确认触发",
        cancelButtonText: "再想想",
        confirmButtonType: "danger",
        width: 320
      },
      beforeSure: async (done, { closeLoading }) => {
        const isAsync = payload.async !== false;
        try {
          const { data } = await triggerTaskCompensation(task.code, {
            ...payload
          });

          // 依赖未满足时，给用户一条「自动修复并重试」的捷径，省得手动改开关再来一遍
          if (data?.status === "DEPENDENCY_FAILED" && !payload.autoFix) {
            try {
              await ElMessageBox.confirm(
                `${data.message}\n\n是否自动修复前置依赖并重试？`,
                "前置依赖未满足",
                {
                  confirmButtonText: "自动修复并重试",
                  cancelButtonText: "取消",
                  type: "warning"
                }
              );
              const retry = await triggerTaskCompensation(task.code, {
                ...payload,
                autoFix: true
              });
              handleResult(retry.data, task, isAsync);
            } catch {
              // 用户取消重试，保留原始提示
              handleResult(data, task, isAsync);
            }
          } else {
            handleResult(data, task, isAsync);
          }

          done();
        } catch (error) {
          message(error?.msg ?? "触发失败，请稍后重试", { type: "error" });
        } finally {
          closeLoading?.();
        }
      }
    });
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getCompensableTasks();
      taskList.value = data ?? [];
    } catch {
      taskList.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    onSearch();
  });

  return {
    loading,
    keyword,
    taskList,
    filteredList,
    columns,
    onSearch,
    openTriggerDialog
  };
}
