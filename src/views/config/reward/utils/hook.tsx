import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import ReStatusSwitch from "@/components/ReStatusSwitch/index.vue";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  addRewardConfig,
  deleteRewardConfig,
  exportRewardConfigList,
  getRewardConfigList,
  getRewardConfigOptions,
  updateRewardConfig
} from "@/api/system";
import { useCrudTable, useTableExport } from "../../composables";
import { computed, ref, h, onMounted } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";

export function useRewardConfig() {
  const rewardTypeOptions = ref<Array<{ value: any; label: string }>>([]);
  const statusOptions = ref<Array<{ value: any; label: string }>>([]);

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
    searchApi: getRewardConfigList,
    deleteApi: deleteRewardConfig,
    defaultForm: {
      description: "",
      rewardType: "",
      rewardKey: "",
      rewardValue: "",
      condition: "",
      status: ""
    },
    deleteMessage: row => `已删除配置「${row.rewardKey}」`
  });

  const { exportLoading, exportExcel } = useTableExport(
    exportRewardConfigList,
    "奖励配置.xlsx",
    () => form
  );

  const searchFields = computed<SearchField[]>(() => [
    { prop: "rewardKey", label: "KEY", type: "input" },
    {
      prop: "rewardType",
      label: "类型",
      type: "select",
      options: rewardTypeOptions.value
    },
    {
      prop: "status",
      label: "状态",
      type: "select",
      width: "sm",
      options: statusOptions.value
    },
    { prop: "rewardValue", label: "数值", type: "input" },
    { prop: "description", label: "说明", type: "input" },
    {
      prop: "condition",
      label: "条件",
      type: "input",
      width: "lg",
      placeholder: "请输入条件表达式"
    }
  ]);

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    { label: "KEY", prop: "rewardKey", minWidth: 240, sortable: true },
    { label: "类型", prop: "rewardType", minWidth: 100, sortable: true },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: scope => (
        <ReStatusSwitch
          modelValue={scope.row.status}
          onUpdate:modelValue={(val: any) => (scope.row.status = val)}
          row={scope.row}
          index={scope.index}
          size={scope.props.size === "small" ? "small" : "default"}
          activeText="已启用"
          inactiveText="已停用"
          confirmTitle={`确认要<strong>${
            scope.row.status === 1 ? "停用" : "启用"
          }</strong><strong style='color:var(--el-color-primary)'>${
            scope.row.rewardKey
          }</strong>吗?`}
          onChange={async ({ row, value, next }) => {
            try {
              const r = await updateRewardConfig({ id: row.id, status: value });
              if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
              message(`已${value === 1 ? "启用" : "停用"}${row.rewardKey}`, {
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
      label: "数值",
      prop: "rewardValue",
      minWidth: 90,
      align: "right",
      sortable: true,
      formatter: ({ rewardValue }) =>
        rewardValue === null || rewardValue === undefined || rewardValue === ""
          ? "-"
          : rewardValue
    },
    {
      label: "说明",
      prop: "description",
      minWidth: 140,
      showOverflowTooltip: true,
      formatter: ({ description }) => description || "-"
    },
    {
      label: "条件",
      prop: "condition",
      minWidth: 220,
      cellRenderer: ({ row }) =>
        h(ReJsonField, {
          modelValue: row?.condition ?? "",
          readonly: true,
          compact: true
        })
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      width: 168,
      sortable: true,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "创建时间",
      prop: "createdTime",
      width: 168,
      hide: true,
      sortable: true,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  const { open } = useCrudDialog<FormItemProps>({
    title: "配置",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      rewardKey: row?.rewardKey ?? "",
      rewardType: row?.rewardType ?? "",
      rewardValue: row?.rewardValue ?? "",
      description: row?.description ?? "",
      condition: row?.condition ?? ""
    }),
    submitApi: (payload, mode) =>
      mode === "新增" ? addRewardConfig(payload) : updateRewardConfig(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => onSearch());
  }

  async function loadRewardConfigOptions() {
    try {
      const { data } = await getRewardConfigOptions();
      rewardTypeOptions.value = data?.rewardTypeOptions ?? [];
      statusOptions.value = data?.statusOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载配置选项失败"), { type: "error" });
    }
  }

  onMounted(() => {
    loadRewardConfigOptions();
  });

  return {
    form,
    loading,
    exportLoading,
    searchFields,
    columns,
    dataList,
    pagination,
    onSearch,
    exportExcel,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
