import dayjs from "dayjs";
import { h, ref, computed } from "vue";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import type { SearchField } from "@/components/ReSearchBar/types";
import { addDialog } from "@/components/ReDialog";
import editForm from "../form.vue";
import detailComp from "../detail.vue";
import versionHistoryComp from "../components/VersionHistory.vue";
import testRenderComp from "../components/TestRenderDialog.vue";
import {
  getAiPromptPage,
  getAiPromptDetail,
  deleteAiPrompt,
  exportAiPromptList,
  refreshAiPromptCache
} from "@/api/prompt";
import { useDownload } from "@/hooks/useDownload";
import { saveBlob } from "@/utils/download";
import { useCrudTable } from "@/views/config/composables/useCrudTable";
import { STATUS_MAP, DEFAULT_PROMPT_FORM } from "./types";
import type { AiPromptFormData } from "./types";

export function useAiPrompt() {
  const formRef = ref();

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
      builtin: undefined as number | undefined,
      keyword: ""
    },
    deleteMessage: row => `已删除「${row.name || row.code}」`
  });

  // 选中的行（用于批量导出）
  const selectedRows = ref<any[]>([]);
  function onSelectionChange(rows: any[]) {
    selectedRows.value = rows || [];
  }

  // 导出走项目统一的 download.ts + useDownload.ts 分层（transport + UI/loading/幂等）
  const { loading: exportLoading, run: runExportTask } = useDownload();

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
    { label: "操作", fixed: "right", width: 360, slot: "operation" }
  ];

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "keyword",
      label: "关键词",
      type: "input",
      placeholder: "编码/名称/内容"
    },
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
    },
    {
      prop: "builtin",
      label: "来源",
      type: "select",
      width: "sm",
      options: [
        { value: 1, label: "内置" },
        { value: 0, label: "自建" }
      ]
    }
  ]);

  /** 新建/编辑：全屏弹层，footer 确定触发 beforeSure 提交 */
  function openDialog(row?: any) {
    const isEdit = !!row?.id;

    const open = (formInline: AiPromptFormData) => {
      addDialog({
        title: isEdit ? "编辑提示词" : "新建提示词",
        fullscreen: true,
        fullscreenIcon: true,
        closeOnClickModal: false,
        contentRenderer: () =>
          h(editForm, { ref: formRef, formInline, isEdit }),
        beforeSure: async (done, { closeLoading }) => {
          const ok = await formRef.value?.handleSubmit();
          if (ok) {
            done();
            onSearch();
          } else {
            closeLoading();
          }
        }
      });
    };

    if (!isEdit) {
      open({ ...DEFAULT_PROMPT_FORM });
      return;
    }

    getAiPromptDetail(row.id)
      .then(({ data }) => {
        open({
          id: data.id,
          code: data.code,
          name: data.name,
          category: data.category,
          scene: data.scene ?? "",
          content: data.content,
          contentFormat: data.contentFormat ?? "text",
          language: data.language ?? "zh",
          modelHint: data.modelHint ?? "",
          variablesSchema: data.variablesSchema ?? "",
          outputSchema: data.outputSchema ?? "",
          status: data.status,
          sortOrder: data.sortOrder ?? 0,
          tags: data.tags ?? "",
          remark: data.remark ?? ""
        });
      })
      .catch(e => {
        message(getErrorMessage(e, "加载提示词失败"), { type: "error" });
      });
  }

  /** 详情：全屏弹层，props 传数据 */
  function openDetail(row: any) {
    getAiPromptDetail(row.id)
      .then(({ data }) => {
        addDialog({
          title: data.name || data.code || "提示词详情",
          fullscreen: true,
          fullscreenIcon: true,
          hideFooter: true,
          contentRenderer: () => h(detailComp, { record: data })
        });
      })
      .catch(e => {
        message(getErrorMessage(e, "加载提示词详情失败"), { type: "error" });
      });
  }

  /** 版本历史：展示所有历史快照并支持回滚（回滚前二次确认） */
  function openVersionHistory(row: any) {
    addDialog({
      title: `版本历史 · ${row.name || row.code}`,
      width: "960px",
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () =>
        h(versionHistoryComp, { record: row, onReverted: onSearch })
    });
  }

  /** 测试渲染：按 variables_schema 生成变量骨架，调用后端真实渲染 */
  function openTestRender(row: any) {
    addDialog({
      title: `测试渲染 · ${row.name || row.code}`,
      width: "720px",
      closeOnClickModal: false,
      hideFooter: true,
      contentRenderer: () => h(testRenderComp, { record: row })
    });
  }

  function handleSearch() {
    form.current = 1;
    onSearch();
  }

  /**
   * 导出 JSON。
   * 优先使用选中的行；未选中时导出当前过滤条件下的全部。
   * 通过 useDownload 获得 loading / 幂等 / 统一错误提示，落盘复用 download.ts 的 saveBlob。
   */
  async function handleExport() {
    const ids =
      selectedRows.value.length > 0
        ? selectedRows.value.map(r => r.id)
        : undefined;
    await runExportTask(
      async () => {
        const blob = await exportAiPromptList(ids);
        const today = dayjs().format("YYYYMMDD");
        const fileName =
          ids && ids.length > 0
            ? `ai_prompts_selected_${today}.json`
            : `ai_prompts_all_${today}.json`;
        // 导出接口返回 JSON 文件流（Content-Type: application/json），
        // 与「200 + JSON 错误体」无法区分，故不走 runExport 的 isErrorResponse 探测，
        // 直接用 transport 层 saveBlob 落盘（后端错误以 400/500 非 2xx 返回，会被 run 的异常分支捕获）。
        saveBlob(blob as Blob, fileName);
      },
      { successText: "导出已生成" }
    );
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
    openDialog,
    openDetail,
    openVersionHistory,
    openTestRender,
    handleSearch,
    handleExport,
    handleRefreshAll,
    exportLoading
  };
}
