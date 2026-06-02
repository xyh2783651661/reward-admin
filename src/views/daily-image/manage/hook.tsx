import { ref, reactive, onMounted, toRaw } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import {
  getDailyImagePage,
  uploadDailyImage,
  deleteDailyImage,
  updateDailyImageRemark,
  getDailyImageThumbnailUrl,
  getDailyImageDownloadUrl
} from "@/api/daily-image";
import type { PaginationProps } from "@pureadmin/table";

export function useDailyImage() {
  const loading = ref(true);
  const uploadLoading = ref(false);
  const dataList = ref<any[]>([]);
  const fileInputRef = ref<HTMLInputElement>();

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
    dataList,
    pagination,
    fileInputRef,
    remarkEditId,
    remarkEditText,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    triggerUpload,
    handleFileChange,
    handleDelete,
    handleDownload,
    startRemarkEdit,
    cancelRemarkEdit,
    saveRemarkEdit,
    getDailyImageThumbnailUrl,
    getDailyImageDownloadUrl
  };
}
