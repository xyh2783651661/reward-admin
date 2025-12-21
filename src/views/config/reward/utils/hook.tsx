import dayjs from "dayjs";
import editForm from "../form.vue";
import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "../../hooks";
import { transformI18n } from "@/plugins/i18n";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import type { PaginationProps } from "@pureadmin/table";
import { getKeyList, deviceDetection } from "@pureadmin/utils";
import { getRewardConfigList, getRoleMenu, getRoleMenuIds } from "@/api/system";
import { type Ref, reactive, ref, onMounted, h, toRaw, watch } from "vue";

export function useRole(treeRef: Ref) {
  const form = reactive({
    description: "",
    rewardType: "",
    rewardKey: "",
    rewardValue: "",
    status: "",
    current: 1,
    size: 10
  });
  const curRow = ref();
  const formRef = ref();
  const dataList = ref([]);
  const treeIds = ref([]);
  const treeData = ref([]);
  const isShow = ref(false);
  const loading = ref(true);
  const isLinkage = ref(false);
  const treeSearchValue = ref();
  const switchLoadMap = ref({});
  const isExpandAll = ref(false);
  const isSelectAll = ref(false);
  const { switchStyle } = usePublicHooks();
  const treeProps = {
    value: "id",
    label: "title",
    children: "children"
  };
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id"
    },
    {
      label: "KEY",
      prop: "rewardKey",
      minWidth: 160
    },
    {
      label: "类型",
      prop: "rewardType"
    },
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
    {
      label: "数值",
      prop: "rewardValue"
    },
    {
      label: "说明",
      prop: "description",
      minWidth: 100
    },
    {
      label: "创建时间",
      prop: "createTime",
      minWidth: 160,
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 140,
      slot: "operation"
    }
  ];
  // const buttonClass = computed(() => {
  //   return [
  //     "h-[20px]!",
  //     "reset-margin",
  //     "text-gray-500!",
  //     "dark:text-white!",
  //     "dark:hover:text-primary!"
  //   ];
  // });

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
          {
            loading: true
          }
        );
        setTimeout(() => {
          switchLoadMap.value[index] = Object.assign(
            {},
            switchLoadMap.value[index],
            {
              loading: false
            }
          );
          message(`已${row.status === 0 ? "停用" : "启用"}${row.rewardKey}`, {
            type: "success"
          });
        }, 300);
      })
      .catch(() => {
        row.status === 0 ? (row.status = 1) : (row.status = 0);
      });
  }

  function handleDelete(row) {
    message(`您删除了ID为${row.id}的这条数据`, {
      type: "success"
    });
    onSearch();
  }

  function handleSizeChange(val: number) {
    console.log(`${val} items per page`);
    form.size = val;
    form.current = 1; // 切换 pageSize 时重置到第一页
    onSearch();
  }

  function handleCurrentChange(val: number) {
    console.log(`current page: ${val}`);
    form.current = val;
    onSearch();
  }

  function handleSelectionChange(val) {
    console.log("handleSelectionChange", val);
  }

  async function onSearch() {
    loading.value = true;
    const { data } = await getRewardConfigList(toRaw(form));
    dataList.value = data.records;
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;

    setTimeout(() => {
      loading.value = false;
    }, 500);
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}配置`,
      props: {
        formInline: {
          rewardKey: row?.rewardKey ?? "",
          rewardType: row?.rewardType ?? "",
          rewardValue: row?.rewardValue ?? "",
          description: row?.description ?? ""
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
          message(`您${title}了角色名称为${curData.rewardKey}的这条数据`, {
            type: "success"
          });
          done(); // 关闭弹框
          onSearch(); // 刷新表格数据
        }
        FormRef.validate(valid => {
          if (valid) {
            console.log("curData", curData);
            // 表单规则校验通过
            if (title === "新增") {
              // 实际开发先调用新增接口，再进行下面操作
              chores();
            } else {
              // 实际开发先调用修改接口，再进行下面操作
              chores();
            }
          }
        });
      }
    });
  }

  /** 菜单权限 */
  async function handleMenu(row?: any) {
    const { id } = row;
    if (id) {
      curRow.value = row;
      isShow.value = true;
      const { data } = await getRoleMenuIds({ id });
      treeRef.value.setCheckedKeys(data);
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  /** 高亮当前权限选中行 */
  function rowStyle({ row: { id } }) {
    return {
      cursor: "pointer",
      background: id === curRow.value?.id ? "var(--el-fill-color-light)" : ""
    };
  }

  /** 菜单权限-保存 */
  function handleSave() {
    const { id, name } = curRow.value;
    // 根据用户 id 调用实际项目中菜单权限修改接口
    console.log(id, treeRef.value.getCheckedKeys());
    message(`角色名称为${name}的菜单权限修改成功`, {
      type: "success"
    });
  }

  /** 数据权限 可自行开发 */
  // function handleDatabase() {}

  const onQueryChanged = (query: string) => {
    treeRef.value!.filter(query);
  };

  const filterMethod = (query: string, node) => {
    return transformI18n(node.title)!.includes(query);
  };

  onMounted(async () => {
    onSearch();
    const { data } = await getRoleMenu();
    treeIds.value = getKeyList(data, "id");
    treeData.value = handleTree(data);
  });

  watch(isExpandAll, val => {
    val
      ? treeRef.value.setExpandedKeys(treeIds.value)
      : treeRef.value.setExpandedKeys([]);
  });

  watch(isSelectAll, val => {
    val
      ? treeRef.value.setCheckedKeys(treeIds.value)
      : treeRef.value.setCheckedKeys([]);
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
    // buttonClass,
    onSearch,
    resetForm,
    openDialog,
    handleMenu,
    handleSave,
    handleDelete,
    filterMethod,
    transformI18n,
    onQueryChanged,
    // handleDatabase,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
