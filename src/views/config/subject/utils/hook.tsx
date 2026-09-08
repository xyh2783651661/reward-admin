import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import ReStatusSwitch from "@/components/ReStatusSwitch/index.vue";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  addRewardSubject,
  deleteRewardSubject,
  getRewardSubjectList,
  getRewardSubjectOptions,
  updateRewardSubject
} from "@/api/system";
import { useCrudTable } from "../../composables";
import { computed, ref, onMounted } from "vue";

const numberFormatter = (value: unknown) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

export function useRewardSubject() {
  const subjectTypeOptions = ref<Array<{ value: any; label: string }>>([]);
  const stageOptions = ref<Array<{ value: any; label: string }>>([]);
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
    searchApi: getRewardSubjectList,
    deleteApi: deleteRewardSubject,
    defaultForm: { name: "", type: "", stage: "", status: "" },
    deleteMessage: row => `已删除科目「${row.name}」`
  });

  const searchFields = computed<SearchField[]>(() => [
    { prop: "name", label: "科目", type: "input" },
    {
      prop: "type",
      label: "类型",
      type: "select",
      options: subjectTypeOptions.value
    },
    {
      prop: "stage",
      label: "学段",
      type: "select",
      options: stageOptions.value
    },
    {
      prop: "status",
      label: "状态",
      type: "select",
      width: "sm",
      options: statusOptions.value
    }
  ]);

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    { label: "科目", prop: "name", minWidth: 120, sortable: true },
    { label: "类型", prop: "type", minWidth: 100 },
    { label: "学段", prop: "stage", minWidth: 90 },
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
            scope.row.name
          }</strong>吗?`}
          onChange={async ({ row, value, next }) => {
            try {
              const r = await updateRewardSubject({
                id: row.id,
                status: value
              });
              if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
              message(`已${value === 1 ? "启用" : "停用"}${row.name}`, {
                type: "success"
              });
              next(true);
              onSearch();
            } catch (error) {
              next(false, error);
            }
          }}
        />
      )
    },
    {
      label: "基础",
      prop: "base",
      minWidth: 90,
      align: "right",
      sortable: true,
      formatter: ({ base }) => numberFormatter(base)
    },
    {
      label: "卓越",
      prop: "excellence",
      minWidth: 90,
      align: "right",
      sortable: true,
      formatter: ({ excellence }) => numberFormatter(excellence)
    },
    {
      label: "满分",
      prop: "full",
      minWidth: 90,
      align: "right",
      sortable: true,
      formatter: ({ full }) => numberFormatter(full)
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
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  const { open } = useCrudDialog<FormItemProps>({
    title: "科目",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      name: row?.name ?? "",
      type: row?.type ?? "",
      stage: row?.stage ?? "",
      base: row?.base ?? "",
      full: row?.full ?? "",
      excellence: row?.excellence ?? ""
    }),
    submitApi: (payload, mode) =>
      mode === "新增" ? addRewardSubject(payload) : updateRewardSubject(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => onSearch());
  }

  async function loadRewardSubjectOptions() {
    try {
      const { data } = await getRewardSubjectOptions();
      subjectTypeOptions.value = data?.subjectTypeOptions ?? [];
      stageOptions.value = data?.stageOptions ?? [];
      statusOptions.value = data?.statusOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载科目选项失败"), { type: "error" });
    }
  }

  onMounted(() => {
    loadRewardSubjectOptions();
  });

  return {
    form,
    loading,
    searchFields,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
