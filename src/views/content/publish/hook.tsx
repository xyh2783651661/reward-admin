import { ref, reactive, computed, onScopeDispose } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getPublishPackagePage,
  getPublishPackageDetail,
  getPublishPlatformList,
  preparePublishPackage,
  generatePublishPackage,
  updatePublishContent,
  confirmPublishPackage,
  downloadPublishPackage,
  getPublishPackageExport,
  getPublishTask,
  publishTaskStreamUrl
} from "@/api/publish-package";
import type {
  PublishPackage,
  PublishPackageDetail,
  PublishPlatform,
  PublishTaskState
} from "@/api/publish-package";
import { subscribeSse } from "@/utils/sse";
import {
  getDailyImageByDate,
  getDailyImageThumbnailUrl
} from "@/api/daily-image";
import type { DailyImage } from "@/api/daily-image";
import type { PaginationProps, TableColumns } from "@pureadmin/table";
import type { SearchField } from "@/components/ReSearchBar/types";

/** 包状态中文标签 */
export const PACKAGE_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  generated: "已生成",
  ready: "待发布",
  publishing: "发布中",
  published: "已发布",
  failed: "发布失败"
};

/**
 * 任务进行中各平台状态的中文标签。
 *
 * skipped（跳过）与 failed（失败）分开标注是刻意的：
 * 跳过是因为平台未启用或人工改过且未强制重生成，属于预期行为，
 * 混进"失败"会让人误以为出了问题。
 */
export const TASK_PLATFORM_LABELS: Record<string, string> = {
  pending: "待生成",
  running: "生成中",
  success: "已生成",
  failed: "失败",
  skipped: "已跳过"
};

/** 选图方式中文标签 */
export const SELECT_MODE_LABELS: Record<string, string> = {
  manual: "人工指定",
  ai: "AI 选举",
  rule: "规则兜底"
};

/** 包状态 → Tag 类型 */
function getPackageStatusType(status?: string) {
  const map: Record<string, string> = {
    draft: "info",
    generated: "primary",
    ready: "success",
    publishing: "warning",
    published: "success",
    failed: "danger"
  };
  return status ? (map[status] ?? "info") : "info";
}

/** 时间格式化：后端 LocalDateTime 序列化为 ISO 字符串 */
function formatDateTime(v?: string | null) {
  if (!v) return "";
  return String(v)
    .replace("T", " ")
    .replace(/\.\d+$/, "")
    .slice(0, 19);
}

export function usePublishPackage() {
  // ========== 列表查询 ==========
  const loading = ref(false);
  const dataList = ref<PublishPackage[]>([]);
  const platformMap = ref<Record<string, PublishPlatform>>({});

  const form = reactive({
    status: "",
    current: 1,
    size: 10
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  /** 当前视图：列表 or 详情 */
  const view = ref<"list" | "detail">("list");
  const detail = ref<PublishPackageDetail | null>(null);
  const detailLoading = ref(false);

  /** 平台列表（按 sort_order 升序，来自后端） */
  const platforms = computed(() =>
    Object.values(platformMap.value).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    )
  );

  /**
   * 平台 Tab 列表：始终展示全部启用平台。
   * <p>
   * 不能按 detail.contents 过滤 —— contents 是「文案槽位」而非平台清单，
   * 未生成的平台本来就没有记录。若据此过滤，只生成一个平台后其余 Tab 会整体消失，
   * 用户再也点不到「重生成该平台」，只能靠强制重生成全量重跑。
   * 没有记录的平台在 Tab 上显示「待生成」即可。
   */
  function enabledPlatforms() {
    // 后端 list() 不传 onlyEnabled 时返回全部（含停用），这里按 enabled 收敛
    const hit = platforms.value.filter(p => p.enabled === 1);
    return hit.length ? hit : platforms.value;
  }

  async function loadPlatforms() {
    try {
      const { data } = await getPublishPlatformList();
      const map: Record<string, PublishPlatform> = {};
      (data ?? []).forEach(p => (map[p.code] = p));
      platformMap.value = map;
    } catch {
      platformMap.value = {};
    }
  }

  const columns = computed<TableColumns[]>(() => [
    { label: "业务日期", prop: "bizDate", minWidth: 120 },
    {
      label: "主题",
      prop: "theme",
      minWidth: 140,
      cellRenderer: ({ row }) => <span>{row.theme || "-"}</span>
    },
    {
      label: "选图方式",
      prop: "selectMode",
      minWidth: 110,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.selectMode === "manual" ? "warning" : "info"}
          effect="plain"
        >
          {SELECT_MODE_LABELS[row.selectMode] || row.selectMode || "-"}
        </el-tag>
      )
    },
    { label: "图片数", prop: "imageCount", minWidth: 90 },
    {
      label: "状态",
      prop: "status",
      minWidth: 110,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={getPackageStatusType(row.status)}
          effect="plain"
        >
          {PACKAGE_STATUS_LABELS[row.status] || row.status || "-"}
        </el-tag>
      )
    },
    {
      label: "确认时间",
      prop: "confirmedTime",
      minWidth: 170,
      cellRenderer: ({ row }) => (
        <span>
          {row.confirmedTime ? formatDateTime(row.confirmedTime) : "-"}
        </span>
      )
    },
    { label: "操作", fixed: "right", width: 200, slot: "operation" }
  ]);

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "status",
      label: "状态",
      type: "select",
      placeholder: "全部",
      options: Object.entries(PACKAGE_STATUS_LABELS).map(([value, label]) => ({
        label,
        value
      }))
    }
  ]);

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getPublishPackagePage({ ...form });
      dataList.value = data?.records ?? [];
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? form.size;
      pagination.currentPage = data?.current ?? form.current;
    } catch {
      dataList.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  function handleStatusChange() {
    form.current = 1;
    onSearch();
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    form.size = 10;
    onSearch();
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

  // ========== 详情 ==========
  /** 当日图片缓存：id → DailyImage，供详情页展示缩略图与署名信息 */
  const dayImageMap = ref<Record<number, DailyImage>>({});

  async function loadDayImages(date?: string) {
    if (!date) return;
    try {
      const { data } = await getDailyImageByDate<DailyImage>(date, 50);
      const map: Record<number, DailyImage> = {};
      (data?.records ?? []).forEach(img => (map[img.id] = img));
      dayImageMap.value = map;
    } catch {
      dayImageMap.value = {};
    }
  }

  async function openDetail(id: number) {
    view.value = "detail";
    detailLoading.value = true;
    try {
      const { data } = await getPublishPackageDetail(id);
      detail.value = data ?? null;
      await loadDayImages(data?.bizDate);
    } catch {
      detail.value = null;
    } finally {
      detailLoading.value = false;
    }
  }

  function backToList() {
    view.value = "list";
    detail.value = null;
    onSearch();
  }

  async function reloadDetail() {
    if (detail.value?.id) {
      await openDetail(detail.value.id);
    }
  }

  // ========== 异步任务进度 ==========
  /**
   * 当前进行中任务的最新状态。
   *
   * 选图与文案生成都是分��级的 LLM 调用。同步等待时界面像卡死，
   * 且进度无从得知；改为订阅 SSE 后进度实时回来，结束自动刷新详情。
   */
  const taskState = ref<PublishTaskState | null>(null);
  let stopWatchers: (() => void) | null = null;

  function stopWatch() {
    stopWatchers?.();
    stopWatchers = null;
  }

  /** 页面卸载时必须断开，否则 SSE 连接与轮询会留在后台。 */
  onScopeDispose(stopWatch);

  const isTerminal = (status?: string) =>
    status === "SUCCESS" || status === "FAILED";

  /** SSE 静默超过该时长（毫秒）即视为不可信，改用轮询补位 */
  const SSE_STALE_MS = 4000;
  /** 轮询连续失败达到该次数才放弃，避免网络瞬断就报错 */
  const MAX_POLL_FAILURES = 5;

  /**
   * 订阅任务进度直到终结。
   *
   * SSE 为主通道，轮询 getPublishTask 为兜底：
   * 连接被拒、被代理缓冲而收不到事件、或流提前断开时，进度仍能推进，
   * 不会出现「任务早跑完了，界面却一直卡在 0%」。
   *
   * @returns 终态快照；彻底拿不到进度时为 null
   */
  function watchTask(taskId: string): Promise<PublishTaskState | null> {
    stopWatch();
    return new Promise(resolve => {
      let settled = false;
      let lastEventAt = Date.now();
      let pollFailures = 0;
      let polling = false;

      // 终态可能从多个入口到达，只允许生效一次
      const settle = (state: PublishTaskState | null) => {
        if (settled) return;
        settled = true;
        stopWatch();
        resolve(state);
      };

      const apply = (state: PublishTaskState) => {
        lastEventAt = Date.now();
        taskState.value = state;
        if (isTerminal(state.status)) settle(state);
      };

      const stopStream = subscribeSse<PublishTaskState>(
        publishTaskStreamUrl(taskId),
        {
          onMessage: apply,
          onError: err => {
            console.warn("[publish] SSE 订阅失败，改用轮询：", err.message);
            lastEventAt = 0;
          },
          // 流结束却没收到终态，立刻让轮询接手确认
          onDone: () => {
            lastEventAt = 0;
          }
        }
      );

      const pollTimer = setInterval(async () => {
        if (settled || polling) return;
        if (Date.now() - lastEventAt < SSE_STALE_MS) return;
        polling = true;
        try {
          const { data } = await getPublishTask(taskId);
          if (data) {
            pollFailures = 0;
            apply(data);
          } else {
            pollFailures++;
          }
        } catch {
          pollFailures++;
        } finally {
          polling = false;
          lastEventAt = Date.now();
        }
        if (!settled && pollFailures >= MAX_POLL_FAILURES) {
          message("无法获取任务进度，请稍后刷新页面查看结果", {
            type: "warning"
          });
          settle(null);
        }
      }, 1500);

      stopWatchers = () => {
        stopStream();
        clearInterval(pollTimer);
      };
    });
  }

  /** 生成文案：platforms 为空表示全部启用平台 */
  const generating = ref(false);
  async function handleGenerate(platforms?: string[], force = false) {
    if (!detail.value?.id) return;
    generating.value = true;
    try {
      const { data } = await generatePublishPackage(detail.value.id, {
        platforms,
        force
      });
      if (!data?.taskId) return;
      taskState.value = data;

      const final = await watchTask(data.taskId);
      if (final?.status === "FAILED") {
        message(`生成失败：${final.error ?? "未知错误"}`, { type: "error" });
      } else if (final?.status === "SUCCESS") {
        // 部分平台失败不能直接报成功：只看总提示会漏发平台
        const failed = (final.platforms ?? []).filter(
          p => p.status === "failed"
        );
        if (failed.length) {
          message(
            `生成完成，但 ${failed
              .map(p => p.name || p.code)
              .join("、")} 未成功，可单独重试`,
            { type: "warning" }
          );
        } else {
          message("生成完成", { type: "success" });
        }
      }
      await reloadDetail();
    } finally {
      generating.value = false;
      taskState.value = null;
    }
  }

  /**
   * 强制重生成确认。
   * 人工改过的文案（edited=1）默认会被跳过，force=true 才会覆盖，
   * 因此这里必须让用户明确知晓后果。
   */
  async function handleForceRegenerate() {
    if (!detail.value?.id) return;
    const edited = (detail.value.contents ?? []).filter(
      c => c.edited === 1 && c.status === "generated"
    );
    if (!edited.length) {
      await handleGenerate(undefined, true);
      return;
    }
    const names = edited
      .map(c => platformMap.value[c.platformCode]?.name ?? c.platformCode)
      .join("、");
    try {
      await ElMessageBox.confirm(
        `以下平台的文案已被人工修改：${names}。强制重新生成会覆盖这些修改，是否继续？`,
        "覆盖人工修改",
        { type: "warning", confirmButtonText: "覆盖", cancelButtonText: "取消" }
      );
      await handleGenerate(undefined, true);
    } catch {
      // 用户取消
    }
  }

  const confirming = ref(false);
  async function handleConfirm() {
    if (!detail.value?.id) return;
    confirming.value = true;
    try {
      await confirmPublishPackage(detail.value.id);
      message("已确认，外部程序可领取该内容包", { type: "success" });
      await reloadDetail();
    } finally {
      confirming.value = false;
    }
  }

  // ========== 导出资源包 ==========
  const downloading = ref(false);

  /**
   * 下载资源包（ZIP：图片原图 + 各平台文案 + package.json）。
   * <p>
   * 这就是「发布」这个动作本身——系统交付一份标准产物，
   * 后续人工上传还是程序自动发布，都基于这同一份文件，不再回查 AI 记录。
   * 不传 pkg 时取当前详情页的包，因此在列表行和详情页都能直接调用。
   */
  async function handleDownload(pkg?: PublishPackage | null) {
    const target = pkg ?? detail.value;
    if (!target?.id) return;
    downloading.value = true;
    try {
      const blob = await downloadPublishPackage(target.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `publish-${target.bizDate ?? target.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 立即 revoke 在部分浏览器会中断尚未开始的下载，延后释放
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message("资源包已下载", { type: "success" });
    } catch {
      message("下载失败，请稍后重试", { type: "error" });
    } finally {
      downloading.value = false;
    }
  }

  /**
   * 导出结构化清单（JSON）到剪贴板。
   * <p>
   * 面向对接调试：程序自动发布时按这份结构取图片路径与文案，
   * 人也能直接看到完整字段，不用抓包。
   */
  async function handleExportJson(pkg?: PublishPackage | null) {
    const target = pkg ?? detail.value;
    if (!target?.id) return;
    try {
      const { data } = await getPublishPackageExport(target.id);
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      message("清单 JSON 已复制到剪贴板", { type: "success" });
    } catch {
      message("导出失败，请稍后重试", { type: "error" });
    }
  }

  // ========== 文案编辑 ==========
  const saving = ref<Record<string, boolean>>({});

  /** 按平台取文案 */
  function contentOf(code: string) {
    return (detail.value?.contents ?? []).find(c => c.platformCode === code);
  }

  async function saveContent(
    code: string,
    payload: { title?: string; content?: string; tags?: string[] }
  ) {
    if (!detail.value?.id) return;
    saving.value[code] = true;
    try {
      await updatePublishContent(detail.value.id, code, payload);
      message("已保存", { type: "success" });
      await reloadDetail();
    } finally {
      saving.value[code] = false;
    }
  }

  /**
   * 拼装一键复制文本：标题 + 正文 + 标签 + 版权署名。
   * 与后端 credit_line 的处理口径一致——有则附上，无则跳过。
   */
  function buildCopyText(code: string) {
    const c = contentOf(code);
    if (!c) return "";
    const parts: string[] = [];
    if (c.title) parts.push(c.title);
    if (c.content) parts.push(c.content);
    if (c.tags?.length) {
      parts.push(c.tags.map(t => (t.startsWith("#") ? t : `#${t}`)).join(" "));
    }
    if (c.creditLine) parts.push(c.creditLine);
    return parts.join("\n\n");
  }

  async function copyContent(code: string) {
    const text = buildCopyText(code);
    if (!text) {
      message("该平台暂无文案", { type: "warning" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message("已复制到剪贴板", { type: "success" });
    } catch {
      message("复制失败，请手动选择文本复制", { type: "error" });
    }
  }

  // ========== 换图抽屉 ==========
  const pickerVisible = ref(false);
  const pickerLoading = ref(false);
  const pickerImages = ref<DailyImage[]>([]);
  const pickerDate = ref<string>("");
  const pickerSelected = ref<number[]>([]);

  async function openPicker(date?: string) {
    pickerDate.value = date ?? detail.value?.bizDate ?? "";
    pickerVisible.value = true;
    pickerLoading.value = true;
    try {
      const { data } = await getDailyImageByDate<DailyImage>(
        pickerDate.value || undefined,
        50
      );
      pickerImages.value = data?.records ?? [];
      pickerSelected.value = (detail.value?.images ?? []).map(
        i => i.dailyImageId
      );
    } catch {
      pickerImages.value = [];
      pickerSelected.value = [];
    } finally {
      pickerLoading.value = false;
    }
  }

  function togglePickerImage(id: number) {
    const idx = pickerSelected.value.indexOf(id);
    if (idx >= 0) {
      pickerSelected.value.splice(idx, 1);
    } else {
      pickerSelected.value.push(id);
    }
  }

  /** 按当前勾选顺序提交；顺序即图文发布顺序 */
  const pickerSubmitting = ref(false);
  async function submitPicker() {
    if (!pickerSelected.value.length) {
      message("请至少选择一张图片", { type: "warning" });
      return;
    }
    pickerSubmitting.value = true;
    try {
      const { data } = await preparePublishPackage({
        date: pickerDate.value || undefined,
        imageIds: [...pickerSelected.value]
      });
      pickerVisible.value = false;
      if (!data?.taskId) return;
      taskState.value = data;

      const final = await watchTask(data.taskId);
      if (final?.status === "FAILED") {
        message(`选图失败：${final.error ?? "未知错误"}`, { type: "error" });
      } else if (final?.packageId) {
        // 接口现在返回任务而非详情，用回写的包 ID 重新拉一次
        await openDetail(final.packageId);
        message("选图已更新", { type: "success" });
      }
    } finally {
      pickerSubmitting.value = false;
      taskState.value = null;
    }
  }

  return {
    loading,
    dataList,
    columns,
    searchFields,
    form,
    pagination,
    onSearch,
    handleStatusChange,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    view,
    detail,
    detailLoading,
    platforms,
    platformMap,
    enabledPlatforms,
    loadPlatforms,
    openDetail,
    backToList,
    reloadDetail,
    taskState,
    watchTask,
    generating,
    handleGenerate,
    handleForceRegenerate,
    confirming,
    handleConfirm,
    downloading,
    handleDownload,
    handleExportJson,
    saving,
    contentOf,
    saveContent,
    buildCopyText,
    copyContent,
    pickerVisible,
    pickerLoading,
    pickerImages,
    pickerDate,
    pickerSelected,
    openPicker,
    togglePickerImage,
    submitPicker,
    pickerSubmitting,
    dayImageMap,
    formatDateTime,
    getDailyImageThumbnailUrl
  };
}

/** 当日可选图片行（抽屉里用） */
export type PickerImageItem = DailyImage;
