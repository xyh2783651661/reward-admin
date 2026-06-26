import editForm from "../form.vue";
import pwdForm from "../pwd-form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import { deviceDetection } from "@pureadmin/utils";
import type { PaginationProps } from "@pureadmin/table";
import {
  getUserPage,
  addUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getRoleAll,
  getUserDetail,
  type SysUserVo,
  type SysUserReq,
  type SysRoleVo
} from "@/api/rbac";
import { h, reactive, ref } from "vue";

export function useUser() {
  const formRef = ref();
  const pwdFormRef = ref();
  const loading = ref(true);
  const dataList = ref<SysUserVo[]>([]);
  const roleOptions = ref<SysRoleVo[]>([]);

  const form = reactive<SysUserReq>({
    username: "",
    nickname: "",
    phone: "",
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
    { label: "用户名", prop: "username", minWidth: 120 },
    { label: "昵称", prop: "nickname", minWidth: 120 },
    { label: "手机号", prop: "phone", minWidth: 120 },
    { label: "邮箱", prop: "email", minWidth: 160 },
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
    { label: "备注", prop: "remark", minWidth: 120 },
    { label: "创建时间", prop: "createdTime", minWidth: 160 },
    { label: "操作", fixed: "right", width: 250, slot: "operation" }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getUserPage(form);
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

  async function loadRoles() {
    if (roleOptions.value.length === 0) {
      const { data } = await getRoleAll();
      roleOptions.value = data ?? [];
    }
  }

  async function openDialog(title = "新增", row?: SysUserVo) {
    const isEdit = title !== "新增" && row?.id !== undefined;
    let formInline: SysUserReq;

    await loadRoles();

    if (isEdit && row?.id !== undefined) {
      const { data: detail } = await getUserDetail(row.id);
      formInline = {
        id: detail.id,
        username: detail.username,
        password: "",
        nickname: detail.nickname ?? "",
        avatar: detail.avatar ?? "",
        phone: detail.phone ?? "",
        email: detail.email ?? "",
        status: detail.status ?? 1,
        remark: detail.remark ?? "",
        roleIds: detail.roleIds ?? []
      };
    } else {
      formInline = {
        username: "",
        password: "",
        nickname: "",
        avatar: "",
        phone: "",
        email: "",
        status: 1,
        remark: "",
        roleIds: []
      };
    }

    addDialog({
      title: `${title}用户`,
      props: {
        formInline,
        roleOptions: roleOptions.value
      },
      width: "720px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline,
          roleOptions: roleOptions.value
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as SysUserReq;

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
              ? await updateUser(curData)
              : await addUser(curData);

            if (result.code !== 200) {
              throw new Error(result.msg || `${title}失败`);
            }

            message(`${title}用户成功`, { type: "success" });
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

  function openPwd(row: SysUserVo) {
    addDialog({
      title: `重置密码（${row.username}）`,
      props: {},
      width: "480px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(pwdForm, {
          ref: pwdFormRef
        }),
      beforeSure: async (done, { closeLoading }) => {
        const pwdData = pwdFormRef.value?.getRef();

        if (!pwdData?.password) {
          closeLoading();
          message("请输入新密码", { type: "warning" });
          return;
        }

        if (pwdData.password !== pwdData.confirm) {
          closeLoading();
          message("两次密码不一致", { type: "warning" });
          return;
        }

        try {
          const result = await resetUserPassword({
            id: row.id,
            password: pwdData.password
          });

          if (result.code !== 200) {
            throw new Error(result.msg || "密码重置失败");
          }

          message("密码重置成功", { type: "success" });
          done();
        } catch (error) {
          closeLoading();
          message(
            error instanceof Error && error.message
              ? error.message
              : "密码重置失败",
            { type: "error" }
          );
        }
      }
    });
  }

  async function handleDelete(row: SysUserVo) {
    try {
      const result = await deleteUser(row.id);
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
    openPwd,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  };
}
