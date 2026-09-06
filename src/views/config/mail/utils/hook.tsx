import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import ReStatusSwitch from "@/components/ReStatusSwitch/index.vue";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import { getKeyList } from "@pureadmin/utils";
import {
  addMailRecipient,
  deleteMailRecipient,
  getMailRecipientList,
  getMailRecipientUserList,
  getMailRecipientOptions,
  getRewardUserList,
  updateMailRecipient,
  updateMailRecipientUser
} from "@/api/system";
import { useCrudTable, useTreePanel } from "../../composables";
import { type Ref, computed, ref, onMounted } from "vue";

export function useMailRecipient(treeRef: Ref) {
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
  } = useCrudTable({
    searchApi: getMailRecipientList,
    deleteApi: deleteMailRecipient,
    defaultForm: { email: "", name: "", enabled: "" },
    deleteMessage: row => `已删除收件人「${row.name}」`
  });

  const searchFields = computed<SearchField[]>(() => [
    { prop: "email", label: "邮件", type: "input" },
    { prop: "name", label: "姓名", type: "input" },
    {
      prop: "enabled",
      label: "状态",
      type: "select",
      width: "sm",
      options: enabledOptions.value
    }
  ]);

  const {
    curRow,
    isShow,
    treeData,
    treeProps,
    isLinkage,
    isExpandAll,
    isSelectAll,
    treeSearchValue,
    handleMenu: _handleMenu,
    handleSave: _handleSave,
    rowStyle,
    onQueryChanged,
    filterMethod
  } = useTreePanel({
    treeRef,
    loadTreeData: () => getRewardUserList({}).then(r => ({ data: r.data })),
    treeProps: { value: "id", label: "nickName", children: "children" }
  });

  async function handleMenu(row?: any) {
    if (row?.id) {
      curRow.value = row;
      isShow.value = true;
      try {
        const { data } = await getMailRecipientUserList({ mailId: row.id });
        treeRef.value.setCheckedKeys(getKeyList(data ?? [], "userId"));
      } catch (error) {
        message(getErrorMessage(error, "加载收件人用户失败"), {
          type: "error"
        });
      }
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  const saveLoading = ref(false);

  async function handleSave() {
    if (!curRow.value || saveLoading.value) return;
    const { id, name } = curRow.value;
    saveLoading.value = true;
    try {
      const r = await updateMailRecipientUser({
        mailId: id,
        userIds: treeRef.value.getCheckedKeys()
      });
      if (r.code !== 200) throw new Error(r.msg || "保存失败");
      message(`收件人「${name}」的用户配置已保存`, { type: "success" });
    } catch (error) {
      message(getErrorMessage(error, "保存失败"), { type: "error" });
    } finally {
      saveLoading.value = false;
    }
  }

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    {
      label: "邮件",
      prop: "email",
      minWidth: 200,
      cellRenderer: ({ row }) => (
        <el-link type="primary" underline={false} href={"mailto:" + row.email}>
          {row.email || "-"}
        </el-link>
      )
    },
    { label: "姓名", prop: "name", minWidth: 100 },
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
          activeValue={true}
          inactiveValue={false}
          activeText="已启用"
          inactiveText="已禁用"
          confirmTitle={`确认要<strong>${
            scope.row.enabled ? "禁用" : "启用"
          }</strong><strong style='color:var(--el-color-primary)'>${
            scope.row.name
          }</strong>吗?`}
          onChange={async ({ row, value, next }) => {
            try {
              const r = await updateMailRecipient({
                id: row.id,
                enabled: value as boolean
              });
              if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
              message(`已${value ? "启用" : "禁用"}${row.name}`, {
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
    { label: "类型", prop: "type", minWidth: 90 },
    {
      label: "组别",
      prop: "groupCode",
      minWidth: 90,
      formatter: ({ groupCode }) => groupCode || "-"
    },
    {
      label: "优先级",
      prop: "priority",
      minWidth: 80,
      align: "right",
      formatter: ({ priority }) =>
        priority === null || priority === undefined || priority === ""
          ? "-"
          : priority
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 160,
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
    { label: "操作", fixed: "right", width: 210, slot: "operation" }
  ];

  const { open } = useCrudDialog<FormItemProps>({
    title: "收件人",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      email: row?.email ?? "",
      name: row?.name ?? "",
      enabled: row?.enabled ?? true,
      type: row?.type ?? "",
      groupCode: row?.groupCode ?? "",
      priority: row?.priority ?? "",
      remark: row?.remark ?? ""
    }),
    submitApi: (payload, mode) =>
      mode === "新增" ? addMailRecipient(payload) : updateMailRecipient(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => onSearch());
  }

  async function loadEnabledOptions() {
    try {
      const { data } = await getMailRecipientOptions();
      enabledOptions.value = data?.enabledOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载状态选项失败"), { type: "error" });
    }
  }

  onMounted(() => {
    loadEnabledOptions();
  });

  return {
    form,
    isShow,
    curRow,
    loading,
    columns,
    rowStyle,
    dataList,
    treeData,
    treeProps,
    isLinkage,
    pagination,
    isExpandAll,
    isSelectAll,
    treeSearchValue,
    searchFields,
    saveLoading,
    onSearch,
    resetForm,
    openDialog,
    handleMenu,
    handleSave,
    handleDelete,
    filterMethod,
    onQueryChanged,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
