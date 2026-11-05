import { RA_DIALOG_WIDTH } from "@/constants";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPublishRecordStats } from "@/api/publish-record";
import { gotoPublishRecords } from "../publish-nav";
import { ElMessageBox } from "element-plus";
import { useCopyToClipboard } from "@pureadmin/utils";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import type { SearchField } from "@/components/ReSearchBar/types";
import { hasPerms } from "@/utils/auth";
import { getErrorMessage } from "@/utils/error";
import { message } from "@/utils/message";
import {
  createPublishPlatform,
  deletePublishPlatform,
  getPublishPlatformList,
  setPublishPlatformEnabled,
  updatePublishPlatform
} from "@/api/publish-package";
import type { PublishPlatform } from "@/api/publish-package";
import PlatformForm from "./form.vue";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_OPTIONS,
  ENABLED_OPTIONS,
  promptCodeOf
} from "./types";
import type { PublishPlatformFormData } from "./types";

const ASSET_TYPE_TAG_TYPES: Record<string, "primary" | "warning" | "info"> = {
  image: "primary",
  video: "warning"
};

/** 新建平台的默认约束，与后端 PublishPlatformRequest 默认值保持一致 */
function createDefaultForm(): PublishPlatformFormData {
  return {
    code: "",
    name: "",
    assetType: "image",
    titleMax: 20,
    contentMin: 20,
    contentMax: 100,
    tagMin: 3,
    tagMax: 8,
    toneHint: "",
    enabled: 1,
    sortOrder: 0,
    remark: ""
  };
}

function normalizeForm(row?: PublishPlatform | null): PublishPlatformFormData {
  if (!row) return createDefaultForm();
  return {
    ...row,
    titleMax: row.titleMax ?? 20,
    contentMin: row.contentMin ?? 20,
    contentMax: row.contentMax ?? 100,
    tagMin: row.tagMin ?? 3,
    tagMax: row.tagMax ?? 8,
    toneHint: row.toneHint ?? "",
    enabled: row.enabled ?? 1,
    sortOrder: row.sortOrder ?? 0,
    remark: row.remark ?? ""
  };
}

function formatRange(min?: number | null, max?: number | null, unit = "") {
  if (min == null && max == null) return "-";
  if (min == null) return `≤ ${max}${unit}`;
  if (max == null) return `≥ ${min}${unit}`;
  return `${min} - ${max}${unit}`;
}

export function usePublishPlatform() {
  const router = useRouter();
  const route = useRoute();
  const pagePath = route.path;
  const { update } = useCopyToClipboard();

  const loading = ref(false);
  const dataList = ref<PublishPlatform[]>([]);
  const toggling = ref<Record<number, boolean>>({});

  const form = reactive({
    keyword: "",
    assetType: "",
    enabled: ""
  });

  /** 从发布记录页点平台名跳过来时，用 keyword 直接定位到该平台 */
  function applyRouteQuery() {
    const keyword = route.query.keyword;
    if (typeof keyword === "string") form.keyword = keyword;
  }

  /**
   * 各平台近 30 天（后端默认区间）的发布结果。
   * 平台配置（字数、语气、启停）是否合适，要看它实际发布得怎么样，
   * 所以把成功 / 失败数直接放在配置旁边，并可一键进入对应记录。
   */
  const platformStats = ref<
    Record<string, { total: number; successCount: number; failedCount: number }>
  >({});

  async function loadStats() {
    try {
      const { data } = await getPublishRecordStats();
      platformStats.value = Object.fromEntries(
        (data?.platformStats ?? []).map(s => [s.platformCode, s])
      );
    } catch {
      // 统计只是辅助信息，拿不到不影响平台配置本身
      platformStats.value = {};
    }
  }

  function viewRecords(platformCode: string, status?: string) {
    gotoPublishRecords(router, { platformCode, status });
  }

  const filteredList = computed(() => {
    const keyword = form.keyword.trim().toLowerCase();
    return dataList.value.filter(item => {
      if (form.assetType && item.assetType !== form.assetType) return false;
      if (form.enabled !== "" && String(item.enabled) !== form.enabled) {
        return false;
      }
      if (!keyword) return true;
      return [item.name, item.code, item.remark, item.toneHint].some(value =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  });

  const columns: TableColumnList = [
    {
      label: "平台",
      prop: "name",
      minWidth: 180,
      align: "left",
      cellRenderer: ({ row }) => (
        <div class="flex min-w-0 flex-col leading-tight">
          <span class="truncate font-medium text-[var(--el-text-color-primary)]">
            {row.name || "-"}
          </span>
          <span class="truncate font-mono text-xs text-[var(--el-text-color-secondary)]">
            {row.code}
          </span>
        </div>
      )
    },
    {
      label: "素材类型",
      prop: "assetType",
      width: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={ASSET_TYPE_TAG_TYPES[row.assetType] ?? "info"}
          effect="plain"
        >
          {ASSET_TYPE_LABELS[row.assetType] ?? row.assetType ?? "-"}
        </el-tag>
      )
    },
    {
      label: "标题上限",
      prop: "titleMax",
      width: 100,
      formatter: row => (row.titleMax == null ? "-" : `${row.titleMax} 字`)
    },
    {
      label: "正文长度",
      prop: "contentMin",
      width: 130,
      formatter: row => formatRange(row.contentMin, row.contentMax, " 字")
    },
    {
      label: "话题标签",
      prop: "tagMin",
      width: 120,
      formatter: row => formatRange(row.tagMin, row.tagMax, " 个")
    },
    {
      label: "语气提示",
      prop: "toneHint",
      minWidth: 220,
      align: "left",
      showOverflowTooltip: true,
      formatter: row => row.toneHint || "-"
    },
    {
      label: "近 30 天发布",
      prop: "stats",
      width: 150,
      cellRenderer: ({ row }) => {
        const s = platformStats.value[row.code];
        if (!s?.total) {
          return (
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              暂无发布
            </span>
          );
        }
        return (
          <div class="flex items-center justify-center gap-3 text-xs">
            <el-link
              type="success"
              underline={false}
              onClick={() => viewRecords(row.code, "success")}
            >
              成功 {s.successCount}
            </el-link>
            {s.failedCount > 0 ? (
              <el-link
                type="danger"
                underline={false}
                onClick={() => viewRecords(row.code, "failed")}
              >
                失败 {s.failedCount}
              </el-link>
            ) : (
              <span class="text-[var(--el-text-color-secondary)]">失败 0</span>
            )}
          </div>
        );
      }
    },
    {
      label: "排序",
      prop: "sortOrder",
      width: 80
    },
    {
      label: "状态",
      prop: "enabled",
      width: 100,
      cellRenderer: ({ row }) =>
        hasPerms("publishPlatform:index:enable") ? (
          <el-switch
            modelValue={row.enabled === 1}
            loading={!!toggling.value[row.id]}
            onChange={(value: boolean) => handleToggle(row, value)}
          />
        ) : (
          <el-tag
            size="small"
            type={row.enabled === 1 ? "success" : "info"}
            effect="plain"
          >
            {row.enabled === 1 ? "启用" : "停用"}
          </el-tag>
        )
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 180,
      align: "left",
      showOverflowTooltip: true,
      formatter: row => row.remark || "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 330,
      slot: "operation"
    }
  ];

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "keyword",
      label: "关键字",
      type: "input",
      width: "lg",
      placeholder: "平台名称 / 代码 / 备注"
    },
    {
      prop: "assetType",
      label: "素材类型",
      type: "select",
      width: "sm",
      options: ASSET_TYPE_OPTIONS
    },
    {
      prop: "enabled",
      label: "状态",
      type: "select",
      width: "sm",
      options: ENABLED_OPTIONS
    }
  ]);

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getPublishPlatformList();
      dataList.value = (data ?? []).slice().sort((a, b) => {
        const bySort = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        return bySort !== 0 ? bySort : a.id - b.id;
      });
    } catch (error) {
      dataList.value = [];
      message(getErrorMessage(error, "加载发布平台失败"), { type: "error" });
    } finally {
      loading.value = false;
    }
    void loadStats();
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  }

  function copyPromptCode(row: PublishPlatform) {
    update(promptCodeOf(row.code));
    message(`提示词编码已复制：${promptCodeOf(row.code)}`, {
      type: "success"
    });
  }

  async function handleToggle(row: PublishPlatform, enabled: boolean) {
    if (toggling.value[row.id]) return;
    if (!enabled) {
      try {
        await ElMessageBox.confirm(
          `停用后，新建的内容包将不再为「${row.name}」生成文案，也不会出现在待发布列表中；已生成的文案和历史发布记录会保留。`,
          "停用发布平台",
          {
            confirmButtonText: "确认停用",
            cancelButtonText: "取消",
            type: "warning"
          }
        );
      } catch {
        return;
      }
    }
    toggling.value[row.id] = true;
    try {
      const result = await setPublishPlatformEnabled(row.id, enabled ? 1 : 0);
      if (result.code !== 200) {
        throw new Error(result.msg || "操作失败");
      }
      message(`已${enabled ? "启用" : "停用"}「${row.name}」`, {
        type: "success"
      });
      await onSearch();
    } catch (error) {
      message(getErrorMessage(error, "操作失败，请稍后重试"), {
        type: "error"
      });
    } finally {
      delete toggling.value[row.id];
    }
  }

  async function handleDelete(row: PublishPlatform) {
    try {
      const result = await deletePublishPlatform(row.id);
      if (result.code !== 200) {
        throw new Error(result.msg || "删除失败");
      }
      message(`已删除平台「${row.name}」`, { type: "success" });
      await onSearch();
    } catch (error) {
      message(getErrorMessage(error, "删除失败"), { type: "error" });
    }
  }

  /** 新增成功后用于提示去配置提示词的平台信息 */
  let registered: { name: string; code: string; msg?: string } | null = null;

  const { open } = useCrudDialog<PublishPlatformFormData>({
    title: "发布平台",
    formComponent: PlatformForm,
    width: RA_DIALOG_WIDTH.md,
    defaultForm: row => normalizeForm(row),
    // 平台代码有唯一索引，先在页面上拦一次，避免把数据库异常直接抛给运营
    buildPayload: data => {
      const payload: PublishPlatformFormData = {
        id: data.id,
        code: data.code.trim(),
        name: data.name.trim(),
        assetType: data.assetType,
        titleMax: data.titleMax,
        contentMin: data.contentMin,
        contentMax: data.contentMax,
        tagMin: data.tagMin,
        tagMax: data.tagMax,
        toneHint: data.toneHint?.trim() || "",
        enabled: data.enabled ?? 1,
        sortOrder: data.sortOrder ?? 0,
        remark: data.remark?.trim() || ""
      };
      const duplicated = dataList.value.some(
        item => item.code === payload.code && item.id !== payload.id
      );
      if (duplicated) {
        throw new Error(`平台代码「${payload.code}」已存在`);
      }
      return payload;
    },
    submitApi: async (payload, mode) => {
      const { id, ...body } = payload;
      if (mode === "修改") {
        if (id == null) throw new Error("平台 ID 缺失，无法更新");
        return updatePublishPlatform(id, body);
      }
      const result = await createPublishPlatform(body);
      if (result.code === 200) {
        registered = { name: body.name, code: body.code, msg: result.msg };
      }
      return result;
    }
  });

  function promptAfterRegister() {
    if (!registered) return;
    const { name, code, msg } = registered;
    registered = null;
    const tip =
      msg ||
      `平台「${name}」已注册，请确认提示词 ${promptCodeOf(code)} 已配置。`;
    ElMessageBox.confirm(
      `${tip}\n\n是否前往「AI 提示词」检查或补充该平台的文案模板？`,
      "平台已注册",
      {
        confirmButtonText: "去配置提示词",
        cancelButtonText: "稍后处理",
        type: "success"
      }
    )
      .then(() => router.push("/ai/prompt/index"))
      .catch(() => {});
  }

  function openDialog(row?: PublishPlatform) {
    void open(row?.id ? "修改" : "新增", row, async () => {
      await onSearch();
      promptAfterRegister();
    });
  }

  onMounted(() => {
    applyRouteQuery();
    onSearch();
  });

  // 页面被缓存复用时不会重新 mounted，从其他页面再次跳入靠 query 变化接力
  watch(
    () => route.query,
    () => {
      if (route.path !== pagePath) return;
      form.keyword = "";
      applyRouteQuery();
    }
  );

  return {
    loading,
    dataList,
    filteredList,
    form,
    searchFields,
    columns,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleToggle,
    copyPromptCode,
    viewRecords,
    formatRange
  };
}
