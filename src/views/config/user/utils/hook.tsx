import dayjs from "dayjs";
import editForm from "../form.vue";
import roleForm from "../role.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { addDialog } from "@/components/ReDialog";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import ReStatusSwitch from "@/components/ReStatusSwitch/index.vue";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  addRewardUser,
  deleteRewardUser,
  getRewardUserPage,
  getRoleIds,
  resetPwdRewardUser,
  updateRewardUser
} from "@/api/system";
import { getUserOptions, getRoleAll } from "@/api/rbac";
import { useCrudTable } from "../../composables";
import { computed, reactive, ref, h, onMounted } from "vue";
import userAvatar from "@/assets/user.jpg";
import ReCropperPreview from "@/components/ReCropperPreview";
import { ElForm, ElInput, ElFormItem, ElProgress } from "element-plus";

export function useRewardUser() {
  const avatarInfo = ref();
  const ruleFormRef = ref();
  const cropRef = ref();
  const roleOptions = ref<Array<{ id: any; roleName: string }>>([]);
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
    searchApi: getRewardUserPage,
    deleteApi: deleteRewardUser,
    defaultForm: {
      nickName: "",
      avatar: "",
      phone: "",
      birthday: "",
      role: "",
      status: ""
    },
    deleteMessage: row => `已删除用户「${row.nickName}」`
  });

  const searchFields = computed<SearchField[]>(() => [
    { prop: "nickName", label: "昵称", type: "input" },
    { prop: "birthday", label: "生日", type: "date" },
    {
      prop: "status",
      label: "状态",
      type: "select",
      width: "sm",
      options: statusOptions.value
    },
    {
      prop: "role",
      label: "角色",
      type: "select",
      options: roleOptions.value.map(o => ({ label: o.roleName, value: o.id }))
    }
  ]);

  // 重置的新密码
  const pwdForm = reactive({ newPwd: "" });
  const pwdProgress = [
    { color: "#e74242", text: "非常弱" },
    { color: "#EFBD47", text: "弱" },
    { color: "#ffa500", text: "一般" },
    { color: "#1bbf1b", text: "强" },
    { color: "#008000", text: "非常强" }
  ];
  const curScore = ref();

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    { label: "昵称", prop: "nickName", minWidth: 120 },
    {
      label: "生日",
      prop: "birthday",
      minWidth: 110,
      formatter: ({ birthday }) =>
        birthday ? dayjs(birthday).format("YYYY-MM-DD") : "-"
    },
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
            scope.row.nickName
          }</strong>吗?`}
          onChange={async ({ row, value, next }) => {
            try {
              const r = await updateRewardUser({ id: row.id, status: value });
              if (r.code !== 200) throw new Error(r.msg || "状态更新失败");
              message(`已${value === 1 ? "启用" : "停用"}${row.nickName}`, {
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
      label: "头像",
      prop: "avatar",
      cellRenderer: ({ row }) => (
        <el-image
          fit="cover"
          preview-teleported={true}
          src={row.avatar || userAvatar}
          preview-src-list={Array.of(row.avatar || userAvatar)}
          class="w-[24px] h-[24px] rounded-full align-middle"
        />
      ),
      width: 90
    },
    {
      label: "手机号",
      prop: "phone",
      minWidth: 130,
      formatter: ({ phone }) => phone || "-"
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
    { label: "操作", fixed: "right", width: 180, slot: "operation" }
  ];

  const buttonClass = [
    "h-[20px]!",
    "reset-margin",
    "text-gray-500!",
    "dark:text-white!",
    "dark:hover:text-primary!"
  ];

  const { open } = useCrudDialog<FormItemProps>({
    title: "用户",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      nickName: row?.nickName ?? "",
      avatar: row?.avatar ?? "",
      phone: row?.phone ?? "",
      birthday: row?.birthday ?? "",
      status: row?.status ?? 1
    }),
    submitApi: (payload, mode) =>
      mode === "新增" ? addRewardUser(payload) : updateRewardUser(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => onSearch());
  }

  /** 上传头像 */
  function handleUpload(row) {
    addDialog({
      title: "裁剪、上传头像",
      width: "680px",
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      sureBtnLoading: true,
      contentRenderer: () =>
        h(ReCropperPreview, {
          ref: cropRef,
          imgSrc: row.avatar || userAvatar,
          onCropper: info => (avatarInfo.value = info)
        }),
      beforeSure: done => {
        done();
        onSearch();
      },
      closeCallBack: () => cropRef.value?.hidePopover()
    });
  }

  /** 重置密码 */
  function handleReset(row) {
    addDialog({
      title: `重置 ${row.nickName} 用户的密码`,
      width: "480px",
      draggable: true,
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
      sureBtnLoading: true,
      contentRenderer: () => (
        <>
          <ElForm ref={ruleFormRef} model={pwdForm}>
            <ElFormItem
              prop="newPwd"
              rules={[
                { required: true, message: "请输入新密码", trigger: "blur" }
              ]}
            >
              <ElInput
                clearable
                show-password
                type="password"
                v-model={pwdForm.newPwd}
                placeholder="请输入新密码"
              />
            </ElFormItem>
          </ElForm>
          <div class="my-4 flex">
            {pwdProgress.map(({ color, text }, idx) => (
              <div
                class="w-[19vw]"
                style={{ marginLeft: idx !== 0 ? "4px" : 0 }}
              >
                <ElProgress
                  striped
                  striped-flow
                  duration={curScore.value === idx ? 6 : 0}
                  percentage={curScore.value >= idx ? 100 : 0}
                  color={color}
                  stroke-width={10}
                  show-text={false}
                />
                <p
                  class="text-center"
                  style={{ color: curScore.value === idx ? color : "" }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </>
      ),
      closeCallBack: () => (pwdForm.newPwd = ""),
      beforeSure: async (done, { closeLoading }) => {
        try {
          const valid = await ruleFormRef.value?.validate().catch(() => false);
          if (!valid) {
            closeLoading();
            return;
          }
          const r = await resetPwdRewardUser({
            id: row.id,
            password: pwdForm.newPwd
          });
          if (r.code !== 200) throw new Error(r.msg || "重置密码失败");
          message(`已重置 ${row.nickName} 用户的密码`, { type: "success" });
          done();
          onSearch();
        } catch (error) {
          closeLoading();
          message(getErrorMessage(error, "重置密码失败"), { type: "error" });
        }
      }
    });
  }

  /** 分配角色 */
  async function handleRole(row) {
    let ids: Array<number | string> = [];
    try {
      ids = (await getRoleIds({ userId: row.id })).data ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载用户角色失败"), { type: "error" });
      return;
    }
    addDialog({
      title: `分配 ${row.nickName} 用户的角色`,
      props: {
        formInline: {
          nickName: row?.nickName ?? "",
          roleOptions: roleOptions.value ?? [],
          ids
        }
      },
      width: "480px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () => h(roleForm),
      beforeSure: done => {
        done();
      }
    });
  }

  async function loadUserOptions() {
    try {
      const { data } = await getUserOptions();
      statusOptions.value = data?.statusOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载状态选项失败"), { type: "error" });
    }
    try {
      const { data } = await getRoleAll();
      roleOptions.value = (data ?? []) as Array<{ id: any; roleName: string }>;
    } catch (error) {
      message(getErrorMessage(error, "加载角色列表失败"), { type: "error" });
    }
  }

  onMounted(() => {
    loadUserOptions();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    searchFields,
    buttonClass,
    handleUpload,
    handleReset,
    handleRole,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
