import dayjs from "dayjs";
import { h, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  getAiPromptPage,
  deleteAiPrompt,
  exportAiPromptList,
  refreshAiPromptCache
} from "@/api/prompt";
import { useCrudTable } from "@/views/config/composables/useCrudTable";
import { STATUS_MAP } from "./types";

export function useAiPrompt() {
  const router = useRouter();

  const {
    form,
    loading,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  } = useCrudTable({
    searchApi: getAiPromptPage,
    deleteApi: deleteAiPrompt,
    defaultForm: {
      code: "",
      name: "",
      category: "",
      status: undefined as number | undefined,
      keyword: ""
    },
    deleteMessage: row => `已删除「${row.name || row.code}」`
  });

  // 选中的行（用于批量导出）
  const selectedRows = ref<any[]>([]);
  function onSelectionChange(rows: any[]) {
    selectedRows.value = rows || [];
  }

  const columns: TableColumnList = [
    { type: "selection", width: 44, fixed: "left" },
    { label: "编码", prop: "code", minWidth: 180, showOverflowTooltip: true },
    { label: "名称", prop: "name", minWidth: 150, showOverflowTooltip: true },
    {
      label: "分类",
      prop: "category",
      minWidth: 100,
      cellRenderer: ({ row }) => h("span", row.category || "-")
    },
    {
      label: "版本",
      prop: "version",
      minWidth: 70,
      align: "center"
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 80,
      align: "center",
      cellRenderer: ({ row }) =>
        h(
          "el-tag",
          { type: STATUS_MAP[row.status]?.tag ?? "info", size: "small" },
          STATUS_MAP[row.status]?.label ?? String(row.status ?? "-")
        )
    },
    {
      label: "语言",
      prop: "language",
      minWidth: 80,
      align: "center"
    },
    {
      label: "内置",
      prop: "builtin",
      minWidth: 70,
      align: "center",
      cellRenderer: ({ row }) =>
        h(
          "el-tag",
          { type: row.builtin === 1 ? "warning" : "info", size: "small" },
          row.builtin === 1 ? "内置" : "自建"
        )
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 160,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 220, slot: "operation" }
  ];

  const searchFields = computed<SearchField[]>(() => [
    { prop: "code", label: "编码", type: "input" },
    { prop: "name", label: "名称", type: "input" },
    {
      prop: "category",
      label: "分类",
      type: "input",
      placeholder: "如 email/reward"
    },
    {
      prop: "status",
      label: "状态",
      type: "select",
      width: "sm",
      options: [
        { value: 1, label: "启用" },
        { value: 0, label: "禁用" }
      ]
    }
  ]);

  function goCreate() {
    router.push("/ai/prompt/create");
  }
  function goEdit(row: any) {
    router.push(`/ai/prompt/edit/${row.id}`);
  }
  function goDetail(row: any) {
    router.push(`/ai/prompt/detail/${row.id}`);
  }

  function handleSearch() {
    form.current = 1;
    onSearch();
  }

  /**
   * 导出 JSON。
   * 优先使用选中的行；未选中时导出当前过滤条件下的全部。
   */
  async function handleExport() {
    try {
      const ids =
        selectedRows.value.length > 0
          ? selectedRows.value.map(r => r.id)
          : undefined;
      const blob = await exportAiPromptList(ids);
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement("a");
      a.href = url;
      const today = dayjs().format("YYYYMMDD");
      a.download =
        ids && ids.length > 0
          ? `ai_prompts_selected_${today}.json`
          : `ai_prompts_all_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message("导出已生成", { type: "success" });
    } catch (e) {
      message(getErrorMessage(e, "导出失败"), { type: "error" });
    }
  }

  /** 刷新提示词缓存（全局） */
  async function handleRefreshAll() {
    try {
      await ElMessageBox.confirm(
        "将清空所有提示词缓存并从数据库重新加载。",
        "刷新提示词缓存",
        {
          confirmButtonText: "确认刷新",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      const r: any = await refreshAiPromptCache();
      if (r.code === 200) {
        message("缓存已刷新", { type: "success" });
      } else {
        message(r.msg || "刷新失败", { type: "error" });
      }
    } catch {
      // 用户取消
    }
  }

  return {
    form,
    loading,
    dataList,
    pagination,
    columns,
    searchFields,
    selectedRows,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    onSelectionChange,
    goCreate,
    goEdit,
    goDetail,
    handleSearch,
    handleExport,
    handleRefreshAll
  };
}
