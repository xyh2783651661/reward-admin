import { ref, reactive, computed, onMounted, onUnmounted, toRaw } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox, ElNotification } from "element-plus";
import { openImageViewer } from "@/components/ReImageViewer";
import {
  getDailyImagePage,
  getDailyImageDetail,
  uploadDailyImage,
  deleteDailyImage,
  batchDeleteDailyImage,
  batchDownloadDailyImages,
  getBatchDownloadLinks,
  updateDailyImageRemark,
  getDailyImageThumbnailUrl,
  getDailyImagePreviewUrl,
  getDailyImageDownloadUrl
} from "@/api/daily-image";
import type { PaginationProps } from "@pureadmin/table";

export type DailyImageItem = {
  id: number;
  originalName?: string;
  source?: string;
  fileSize?: number;
  extension?: string;
  remark?: string;
  [key: string]: any;
};

export type UploadTask = {
  uid: number;
  name: string;
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
};

export type GridDensity = "large" | "medium" | "small";

const DENSITY_STORAGE_KEY = "daily-image-grid-density";

export function useDailyImage() {
  // ========== 列表与查询 ==========
  const loading = ref(true);
  const dataList = ref<DailyImageItem[]>([]);

  const form = reactive({
    source: "",
    current: 1,
    size: 30
  });

  /** 前端关键字过滤（后端分页接口暂不支持 keyword，仅筛选当前页） */
  const keyword = ref("");

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 30,
    currentPage: 1,
    background: true
  });

  /** 当前展示列表（关键字前端过滤后） */
  const filteredList = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    if (!kw) return dataList.value;
    return dataList.value.filter(item => {
      const name = (item.originalName || "").toLowerCase();
      const remark = (item.remark || "").toLowerCase();
      return name.includes(kw) || remark.includes(kw);
    });
  });

  let searchSeq = 0;
  async function onSearch() {
    const seq = ++searchSeq;
    loading.value = true;
    try {
      const { data } = await getDailyImagePage(toRaw(form));
      if (seq !== searchSeq) return;
      dataList.value = data?.records ?? [];
      selectedIds.value = selectedIds.value.filter(id =>
        dataList.value.some(item => item.id === id)
      );
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? form.size;
      pagination.currentPage = data?.current ?? form.current;
    } catch {
      if (seq !== searchSeq) return;
      dataList.value = [];
      selectedIds.value = [];
      pagination.total = 0;
    } finally {
      if (seq === searchSeq) loading.value = false;
    }
  }

  function handleSourceChange() {
    form.current = 1;
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

  // ========== 网格密度 ==========
  const density = ref<GridDensity>(
    (localStorage.getItem(DENSITY_STORAGE_KEY) as GridDensity) || "medium"
  );

  function setDensity(val: GridDensity) {
    density.value = val;
    localStorage.setItem(DENSITY_STORAGE_KEY, val);
  }

  // ========== 选中交互 ==========
  const selectedIds = ref<number[]>([]);
  /** 上一次点击勾选框的图片 id（Shift 范围选择锚点） */
  const lastToggledId = ref<number | null>(null);

  const selectedCount = computed(() => selectedIds.value.length);
  const hasSelection = computed(() => selectedCount.value > 0);

  const isAllSelected = computed(
    () =>
      filteredList.value.length > 0 &&
      filteredList.value.every(item => selectedIds.value.includes(item.id))
  );

  const isIndeterminate = computed(
    () => hasSelection.value && !isAllSelected.value
  );

  function isSelected(id: number) {
    return selectedIds.value.includes(id);
  }

  /** 勾选框点击：支持 Shift 范围选择 */
  function toggleSelect(id: number, event?: MouseEvent | KeyboardEvent) {
    const list = filteredList.value;
    if (event?.shiftKey && lastToggledId.value !== null) {
      const fromIndex = list.findIndex(i => i.id === lastToggledId.value);
      const toIndex = list.findIndex(i => i.id === id);
      if (fromIndex > -1 && toIndex > -1) {
        const [start, end] =
          fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
        const rangeIds = list.slice(start, end + 1).map(i => i.id);
        const set = new Set(selectedIds.value);
        rangeIds.forEach(rid => set.add(rid));
        selectedIds.value = Array.from(set);
        lastToggledId.value = id;
        return;
      }
    }
    const index = selectedIds.value.indexOf(id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    } else {
      selectedIds.value.push(id);
    }
    lastToggledId.value = id;
  }

  function selectAllOnPage() {
    const set = new Set(selectedIds.value);
    filteredList.value.forEach(item => set.add(item.id));
    selectedIds.value = Array.from(set);
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      const pageIds = new Set(filteredList.value.map(i => i.id));
      selectedIds.value = selectedIds.value.filter(id => !pageIds.has(id));
    } else {
      selectAllOnPage();
    }
  }

  function invertSelection() {
    const selected = new Set(selectedIds.value);
    selectedIds.value = filteredList.value
      .filter(item => !selected.has(item.id))
      .map(item => item.id);
  }

  function clearSelection() {
    selectedIds.value = [];
    lastToggledId.value = null;
  }

  /** Ctrl/Cmd + A 全选本页 */
  function handleGridKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selectAllOnPage();
    }
  }

  // ========== 详情抽屉 ==========
  const drawerVisible = ref(false);
  const drawerLoading = ref(false);
  const drawerItem = ref<DailyImageItem | null>(null);
  const drawerDetail = ref<Record<string, any> | null>(null);
  /** 抽屉当前图片在 filteredList 中的索引 */
  const drawerIndex = computed(() => {
    if (!drawerItem.value) return -1;
    return filteredList.value.findIndex(i => i.id === drawerItem.value!.id);
  });
  const hasPrev = computed(() => drawerIndex.value > 0);
  const hasNext = computed(
    () =>
      drawerIndex.value > -1 &&
      drawerIndex.value < filteredList.value.length - 1
  );

  let detailSeq = 0;
  async function loadDetail(id: number) {
    const seq = ++detailSeq;
    drawerLoading.value = true;
    try {
      const result = await getDailyImageDetail(id);
      if (seq !== detailSeq) return;
      drawerDetail.value = result.code === 200 ? (result.data ?? null) : null;
    } catch {
      if (seq === detailSeq) drawerDetail.value = null;
    } finally {
      if (seq === detailSeq) drawerLoading.value = false;
    }
  }

  function openDrawer(item: DailyImageItem) {
    drawerItem.value = item;
    drawerVisible.value = true;
    remarkDraft.value = item.remark || "";
    loadDetail(item.id);
  }

  function closeDrawer() {
    drawerVisible.value = false;
    drawerItem.value = null;
    drawerDetail.value = null;
  }

  function goPrev() {
    if (!hasPrev.value) return;
    openDrawer(filteredList.value[drawerIndex.value - 1]);
  }

  function goNext() {
    if (!hasNext.value) return;
    openDrawer(filteredList.value[drawerIndex.value + 1]);
  }

  /** 抽屉打开时支持左右方向键切换 */
  function handleDrawerKeydown(event: KeyboardEvent) {
    if (!drawerVisible.value) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  }

  // ========== 全屏原图预览（可左右切换） ==========
  /**
   * 从任意一张进入全屏原图预览，urlList 为当前过滤后列表全部原图，
   * 左右切换时若抽屉打开则同步抽屉详情。
   */
  function openFullPreview(index: number) {
    const list = filteredList.value;
    if (!list.length || index < 0 || index >= list.length) return;
    openImageViewer({
      urlList: list.map(item => getDailyImagePreviewUrl(item.id)),
      initialIndex: index,
      onSwitch: (idx: number) => {
        const target = list[idx];
        if (target && drawerVisible.value) {
          openDrawer(target);
        }
      }
    });
  }

  function openFullPreviewById(id: number) {
    const index = filteredList.value.findIndex(item => item.id === id);
    openFullPreview(index);
  }

  // ========== 备注编辑（抽屉内） ==========
  const remarkDraft = ref("");
  const remarkSaving = ref(false);

  async function saveRemark() {
    if (!drawerItem.value) return;
    remarkSaving.value = true;
    try {
      const result = await updateDailyImageRemark(
        drawerItem.value.id,
        remarkDraft.value
      );
      if (result.code === 200) {
        message("备注更新成功", { type: "success" });
        drawerItem.value.remark = remarkDraft.value;
        const listItem = dataList.value.find(
          i => i.id === drawerItem.value!.id
        );
        if (listItem) listItem.remark = remarkDraft.value;
        if (drawerDetail.value) drawerDetail.value.remark = remarkDraft.value;
      } else {
        message(result.msg || "更新失败", { type: "error" });
      }
    } catch {
      message("更新失败", { type: "error" });
    } finally {
      remarkSaving.value = false;
    }
  }

  // ========== 上传（弹框内拖拽 + 多文件队列） ==========
  const fileInputRef = ref<HTMLInputElement>();
  const uploadTasks = ref<UploadTask[]>([]);
  const uploading = ref(false);
  const uploadDialogVisible = ref(false);
  const isDraggingOver = ref(false);
  let dragCounter = 0;
  let taskUid = 0;

  function openUploadDialog() {
    uploadDialogVisible.value = true;
  }

  function closeUploadDialog() {
    uploadDialogVisible.value = false;
    dragCounter = 0;
    isDraggingOver.value = false;
    if (!uploading.value) uploadTasks.value = [];
  }

  const uploadDoneCount = computed(
    () =>
      uploadTasks.value.filter(
        t => t.status === "success" || t.status === "error"
      ).length
  );

  function triggerUpload() {
    fileInputRef.value?.click();
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files?.length) {
      enqueueFiles(Array.from(files));
    }
    input.value = "";
  }

  function handleDragEnter(event: DragEvent) {
    if (!event.dataTransfer?.types.includes("Files")) return;
    dragCounter++;
    isDraggingOver.value = true;
  }

  function handleDragLeave() {
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) isDraggingOver.value = false;
  }

  function handleDrop(event: DragEvent) {
    dragCounter = 0;
    isDraggingOver.value = false;
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f =>
      f.type.startsWith("image/")
    );
    if (!files.length) {
      message("请拖入图片文件", { type: "warning" });
      return;
    }
    enqueueFiles(files);
  }

  async function enqueueFiles(files: File[]) {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) {
      message("仅支持图片文件", { type: "warning" });
      return;
    }
    const newTasks: Array<{ task: UploadTask; file: File }> = imageFiles.map(
      file => ({
        task: {
          uid: ++taskUid,
          name: file.name,
          size: file.size,
          status: "pending" as const
        },
        file
      })
    );
    uploadTasks.value.push(...newTasks.map(t => t.task));

    if (uploading.value) {
      pendingQueue.push(...newTasks);
      return;
    }
    pendingQueue.push(...newTasks);
    await processQueue();
  }

  const pendingQueue: Array<{ task: UploadTask; file: File }> = [];

  async function processQueue() {
    uploading.value = true;
    let successCount = 0;
    let failCount = 0;
    while (pendingQueue.length > 0) {
      const { task, file } = pendingQueue.shift()!;
      const target = uploadTasks.value.find(t => t.uid === task.uid);
      if (!target) continue;
      target.status = "uploading";
      try {
        const result = await uploadDailyImage(file);
        if (result.code === 200) {
          target.status = "success";
          successCount++;
        } else {
          target.status = "error";
          target.errorMsg = result.msg || "上传失败";
          failCount++;
        }
      } catch {
        target.status = "error";
        target.errorMsg = "上传失败";
        failCount++;
      }
    }
    uploading.value = false;
    if (successCount > 0) {
      message(
        failCount > 0
          ? `上传完成：成功 ${successCount} 张，失败 ${failCount} 张`
          : `成功上传 ${successCount} 张图片`,
        { type: failCount > 0 ? "warning" : "success" }
      );
      onSearch();
    } else if (failCount > 0) {
      message(`上传失败 ${failCount} 张`, { type: "error" });
    }
  }

  function clearUploadTasks() {
    if (uploading.value) return;
    uploadTasks.value = [];
  }

  // ========== 删除 ==========
  const batchDeleteLoading = ref(false);

  async function handleDelete(item: DailyImageItem) {
    try {
      await ElMessageBox.confirm(
        `是否确认删除「${item.originalName || `图片 #${item.id}`}」？`,
        "删除确认",
        {
          confirmButtonText: "删除",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      const result = await deleteDailyImage(item.id);
      if (result.code === 200) {
        message("删除成功", { type: "success" });
        if (drawerItem.value?.id === item.id) closeDrawer();
        selectedIds.value = selectedIds.value.filter(id => id !== item.id);
        onSearch();
      }
    } catch {
      // cancelled
    }
  }

  async function handleBatchDelete() {
    if (!hasSelection.value) {
      message("请先选择要删除的图片", { type: "warning" });
      return;
    }
    try {
      await ElMessageBox.confirm(
        `是否确认删除选中的 ${selectedCount.value} 张图片？删除后不可恢复。`,
        "批量删除确认",
        {
          confirmButtonText: "删除",
          cancelButtonText: "取消",
          type: "warning"
        }
      );
      batchDeleteLoading.value = true;
      const result = await batchDeleteDailyImage(selectedIds.value);
      if (result.code === 200) {
        message(`删除成功，共删除 ${result.data} 张图片`, { type: "success" });
        if (
          drawerItem.value &&
          selectedIds.value.includes(drawerItem.value.id)
        ) {
          closeDrawer();
        }
        clearSelection();
        onSearch();
      } else {
        message(result.msg || "删除失败", { type: "error" });
      }
    } catch {
      // cancelled
    } finally {
      batchDeleteLoading.value = false;
    }
  }

  // ========== 下载 ==========
  const batchDownloadLoading = ref(false);
  const isDownloading = ref(false);

  function handleDownload(item: DailyImageItem) {
    window.open(getDailyImageDownloadUrl(item.id), "_blank");
  }

  async function handleBatchDownload() {
    if (!hasSelection.value) {
      message("请先选择要下载的图片", { type: "warning" });
      return;
    }
    batchDownloadLoading.value = true;
    try {
      const blob: any = await batchDownloadDailyImages(selectedIds.value);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "图片打包下载.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message("批量下载失败", { type: "error" });
    } finally {
      batchDownloadLoading.value = false;
    }
  }

  async function handleBatchDownloadLinks() {
    if (!hasSelection.value) {
      message("请先选择要下载的图片", { type: "warning" });
      return;
    }
    isDownloading.value = true;
    try {
      const result = await getBatchDownloadLinks(selectedIds.value);
      if (result.code !== 200 || !result.data?.length) {
        message(result.msg || "获取下载链接失败", { type: "error" });
        return;
      }
      const links = result.data;
      const total = links.length;
      const notify = ElNotification({
        title: "正在下载",
        message: `0/${total}`,
        type: "info",
        duration: 0
      });
      for (let i = 0; i < links.length; i++) {
        const item = links[i];
        const a = document.createElement("a");
        a.href = item.url.startsWith("/api")
          ? item.url
          : `/api${item.url.startsWith("/") ? "" : "/"}${item.url}`;
        a.download = item.name;
        a.click();
        notify.message = `${i + 1}/${total}`;
        if (i < links.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      notify.close();
      ElNotification({
        title: "下载完成",
        message: `共 ${total} 个文件`,
        type: "success"
      });
    } catch {
      message("批量下载失败", { type: "error" });
    } finally {
      isDownloading.value = false;
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", handleDrawerKeydown);
    onSearch();
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleDrawerKeydown);
  });

  return {
    // 列表与查询
    form,
    keyword,
    loading,
    dataList,
    filteredList,
    pagination,
    onSearch,
    handleSourceChange,
    handleSizeChange,
    handleCurrentChange,
    // 密度
    density,
    setDensity,
    // 选中
    selectedIds,
    selectedCount,
    hasSelection,
    isAllSelected,
    isIndeterminate,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    selectAllOnPage,
    invertSelection,
    clearSelection,
    handleGridKeydown,
    // 抽屉
    drawerVisible,
    drawerLoading,
    drawerItem,
    drawerDetail,
    hasPrev,
    hasNext,
    openDrawer,
    closeDrawer,
    goPrev,
    goNext,
    // 全屏预览
    openFullPreview,
    openFullPreviewById,
    // 备注
    remarkDraft,
    remarkSaving,
    saveRemark,
    // 上传
    fileInputRef,
    uploadTasks,
    uploading,
    uploadDoneCount,
    uploadDialogVisible,
    openUploadDialog,
    closeUploadDialog,
    isDraggingOver,
    triggerUpload,
    handleFileChange,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    clearUploadTasks,
    // 删除/下载
    batchDeleteLoading,
    batchDownloadLoading,
    isDownloading,
    handleDelete,
    handleBatchDelete,
    handleDownload,
    handleBatchDownload,
    handleBatchDownloadLinks,
    // URL helpers
    getDailyImageThumbnailUrl,
    getDailyImagePreviewUrl,
    getDailyImageDownloadUrl
  };
}
