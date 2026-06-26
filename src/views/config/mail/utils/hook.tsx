import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection, getKeyList } from "@pureadmin/utils";
import {
  addMailRecipient,
  deleteMailRecipient,
  getMailRecipientList,
  getMailRecipientUserList,
  getRewardUserList,
  updateMailRecipient,
  updateMailRecipientUser
} from "@/api/system";
import { useCrudTable, useTreePanel } from "../../composables";
import { type Ref, ref, h } from "vue";

export function useMailRecipient(treeRef: Ref) {
  const formRef = ref();
  const switchLoadMap = ref({});
  const { switchStyle } = usePublicHooks();

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
    deleteMessage: row => `已删除ID为${row.id}的数据`
  });

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
      const { data } = await getMailRecipientUserList({ mailId: row.id });
      treeRef.value.setCheckedKeys(getKeyList(data, "userId"));
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  function handleSave() {
    const { id, name } = curRow.value;
    updateMailRecipientUser({
      mailId: id,
      userIds: treeRef.value.getCheckedKeys()
    }).then(r => {
      if (r.code === 200) {
        message(`收件人名称为${name}的用户配置${r.msg}`, {
          type: "success"
        });
      } else {
        message(`收件人名称为${name}的用户配置${r.msg}`, {
          type: "error"
        });
      }
    });
  }

  const columns: TableColumnList = [
    { label: "ID", prop: "id" },
    { label: "邮件", prop: "email", minWidth: 180 },
    { label: "姓名", prop: "name" },
    {
      label: "状态",
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.enabled}
          active-value={true}
          inactive-value={false}
          active-text="已启用"
          inactive-text="已禁用"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope as any)}
        />
      ),
      minWidth: 90
    },
    { label: "类型", prop: "type", minWidth: 90 },
    { label: "组别", prop: "groupCode" },
    { label: "优先级", prop: "priority", minWidth: 80 },
    { label: "备注", prop: "remark", minWidth: 160 },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 160,
      formatter: ({ updatedTime }) =>
        dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss")
    },
    { label: "操作", fixed: "right", width: 210, slot: "operation" }
  ];

  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.enabled ? "启用" : "禁用"
      }</strong><strong style='color:var(--el-color-primary)'>${
        row.name
      }</strong>吗?`,
      "系统提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(() => {
        switchLoadMap.value[index] = Object.assign(
          {},
          switchLoadMap.value[index],
          { loading: true }
        );
        setTimeout(() => {
          switchLoadMap.value[index] = Object.assign(
            {},
            switchLoadMap.value[index],
            { loading: false }
          );
          updateMailRecipient({ id: row.id, enabled: row.enabled }).then(r => {
            if (r.code === 200) {
              message(`已${row.enabled ? "启用" : "禁用"}${row.name}`, {
                type: "success"
              });
            }
          });
        }, 300);
      })
      .catch(() => {
        row.enabled ? (row.enabled = false) : (row.enabled = true);
      });
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}收件人`,
      props: {
        formInline: {
          id: row?.id ?? "",
          email: row?.email ?? "",
          name: row?.name ?? "",
          enabled: row?.enabled ?? true,
          type: row?.type ?? "",
          groupCode: row?.groupCode ?? "",
          priority: row?.priority ?? "",
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        const msg = `您${title}了收件人名称为${curData.name}的这条数据`;
        function chores() {
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            const api =
              title === "新增" ? addMailRecipient : updateMailRecipient;
            api(curData)
              .then(r => {
                if (r.code === 200) {
                  message(msg + `${r.msg}`, { type: "success" });
                } else {
                  message(msg + `${r.msg}`, { type: "error" });
                }
              })
              .finally(() => {
                chores();
              });
          }
        });
      }
    });
  }

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
