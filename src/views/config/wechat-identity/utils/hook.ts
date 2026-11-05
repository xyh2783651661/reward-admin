import { ref, reactive, h, onMounted } from "vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { addDialog } from "@/components/ReDialog";
import type { SearchField } from "@/components/ReSearchBar/types";
import { useCrudTable } from "../../composables";
import rebindForm from "../form.vue";
import {
  getWeChatIdentityPage,
  rebindWeChatIdentity,
  unbindWeChatIdentity,
  getMiniSharedMode,
  updateMiniSharedMode,
  type WeChatIdentityRow
} from "@/api/reward-wechat";
import { getRewardUserPage } from "@/api/reward";

/**
 * 微信用户绑定关系。
 *
 * 交互一致性：表格/搜索/弹窗全部复用项目既有件
 * （useCrudTable + ReSearchBar + addDialog），
 * 不自己写「填数字 userId」的输入框 —— 目标用户一律从下拉里选。
 */
export function useWeChatIdentity() {
  /** Reward 用户下拉（改挂、筛选共用） */
  const userOptions = ref<Array<{ label: string; value: number }>>([]);
  const userOptionsLoading = ref(false);

  const {
    form,
    loading,
    dataList,
    pagination,
    onSearch,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  } = useCrudTable({
    searchApi: getWeChatIdentityPage,
    deleteApi: unbindWeChatIdentity,
    defaultForm: { keyword: "", userId: "" as number | "" },
    deleteMessage: () => "已解绑该微信身份"
  });

  const searchFields: SearchField[] = [
    {
      prop: "keyword",
      label: "关键字",
      type: "input",
      placeholder: "昵称 / 微信标识片段"
    },
    {
      prop: "userId",
      label: "Reward 用户",
      type: "select",
      options: [],
      filterable: true,
      placeholder: "全部用户"
    }
  ];

  /** 搜索栏里的用户下拉用同一份数据（Select 需要 options 在 fields 上） */
  async function loadUserOptions() {
    userOptionsLoading.value = true;
    try {
      const res = await getRewardUserPage({ current: 1, size: 200 });
      const records = res?.data?.records ?? [];
      userOptions.value = records.map(u => ({
        value: u.id,
        label: `${u.nickName || "未命名用户"}（ID ${u.id}）`
      }));
      const userField = searchFields.find(f => f.prop === "userId");
      if (userField) userField.options = userOptions.value;
    } catch (e) {
      // 下拉加载失败不阻断列表：清空即可，用户仍可用关键字查
      userOptions.value = [];
      message(getErrorMessage(e, "加载用户列表失败"), { type: "error" });
    } finally {
      userOptionsLoading.value = false;
    }
  }

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 90 },
    {
      label: "Reward 用户",
      prop: "userId",
      minWidth: 180,
      cellRenderer: ({ row }) =>
        h("span", null, [
          h("span", null, row.nickName || "未命名用户"),
          h(
            "span",
            {
              style: "color: var(--el-text-color-secondary); margin-left: 6px"
            },
            `ID ${row.userId}`
          )
        ])
    },
    {
      label: "注册来源",
      prop: "registerSource",
      width: 130,
      cellRenderer: ({ row }) =>
        row.registerSource === "WECHAT_MINI" ? "小程序注册" : "历史用户"
    },
    { label: "微信标识（脱敏）", prop: "openidMasked", minWidth: 180 },
    { label: "AppID", prop: "appId", minWidth: 180 },
    { label: "绑定时间", prop: "createdTime", minWidth: 170 },
    { label: "操作", slot: "operation", fixed: "right", width: 170 }
  ];

  /** 改挂：弹窗选择目标用户，不再手填 id */
  function openRebind(row: WeChatIdentityRow) {
    const formRef = ref();
    addDialog({
      title: "改挂微信身份",
      width: "560px",
      hideFooter: false,
      props: { row, userOptions: userOptions.value },
      contentRenderer: () =>
        h(rebindForm, { ref: formRef, row, userOptions: userOptions.value }),
      beforeSure: async done => {
        const targetUserId = await formRef.value?.submit();
        if (!targetUserId) return;
        try {
          await rebindWeChatIdentity(row.id, targetUserId);
          message(`已改挂到 userId=${targetUserId}`, { type: "success" });
          done();
          onSearch();
        } catch (e) {
          message(getErrorMessage(e, "改挂失败"), { type: "error" });
        }
      }
    });
  }

  function handleUnbind(row: WeChatIdentityRow) {
    handleDelete(row);
  }

  // ---------------- 单用户兼容模式 ----------------
  const modeLoading = ref(false);
  const modeSaving = ref(false);
  const mode = reactive({ enabled: true, userId: 1 });

  async function loadMode() {
    modeLoading.value = true;
    try {
      const res = await getMiniSharedMode();
      if (res?.data) {
        mode.enabled = res.data.enabled;
        mode.userId = res.data.userId ?? 1;
      }
    } catch (e) {
      message(getErrorMessage(e, "读取开关失败"), { type: "error" });
    } finally {
      modeLoading.value = false;
    }
  }

  async function saveMode() {
    if (mode.enabled && !mode.userId) {
      message("开启时必须选择归属用户", { type: "warning" });
      return;
    }
    modeSaving.value = true;
    try {
      await updateMiniSharedMode({
        enabled: mode.enabled,
        userId: mode.userId
      });
      message(
        mode.enabled
          ? `已开启：之后所有微信登录都归属到该用户`
          : "已关闭：恢复「一个微信一个账号」",
        { type: "success" }
      );
      await loadMode();
    } catch (e) {
      message(getErrorMessage(e, "保存失败"), { type: "error" });
    } finally {
      modeSaving.value = false;
    }
  }

  onMounted(() => {
    loadUserOptions();
    loadMode();
  });

  /**
   * 重置：useCrudTable 的 resetForm 依赖传入的 formEl（ReSearchBar 不会传），
   * 直接透会导致点了没反应。这里自行清空条件并回到第一页。
   */
  function onReset() {
    form.keyword = "";
    form.userId = "";
    form.current = 1;
    onSearch();
  }

  return {
    // 列表
    form,
    loading,
    dataList,
    pagination,
    columns,
    searchFields,
    onSearch,
    onReset,
    handleSizeChange,
    handleCurrentChange,
    loadUserOptions,
    // 行操作
    openRebind,
    handleUnbind,
    // 开关
    mode,
    modeLoading,
    modeSaving,
    saveMode,
    userOptions,
    userOptionsLoading
  };
}
