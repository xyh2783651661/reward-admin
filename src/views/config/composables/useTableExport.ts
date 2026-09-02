import { toRaw } from "vue";
import { useDownload } from "@/hooks/useDownload";

/**
 * 表格导出
 *
 * 交互细节（loading、幂等、成功/失败提示）已统一收敛到 `useDownload`，
 * 这里只保留 config 模块特有的「拼参数 + 固定文件名」约定。
 *
 * 对外 API 保持不变，已接入的三个页面（系统配置 / 零花钱 / 奖励项）无需改动。
 */
export function useTableExport(
  exportApi: (params: any) => Promise<Blob>,
  fileName: string,
  getFormParams: () => any
) {
  const { loading: exportLoading, runExport } = useDownload();

  function exportExcel() {
    return runExport(() => exportApi(toRaw(getFormParams())), fileName);
  }

  return {
    exportLoading,
    exportExcel
  };
}
