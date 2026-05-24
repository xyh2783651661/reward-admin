import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection } from "@pureadmin/utils";
import { getRoleList } from "@/api/system";
import {
  mockLoadTreeData,
  mockRoleMenuCheckedIds
} from "../../composables/mockData";
import { useCrudTable, useTreePanel } from "../../composables";
import { type Ref, ref, h } from "vue";

export function useMoneyConfig(treeRef: Ref) {
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
    searchApi: getRoleList,
    deleteApi: async (id: number | string) => {
      message(`您删除了ID为${id}的这条数据`, { type: "success" });
      return { code: 200, msg: "success" };
    },
    defaultForm: { name: "", code: "", status: "" }
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
    handleMenu,
    handleSave,
    rowStyle,
    onQueryChanged,
    filterMethod
  } = useTreePanel({
    treeRef,
    loadTreeData: mockLoadTreeData,
    getCheckedIds: row => mockRoleMenuCheckedIds(row)
  });

  const columns: TableColumnList = [
    { label: "角色编号", prop: "id" },
    { label: "角色名称", prop: "name" },
    { label: "角色标识", prop: "code" },
    {
      label: "状态",
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="已启用"
          inactive-text="已停用"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope as any)}
        />
      ),
      minWidth: 90
    },
    { label: "备注", prop: "remark", minWidth: 160 },
    {
      label: "创建时间",
      prop: "createTime",
      minWidth: 160,
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    { label: "操作", fixed: "right", width: 210, slot: "operation" }
  ];

  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.status === 0 ? "停用" : "启用"
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
          message(`已${row.status === 0 ? "停用" : "启用"}${row.name}`, {
            type: "success"
          });
        }, 300);
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}角色`,
      props: {
        formInline: {
          name: row?.name ?? "",
          code: row?.code ?? "",
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
        function chores() {
          message(`您${title}了角色名称为${curData.name}的这条数据`, {
            type: "success"
          });
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            chores();
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
