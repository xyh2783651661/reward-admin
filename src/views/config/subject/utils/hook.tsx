import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  addRewardSubject,
  deleteRewardSubject,
  getRewardSubjectList,
  // getRoleMenu,
  // getRoleMenuIds,
  updateRewardSubject
} from "@/api/system";
import {
  mockLoadTreeData,
  mockRoleMenuCheckedIds
} from "../../composables/mockData";
import { useCrudTable, useTreePanel } from "../../composables";
import { type Ref, ref, h } from "vue";

export function useRewardSubject(treeRef: Ref) {
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
    searchApi: getRewardSubjectList,
    deleteApi: deleteRewardSubject,
    defaultForm: { name: "", type: "", stage: "", status: "" }
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
    { label: "ID", prop: "id" },
    { label: "科目", prop: "name", minWidth: 80 },
    { label: "类型", prop: "type", minWidth: 100 },
    { label: "学段", prop: "stage", minWidth: 80 },
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
    { label: "基础", prop: "base" },
    { label: "卓越", prop: "excellence" },
    { label: "满分", prop: "full" },
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
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
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
          updateRewardSubject({ id: row.id, status: row.status }).then(r => {
            if (r.code === 200) {
              message(`已${row.status === 0 ? "停用" : "启用"}${row.name}`, {
                type: "success"
              });
              onSearch();
            }
          });
        }, 300);
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    const formInlineData = {
      id: row?.id ?? "",
      name: row?.name ?? "",
      type: row?.type ?? "",
      stage: row?.stage ?? "",
      base: row?.base ?? "",
      full: row?.full ?? "",
      excellence: row?.excellence ?? ""
    };
    addDialog({
      title: `${title}配置`,
      props: { formInline: formInlineData },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(editForm, { ref: formRef, formInline: formInlineData }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        function chores() {
          message(`您${title}了科目为${curData.name}的这条数据`, {
            type: "success"
          });
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            const api =
              title === "新增" ? addRewardSubject : updateRewardSubject;
            api(curData)
              .then(r => {
                message(r.msg, { type: r.code === 200 ? "success" : "error" });
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
