import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import roleForm from "../role.vue";
import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  addRewardUser,
  deleteRewardUser,
  getRewardUserPage,
  getRoleIds,
  // getRoleMenu,
  // getRoleMenuIds,
  resetPwdRewardUser,
  updateRewardUser
} from "@/api/system";
import {
  mockLoadTreeData,
  mockRoleMenuCheckedIds
} from "../../composables/mockData";
import { useCrudTable, useTreePanel } from "../../composables";
import { type Ref, reactive, ref, h } from "vue";
import userAvatar from "@/assets/user.jpg";
import ReCropperPreview from "@/components/ReCropperPreview";
import {
  ElForm,
  ElInput,
  ElFormItem,
  ElProgress,
  ElMessageBox
} from "element-plus";

export function useRewardUser(treeRef: Ref) {
  const formRef = ref();
  const switchLoadMap = ref({});
  const avatarInfo = ref();
  const ruleFormRef = ref();
  const cropRef = ref();
  const roleOptions = ref([]);
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
    searchApi: getRewardUserPage,
    deleteApi: deleteRewardUser,
    defaultForm: {
      nickName: "",
      avatar: "",
      phone: "",
      birthday: "",
      status: ""
    },
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
    { label: "ID", prop: "id" },
    { label: "昵称", prop: "nickName", minWidth: 80 },
    {
      label: "生日",
      prop: "birthday",
      minWidth: 100,
      formatter: ({ birthday }) => dayjs(birthday).format("YYYY-MM-DD")
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
    { label: "手机号", prop: "phone" },
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
    { label: "操作", fixed: "right", width: 180, slot: "operation" }
  ];

  const buttonClass = [
    "h-[20px]!",
    "reset-margin",
    "text-gray-500!",
    "dark:text-white!",
    "dark:hover:text-primary!"
  ];

  function handleUpdate(_row) {}

  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.status === 0 ? "停用" : "启用"
      }</strong><strong style='color:var(--el-color-primary)'>${
        row.nickName
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
          updateRewardUser({ id: row.id, status: row.status }).then(r => {
            if (r.code === 200) {
              message(
                `已${row.status === 0 ? "停用" : "启用"}${row.nickName}`,
                { type: "success" }
              );
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
    addDialog({
      title: `${title}配置`,
      props: {
        formInline: {
          id: row?.id ?? "",
          nickName: row?.nickName ?? "",
          avatar: row?.avatar ?? "",
          phone: row?.phone ?? "",
          birthday: row?.birthday ?? ""
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
          message(`您${title}了用户为${curData.nickName}的这条数据`, {
            type: "success"
          });
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            const api = title === "新增" ? addRewardUser : updateRewardUser;
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

  /** 上传头像 */
  function handleUpload(row) {
    addDialog({
      title: "裁剪、上传头像",
      width: "40%",
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
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
      closeCallBack: () => cropRef.value.hidePopover()
    });
  }

  /** 重置密码 */
  function handleReset(row) {
    addDialog({
      title: `重置 ${row.nickName} 用户的密码`,
      width: "30%",
      draggable: true,
      closeOnClickModal: false,
      fullscreen: deviceDetection(),
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
      beforeSure: done => {
        ruleFormRef.value.validate(valid => {
          if (valid) {
            resetPwdRewardUser({ id: row.id, password: pwdForm.newPwd })
              .then(r => {
                if (r.code === 200) {
                  message(`重置 ${row.nickName} 用户的密码,${r.msg}`, {
                    type: "success"
                  });
                } else {
                  message(`重置 ${row.nickName} 用户的密码,${r.msg}`, {
                    type: "error"
                  });
                }
              })
              .catch(r => {
                message(`重置 ${row.nickName} 用户的密码,${r.msg}`, {
                  type: "error"
                });
              })
              .finally(() => {
                done();
                onSearch();
              });
          }
        });
      }
    });
  }

  /** 分配角色 */
  async function handleRole(row) {
    const ids = (await getRoleIds({ userId: row.id })).data ?? [];
    addDialog({
      title: `分配 ${row.nickName} 用户的角色`,
      props: {
        formInline: {
          nickName: row?.nickName ?? "",
          roleOptions: roleOptions.value ?? [],
          ids
        }
      },
      width: "400px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(roleForm),
      beforeSure: done => {
        done();
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
    handleUpdate,
    buttonClass,
    handleUpload,
    handleReset,
    handleRole,
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
