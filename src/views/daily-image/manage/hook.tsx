import { ref, reactive, onMounted, toRaw } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox, ElNotification } from "element-plus";
import {
  getDailyImagePage,
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

export function useDailyImage() {
  const loading = ref(true);
  const uploadLoading = ref(false);
  const batchDeleteLoading = ref(false);
  const batchDownloadLoading = ref(false);
  const isDownloading = ref(false);
  const dataList = ref<any[]>([]);
  const fileInputRef = ref<HTMLInputElement>();

  // 批量选择相关
  const selectedIds = ref<number[]>([]);

  // 备注编辑状态
  const remarkEditId = ref<number | null>(null);
  const remarkEditText = ref("");

  const form = reactive({
    source: "",
    current: 1,
    size: 30
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 30,
    currentPage: 1,
    background: true
  });

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getDailyImagePage(toRaw(form));
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

  function resetForm(formEl: any) {
    formEl?.resetFields();
    form.source = "";
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

  function triggerUpload() {
    fileInputRef.value?.click();
  }

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    uploadLoading.value = true;
    try {
      const result = await uploadDailyImage(files[0]);
      if (result.code === 200) {
        message("上传成功", { type: "success" });
        onSearch();
      } else {
        message(result.msg || "上传失败", { type: "error" });
      }
    } catch {
      message("上传失败", { type: "error" });
    } finally {
      uploadLoading.value = false;
      input.value = "";
    }
  }

  async function handleDelete(item: any) {
    try {
      await ElMessageBox.confirm("是否确认删除该图片？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      });
      const result = await deleteDailyImage(item.id);
      if (result.code === 200) {
        message("删除成功", { type: "success" });
        onSearch();
      }
    } catch {
      // cancelled
    }
  }

  // 切换单个选中状态
  function toggleSelect(id: number) {
    const index = selectedIds.value.indexOf(id);
    if (index > -1) {
      selectedIds.value.splice(index, 1);
    } else {
      selectedIds.value.push(id);
    }
  }

  // 切换全选
  function toggleSelectAll() {
    if (selectedIds.value.length === dataList.value.length) {
      selectedIds.value = [];
    } else {
      selectedIds.value = dataList.value.map(item => item.id);
    }
  }

  // 清空选择
  function clearSelection() {
    selectedIds.value = [];
  }

  // 批量删除
  async function handleBatchDelete() {
    if (selectedIds.value.length === 0) {
      message("请先选择要删除的图片", { type: "warning" });
      return;
    }

    try {
      await ElMessageBox.confirm(
        `是否确认删除选中的 ${selectedIds.value.length} 张图片？`,
        "提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning"
        }
      );

      batchDeleteLoading.value = true;
      const result = await batchDeleteDailyImage(selectedIds.value);
      if (result.code === 200) {
        message(`删除成功，共删除 ${result.data} 张图片`, { type: "success" });
        selectedIds.value = [];
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

  // 批量下载（ZIP打包）
  async function handleBatchDownload() {
    if (selectedIds.value.length === 0) {
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

  // 批量逐个下载
  async function handleBatchDownloadLinks() {
    if (selectedIds.value.length === 0) {
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
        a.href = item.url;
        a.download = item.name;
        a.click();

        // 更新通知
        notify.message = `${i + 1}/${total}`;

        // 间隔避免浏览器拦截
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

  function handleDownload(item: any) {
    const url = getDailyImageDownloadUrl(item.id);
    window.open(url, "_blank");
  }

  function startRemarkEdit(item: any) {
    remarkEditId.value = item.id;
    remarkEditText.value = item.remark || "";
  }

  function cancelRemarkEdit() {
    remarkEditId.value = null;
    remarkEditText.value = "";
  }

  async function saveRemarkEdit(item: any) {
    try {
      const result = await updateDailyImageRemark(
        item.id,
        remarkEditText.value
      );
      if (result.code === 200) {
        message("备注更新成功", { type: "success" });
        item.remark = remarkEditText.value;
        cancelRemarkEdit();
      } else {
        message(result.msg || "更新失败", { type: "error" });
      }
    } catch {
      message("更新失败", { type: "error" });
    }
  }

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    uploadLoading,
    batchDeleteLoading,
    batchDownloadLoading,
    isDownloading,
    dataList,
    pagination,
    fileInputRef,
    selectedIds,
    remarkEditId,
    remarkEditText,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    triggerUpload,
    handleFileChange,
    handleDelete,
    handleBatchDelete,
    handleBatchDownload,
    handleBatchDownloadLinks,
    handleDownload,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    startRemarkEdit,
    cancelRemarkEdit,
    saveRemarkEdit,
    getDailyImageThumbnailUrl,
    getDailyImagePreviewUrl,
    getDailyImageDownloadUrl
  };
}
