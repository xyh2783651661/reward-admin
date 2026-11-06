import { computed, h, reactive, ref, toRaw } from "vue";
import dayjs from "dayjs";
import type { PaginationProps } from "@pureadmin/table";
import { deviceDetection } from "@pureadmin/utils";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { addDialog } from "@/components/ReDialog";
import { RA_DIALOG_WIDTH, RA_PAGINATION } from "@/constants";
import {
  buildCapabilityOptions,
  buildProviderOptions,
  getCapabilityMeta,
  getProviderLabel
} from "@/constants/ai-provider";
import {
  getProviderModelPage,
  saveProviderModelManual,
  syncProviderModels,
  updateProviderModelCapabilities
} from "@/api/ai-provider-model";
import ManualModelDialog from "../components/manual-model-dialog.vue";
import CapabilityDialog from "../components/capability-dialog.vue";
import type { SearchField } from "@/components/ReSearchBar/types";
import type {
  CapabilityForm,
  ManualModelForm,
  ModelSyncResult,
  ProviderModelItem,
  ProviderModelPageReq
} from "../types";

const EMPTY_MANUAL_FORM: ManualModelForm = {
  provider: "",
  modelName: "",
  displayName: "",
  capabilities: []
};

const providerOptions = buildProviderOptions();
const capabilityOptions = buildCapabilityOptions();

const availableOptions = [
  { label: "可用", value: true },
  { label: "已下线", value: false }
];

const SOURCE_META: Record<
  string,
  { label: string; tagType: "info" | "warning" }
> = {
  SYNC: { label: "同步", tagType: "info" },
  MANUAL: { label: "手工", tagType: "warning" }
};

export function useProviderModel() {
  const form = reactive<ProviderModelPageReq>({
    current: 1,
    size: RA_PAGINATION.pageSize,
    provider: "",
    capability: "",
    keyword: "",
    available: ""
  });
  const dataList = ref<ProviderModelItem[]>([]);
  const loading = ref(true);
  const syncLoading = ref(false);
  const syncDialogVisible = ref(false);
  const syncResults = ref<ModelSyncResult[]>([]);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: RA_PAGINATION.pageSize,
    currentPage: 1,
    background: true
  });

  /** 是否处于筛选状态（用于区分「没有数据」和「筛选无结果」） */
  const hasFilter = computed(
    () =>
      Boolean(form.provider) ||
      Boolean(form.capability) ||
      Boolean(form.keyword) ||
      form.available !== ""
  );

  const columns: TableColumnList = [
    {
      label: "供应商",
      prop: "provider",
      minWidth: 140,
      cellRenderer: ({ row }) => (
        <div>
          <div class="font-medium">{getProviderLabel(row.provider)}</div>
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            {row.provider}
          </div>
        </div>
      )
    },
    {
      label: "模型 ID",
      prop: "modelName",
      minWidth: 260,
      cellRenderer: ({ row }) => <span class="font-mono">{row.modelName}</span>
    },
    {
      label: "展示名",
      prop: "displayName",
      minWidth: 180,
      showOverflowTooltip: true,
      formatter: ({ displayName }) => displayName || "-"
    },
    {
      label: "能力",
      prop: "capabilities",
      minWidth: 230,
      cellRenderer: ({ row }) => {
        const capabilities: string[] = row.capabilities ?? [];
        if (!capabilities.length) return <span>-</span>;
        return (
          <div class="flex flex-wrap gap-1">
            {capabilities.map(capability => {
              const meta = getCapabilityMeta(capability);
              return (
                <el-tag
                  size="small"
                  effect="plain"
                  type={meta?.tagType ?? "info"}
                >
                  {meta?.label ?? capability}
                </el-tag>
              );
            })}
          </div>
        );
      }
    },
    {
      label: "来源",
      prop: "source",
      width: 90,
      align: "center",
      cellRenderer: ({ row }) => {
        const meta = SOURCE_META[row.source];
        return (
          <el-tag size="small" effect="plain" type={meta?.tagType ?? "info"}>
            {meta?.label ?? row.source ?? "-"}
          </el-tag>
        );
      }
    },
    {
      label: "可用",
      prop: "available",
      width: 90,
      align: "center",
      cellRenderer: ({ row }) => (
        <el-tag
          size="small"
          effect="plain"
          type={row.available ? "success" : "info"}
        >
          {row.available ? "可用" : "已下线"}
        </el-tag>
      )
    },
    {
      label: "最近同步",
      prop: "lastSeenTime",
      width: 168,
      formatter: ({ lastSeenTime }) => formatDateTime(lastSeenTime)
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      width: 168,
      formatter: ({ updatedTime }) => formatDateTime(updatedTime)
    },
    {
      label: "操作",
      fixed: "right",
      width: 110,
      slot: "operation"
    }
  ];

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "provider",
      label: "供应商",
      type: "select",
      filterable: true,
      options: providerOptions
    },
    {
      prop: "capability",
      label: "能力",
      type: "select",
      options: capabilityOptions
    },
    { prop: "keyword", label: "模型名", type: "input", width: "lg" },
    {
      prop: "available",
      label: "可用状态",
      type: "select",
      width: "sm",
      options: availableOptions
    }
  ]);

  async function onSearch() {
    loading.value = true;
    try {
      const { data } =
        await getProviderModelPage<ProviderModelItem>(buildQuery());
      dataList.value = data?.records ?? [];
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? form.size;
      pagination.currentPage = data?.current ?? form.current;
    } catch (error) {
      dataList.value = [];
      pagination.total = 0;
      message(getErrorMessage(error, "加载模型目录失败"), { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  /** 后端 available 为 Boolean，空字符串会导致绑定失败，这里按需剔除 */
  function buildQuery() {
    const query: Record<string, unknown> = {
      current: form.current,
      size: form.size
    };
    if (form.provider) query.provider = form.provider;
    if (form.capability) query.capability = form.capability;
    if (form.keyword) query.keyword = form.keyword.trim();
    if (form.available !== "") query.available = form.available;
    return query;
  }

  function resetForm(formEl) {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    onSearch();
  }

  async function handleSync(provider?: string) {
    const targetLabel = provider
      ? getProviderLabel(provider)
      : "全部已配置供应商";
    try {
      await ElMessageBox.confirm(
        provider
          ? `确认同步「${targetLabel}」的模型列表？本次未返回的模型会被标记为已下线。`
          : "确认同步全部已配置供应商的模型列表？会逐家请求供应商 /models 接口，可能耗时较长。",
        "同步模型目录",
        {
          confirmButtonText: "开始同步",
          cancelButtonText: "取消",
          type: "warning",
          draggable: true
        }
      );
    } catch {
      return;
    }

    syncLoading.value = true;
    try {
      const { data } = await syncProviderModels<ModelSyncResult>(provider);
      syncResults.value = data ?? [];
      syncDialogVisible.value = true;
      if (!syncResults.value.length) {
        message("没有可同步的供应商，请先确认供应商已配置 API Key", {
          type: "warning"
        });
      }
      await onSearch();
    } catch (error) {
      message(getErrorMessage(error, "同步模型目录失败"), { type: "error" });
    } finally {
      syncLoading.value = false;
    }
  }

  function openManualDialog() {
    const dialogRef = ref();
    const formInline: ManualModelForm = {
      ...EMPTY_MANUAL_FORM,
      provider: form.provider || ""
    };

    addDialog({
      title: "手工补录模型",
      props: { formInline },
      width: RA_DIALOG_WIDTH.md,
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(ManualModelDialog, { ref: dialogRef, formInline }),
      beforeSure: (done, { closeLoading }) => {
        const FormRef = dialogRef.value?.getRef();
        if (!FormRef) {
          closeLoading();
          return;
        }

        FormRef.validate(async valid => {
          if (!valid) {
            closeLoading();
            return;
          }

          try {
            const result = await saveProviderModelManual({
              provider: formInline.provider,
              modelName: formInline.modelName.trim(),
              displayName: formInline.displayName?.trim() || undefined,
              capabilities: toRaw(formInline.capabilities)
            });
            if (result.code !== 200) {
              throw new Error(result.msg || "补录失败");
            }
            message("补录成功，配置页已可选中该模型", { type: "success" });
            done();
            await onSearch();
          } catch (error) {
            closeLoading();
            message(getErrorMessage(error, "补录失败"), { type: "error" });
          }
        });
      }
    });
  }

  function openCapabilityDialog(row: ProviderModelItem) {
    const dialogRef = ref();
    const formInline: CapabilityForm = {
      id: row.id,
      provider: row.provider,
      modelName: row.modelName,
      capabilities: [...(row.capabilities ?? [])]
    };

    addDialog({
      title: "修正模型能力",
      props: { formInline },
      width: RA_DIALOG_WIDTH.md,
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(CapabilityDialog, { ref: dialogRef, formInline }),
      beforeSure: (done, { closeLoading }) => {
        const FormRef = dialogRef.value?.getRef();
        if (!FormRef) {
          closeLoading();
          return;
        }

        FormRef.validate(async valid => {
          if (!valid) {
            closeLoading();
            return;
          }

          try {
            const result = await updateProviderModelCapabilities(
              formInline.id,
              toRaw(formInline.capabilities)
            );
            if (result.code !== 200) {
              throw new Error(result.msg || "修正失败");
            }
            message("能力标签已修正，该模型不再被同步覆盖", {
              type: "success"
            });
            done();
            await onSearch();
          } catch (error) {
            closeLoading();
            message(getErrorMessage(error, "修正能力失败"), { type: "error" });
          }
        });
      }
    });
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
    searchFields,
    loading,
    columns,
    dataList,
    pagination,
    hasFilter,
    providerOptions,
    syncLoading,
    syncDialogVisible,
    syncResults,
    onSearch,
    resetForm,
    handleSync,
    openManualDialog,
    openCapabilityDialog,
    handleSizeChange,
    handleCurrentChange
  };
}

function formatDateTime(value?: string) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}
