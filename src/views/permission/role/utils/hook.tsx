import editForm from "../form.vue";
import permForm from "../perm-form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import { deviceDetection } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";
import {
  getRolePage,
  addRole,
  updateRole,
  deleteRole,
  getMenuTree,
  getRoleDetail,
  assignRoleMenus,
  type SysRoleVo,
  type SysRoleReq,
  type SysMenuVo
} from "@/api/rbac";
import { h, reactive, ref } from "vue";

export function useRole() {
  const formRef = ref();
  const permFormRef = ref();
  const loading = ref(true);
  const dataList = ref<SysRoleVo[]>([]);
  const menuTree = ref<SysMenuVo[]>([]);

  const form = reactive<SysRoleReq>({
    roleName: "",
    roleCode: "",
    status: undefined,
    current: 1,
    size: 10
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    { label: "角色编码", prop: "roleCode", minWidth: 120 },
    { label: "角色名称", prop: "roleName", minWidth: 120 },
    {
      label: "状态",
      prop: "status",
      width: 90,
      cellRenderer: ({ row }) => (
        <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
          {row.status === 1 ? "启用" : "禁用"}
        </el-tag>
      )
    },
    { label: "备注", prop: "remark", minWidth: 160 },
    { label: "创建时间", prop: "createdTime", minWidth: 160 },
    { label: "操作", fixed: "right", width: 220, slot: "operation" }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getRolePage(form);
      dataList.value = data.records ?? [];
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } catch {
      dataList.value = [];
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    onSearch();
  };

  async function loadMenuTree() {
    if (menuTree.value.length === 0) {
      const { data } = await getMenuTree();
      menuTree.value = data ?? [];
    }
  }

  function openDialog(title = "新增", row?: SysRoleVo) {
    const isEdit = title !== "新增" && row?.id !== undefined;
    const formInline: SysRoleReq = isEdit
      ? {
          id: row.id,
          roleCode: row.roleCode,
          roleName: row.roleName,
          status: row.status ?? 1,
          remark: row.remark ?? ""
        }
      : {
          roleCode: "",
          roleName: "",
          status: 1,
          remark: ""
        };

    addDialog({
      title: `${title}角色`,
      props: {
        formInline
      },
      width: "680px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as SysRoleReq;

        if (!FormRef) {
          closeLoading();
          return;
        }

        FormRef.validate(async (valid: boolean) => {
          if (!valid) {
            closeLoading();
            return;
          }

          try {
            const result = isEdit
              ? await updateRole(curData)
              : await addRole(curData);

            if (result.code !== 200) {
              throw new Error(result.msg || `${title}失败`);
            }

            message(`${title}角色成功`, { type: "success" });
            done();
            await onSearch();
          } catch (error) {
            closeLoading();
            message(
              error instanceof Error && error.message
                ? error.message
                : `${title}失败`,
              { type: "error" }
            );
          }
        });
      }
    });
  }

  async function openPerm(row: SysRoleVo) {
    try {
      await loadMenuTree();
      const { data: detail } = await getRoleDetail(row.id);
      const checkedKeys: number[] = detail.menuIds ?? [];

      addDialog({
        title: `分配菜单权限（${row.roleName}）`,
        props: {
          menuTree: menuTree.value,
          checkedKeys
        },
        width: "680px",
        draggable: true,
        fullscreen: deviceDetection(),
        fullscreenIcon: true,
        closeOnClickModal: false,
        sureBtnLoading: true,
        contentRenderer: () =>
          h(permForm, {
            ref: permFormRef,
            menuTree: menuTree.value,
            checkedKeys
          }),
        beforeSure: async (done, { closeLoading }) => {
          const checked = permFormRef.value?.getCheckedKeys() ?? [];
          const half = permFormRef.value?.getHalfCheckedKeys() ?? [];

          try {
            const result = await assignRoleMenus({
              roleId: row.id,
              menuIds: [...checked, ...half]
            });

            if (result.code !== 200) {
              throw new Error(result.msg || "权限保存失败");
            }

            message("权限保存成功", { type: "success" });
            done();
          } catch (error) {
            closeLoading();
            message(
              error instanceof Error && error.message
                ? error.message
                : "权限保存失败",
              { type: "error" }
            );
          }
        }
      });
    } catch (error) {
      message(
        error instanceof Error && error.message
          ? error.message
          : "加载权限数据失败",
        { type: "error" }
      );
    }
  }

  async function handleDelete(row: SysRoleVo) {
    try {
      const result = await deleteRole(row.id);
      if (result.code !== 200) {
        throw new Error(result.msg || "删除失败");
      }
      message("删除成功", { type: "success" });
      await onSearch();
    } catch (error) {
      message(
        error instanceof Error && error.message ? error.message : "删除失败",
        { type: "error" }
      );
    }
  }

  function handleSizeChange(val: number) {
    form.size = val;
    form.current = 1;
    onSearch();
  }
  function handleCurrentChange(val: number) {
    form.current = val;
    onSearch();
  }

  void onSearch();

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    openDialog,
    openPerm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  };
}
