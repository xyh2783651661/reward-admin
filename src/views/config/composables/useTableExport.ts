import { message } from "@/utils/message";
import { ref, toRaw } from "vue";

export function useTableExport(
  exportApi: (params: any) => Promise<Blob>,
  fileName: string,
  getFormParams: () => any
) {
  const exportLoading = ref(false);

  async function exportExcel() {
    if (exportLoading.value) return;

    exportLoading.value = true;
    try {
      const blob = await exportApi(toRaw(getFormParams()));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = fileName;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch {
      message("导出失败", { type: "error" });
    } finally {
      exportLoading.value = false;
    }
  }

  return {
    exportLoading,
    exportExcel
  };
}
