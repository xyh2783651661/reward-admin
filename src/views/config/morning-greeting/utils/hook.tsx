import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import ReStatusSwitch from "@/components/ReStatusSwitch/index.vue";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  addMorningGreeting,
  deleteMorningGreeting,
  getMorningGreetingOptions,
  getMorningGreetingPage,
  updateMorningGreeting
} from "@/api/morning-greeting";
import { getRewardUserList } from "@/api/system";
import { useCrudTable } from "../../composables";
import { computed, ref, onMounted } from "vue";

export function useMorningGreeting() {
  const userOptions = ref<{ id: number; nickName: string }[]>([]);
  const enabledOptions = ref<Array<{ value: any; label: string }>>([]);

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
  } = useCrudTable<{
    targetUserId: number | string;
    sendDate: string;
    enabled: number | string;
  }>({
    searchApi: getMorningGreetingPage,
    deleteApi: deleteMorningGreeting,
    defaultForm: { targetUserId: "", sendDate: "", enabled: "" },
    deleteMessage: row => `已删除ID为${row.id}的配置`
  });

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "targetUserId",
      label: "目标用户",
      type: "select",
      filterable: true,
      options: userOptions.value.map(u => ({ label: u.nickName, value: u.id }))
    },
    {
      prop: "enabled",
      label: "状态",
      type: "select",
      width: "sm",
      options: enabledOptions.value
    }
  ]);

  onMounted(async () => {
    try {
      const { data } = await getRewardUserList({});
      userOptions.value = (data ?? []) as { id: number; nickName: string }[];
    } catch (error) {
      userOptions.value = [];
      message(getErrorMessage(error, "加载用户列表失败"), { type: "error" });
    }
    try {
      const { data } = await getMorningGreetingOptions();
      enabledOptions.value = data?.enabledOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载状态选项失败"), { type: "error" });
    }
  });

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    {
      label: "目标用户",
      prop: "targetUserId",
      minWidth: 140,
      cellRenderer: ({ row }) => {
        const u = userOptions.value.find(x => x.id === row.targetUserId);
        return <span>{u ? u.nickName : (row.targetUserId ?? "-")}</span>;
      }
    },
    {
      label: "发送日期",
      prop: "sendDate",
      minWidth: 130,
      formatter: ({ sendDate }) => sendDate || "每天"
    },
    {
      label: "状态",
      prop: "enabled",
      minWidth: 100,
      cellRenderer: scope => (
        <ReStatusSwitch
          modelValue={scope.row.enabled}
          onUpdate:modelValue={(val: any) => (scope.row.enabled = val)}
          row={scope.row}
          index={scope.index}
          size={scope.props.size === "small" ? "small" : "default"}
          activeText="已启用"
          inactiveText="已禁用"
          confirmTitle={`确认要<strong>${
            scope.row.enabled ? "禁用" : "启用"
          }</strong><strong style='color:var(--el-color-primary)'>ID为${
            scope.row.id
          }</strong>的早安问候配置吗?`}
          onChange={async ({ row, value, next }) => {
            try {
              const r = await updateMorningGreeting({
                id: row.id,
                enabled: value as number
              });
              if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
              message(`已${value ? "启用" : "禁用"}ID为${row.id}的配置`, {
                type: "success"
              });
              next(true);
            } catch (error) {
              next(false, error);
            }
          }}
        />
      )
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 200,
      showOverflowTooltip: true,
      formatter: ({ remark }) => remark || "-"
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      width: 168,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "创建时间",
      prop: "createdTime",
      width: 168,
      hide: true,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  const { open } = useCrudDialog<FormItemProps>({
    title: "早安问候配置",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      targetUserId: row?.targetUserId ?? "",
      sendDate: row?.sendDate ?? "",
      enabled: row?.enabled ?? 1,
      remark: row?.remark ?? ""
    }),
    submitApi: (payload, mode) =>
      mode === "新增"
        ? addMorningGreeting(payload)
        : updateMorningGreeting(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => onSearch());
  }

  return {
    form,
    loading,
    dataList,
    pagination,
    columns,
    searchFields,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
