import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  addRewardConfig,
  deleteRewardConfig,
  exportRewardConfigList,
  getRewardConfigList,
  // getRoleMenu,
  // getRoleMenuIds,
  updateRewardConfig
} from "@/api/system";
import {
  mockLoadTreeData,
  mockRoleMenuCheckedIds
} from "../../composables/mockData";
import { useCrudTable, useTreePanel, useTableExport } from "../../composables";
import { type Ref, ref, h } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";

export function useRewardConfig(treeRef: Ref) {
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
    searchApi: getRewardConfigList,
    deleteApi: deleteRewardConfig,
    defaultForm: {
      description: "",
      rewardType: "",
      rewardKey: "",
      rewardValue: "",
      status: ""
    }
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

  const { exportLoading, exportExcel } = useTableExport(
    exportRewardConfigList,
    "奖励配置.xlsx",
    () => form
  );

  const columns: TableColumnList = [
    { label: "ID", prop: "id" },
    { label: "KEY", prop: "rewardKey", minWidth: 280, sortable: true },
    { label: "类型", prop: "rewardType", sortable: true },
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
    { label: "数值", prop: "rewardValue", sortable: true },
    { label: "说明", prop: "description", minWidth: 120 },
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
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      sortable: true,
      formatter: ({ createdTime }) =>
        dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 160,
      sortable: true,
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
        row.rewardKey
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
          updateRewardConfig({ id: row.id, status: row.status }).then(r => {
            if (r.code === 200) {
              message(
                `已${row.status === 0 ? "停用" : "启用"}${row.rewardKey}`,
                { type: "success" }
              );
            }
          });
        }, 300);
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}配置`,
      props: {
        formInline: {
          id: row?.id ?? "",
          rewardKey: row?.rewardKey ?? "",
          rewardType: row?.rewardType ?? "",
          rewardValue: row?.rewardValue ?? "",
          description: row?.description ?? "",
          condition: row?.condition ?? ""
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
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            const api = title === "新增" ? addRewardConfig : updateRewardConfig;
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
    exportLoading,
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
    exportExcel,
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
