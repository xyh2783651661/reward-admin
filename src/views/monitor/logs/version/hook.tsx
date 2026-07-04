import dayjs from "dayjs";
import {
  getRewardApkVersionsList,
  publishRewardApkVersion,
  yankRewardApkVersion,
  updateRewardApkRelease
} from "@/api/reward";
import { type Ref, reactive, ref, onMounted, toRaw, h } from "vue";
import { ElMessage, ElMessageBox, ElTag } from "element-plus";
import { addDialog } from "@/components/ReDialog/index";
import ReleaseForm from "./form.vue";
import type { PaginationProps } from "@pureadmin/table";

/** 状态 → 标签类型/文案 */
const STATE_META: Record<
  string,
  { text: string; type: "success" | "warning" | "info" | "danger" | "primary" }
> = {
  DRAFT: { text: "草稿", type: "info" },
  BETA: { text: "灰度", type: "warning" },
  STABLE: { text: "稳定", type: "success" },
  YANKED: { text: "已撤回", type: "danger" }
};

const FORCE_META: Record<string, string> = {
  OPTIONAL: "可选",
  RECOMMENDED: "推荐",
  FORCE: "强制"
};

export function useVersionLog(_tableRef?: Ref) {
  const form = reactive({
    versionName: "",
    versionCode: "",
    requestTime: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 70
    },
    {
      label: "Code",
      prop: "versionCode",
      minWidth: 90
    },
    {
      label: "版本号",
      prop: "versionName",
      minWidth: 120
    },
    {
      label: "状态",
      prop: "state",
      minWidth: 90,
      cellRenderer: ({ row }) => {
        const meta = STATE_META[row.state] ?? {
          text: row.state ?? "-",
          type: "info"
        };
        return h(ElTag, { type: meta.type, effect: "light" }, () => meta.text);
      }
    },
    {
      label: "灰度%",
      prop: "rolloutPercentage",
      minWidth: 80,
      formatter: ({ rolloutPercentage }) =>
        rolloutPercentage == null ? "-" : `${rolloutPercentage}%`
    },
    {
      label: "强制策略",
      prop: "forceUpdate",
      minWidth: 90,
      formatter: ({ forceUpdate }) => FORCE_META[forceUpdate] ?? "可选"
    },
    {
      label: "最低版本",
      prop: "minClientVersionCode",
      minWidth: 90,
      formatter: ({ minClientVersionCode }) => minClientVersionCode ?? "-"
    },
    {
      label: "分支",
      prop: "branch",
      minWidth: 90
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 200,
      slot: "operation"
    }
  ];

  function handleSizeChange(val: number) {
    form.size = val;
    form.current = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    form.current = val;
    onSearch();
  }

  async function onSearch() {
    loading.value = true;
    const { data } = await getRewardApkVersionsList(toRaw(form));
    dataList.value = data.records;
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;

    setTimeout(() => {
      loading.value = false;
    }, 500);
  }

  /** 发布为稳定版（全量） */
  async function handlePublish(row) {
    try {
      await ElMessageBox.confirm(
        `确定将版本 ${row.versionName ?? row.versionCode} 发布为稳定版（全量推送）？`,
        "发版确认",
        {
          type: "warning",
          confirmButtonText: "确定发布",
          cancelButtonText: "取消"
        }
      );
    } catch {
      return;
    }
    try {
      await publishRewardApkVersion(row.id);
      ElMessage.success("已发布为稳定版");
      onSearch();
    } catch {
      ElMessage.error("发布失败");
    }
  }

  /** 撤回版本 */
  async function handleYank(row) {
    try {
      await ElMessageBox.confirm(
        `确定撤回版本 ${row.versionName ?? row.versionCode}？撤回后该版客户端将被判定必须升级且不可下载。`,
        "撤回确认",
        {
          type: "warning",
          confirmButtonText: "确定撤回",
          cancelButtonText: "取消"
        }
      );
    } catch {
      return;
    }
    try {
      await yankRewardApkVersion(row.id);
      ElMessage.success("已撤回");
      onSearch();
    } catch {
      ElMessage.error("撤回失败");
    }
  }

  /** 灰度 / 策略编辑弹窗 */
  function handleEditRelease(row) {
    const formRef = ref();
    addDialog({
      title: "版本发布策略",
      width: "520px",
      contentRenderer: () =>
        h(ReleaseForm, {
          ref: formRef,
          formInline: {
            id: row.id,
            versionName: row.versionName,
            rolloutPercentage: row.rolloutPercentage ?? 0,
            forceUpdate: row.forceUpdate ?? "OPTIONAL",
            minClientVersionCode: row.minClientVersionCode ?? undefined,
            releaseNotes: row.releaseNotes ?? ""
          }
        }),
      beforeSure: async done => {
        const payload = formRef.value?.getFormData?.() ?? {};
        try {
          await updateRewardApkRelease(row.id, {
            rolloutPercentage: payload.rolloutPercentage,
            forceUpdate: payload.forceUpdate,
            minClientVersionCode: payload.minClientVersionCode,
            releaseNotes: payload.releaseNotes
          });
          ElMessage.success("已更新发布策略");
          done();
          onSearch();
        } catch {
          ElMessage.error("更新失败");
        }
      }
    });
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    handlePublish,
    handleYank,
    handleEditRelease
  };
}
