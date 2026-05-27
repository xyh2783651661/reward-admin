import Detail from "./detail.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import {
  getCacheKeys,
  getCacheValue,
  deleteCacheKey,
  clearAllCache
} from "@/api/system";
import type { CacheKeyItem } from "./utils/types";

export function useCache(tableRef: Ref) {
  const form = reactive({
    pattern: "",
    current: 1,
    size: 10
  });
  const dataList = ref<CacheKeyItem[]>([]);
  const loading = ref(true);
  const selectedNum = ref(0);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    {
      label: "勾选列",
      type: "selection",
      fixed: "left",
      reserveSelection: true
    },
    { label: "缓存 Key", prop: "key", minWidth: 300 },
    {
      label: "TTL (秒)",
      prop: "ttl",
      minWidth: 120,
      cellRenderer: ({ row }) => (row.ttl === -1 ? "永不过期" : row.ttl)
    },
    { label: "数据类型", prop: "type", minWidth: 100 },
    {
      label: "占用内存",
      prop: "size",
      minWidth: 120,
      cellRenderer: ({ row }) => (row.size ? formatSize(row.size) : "-")
    },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  function formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
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

  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    tableRef.value.setAdaptive();
  }

  function onSelectionCancel() {
    selectedNum.value = 0;
    tableRef.value.getTableRef().clearSelection();
  }

  function onViewValue(row: CacheKeyItem) {
    getCacheValue(row.key).then(res => {
      addDialog({
        title: `缓存值 — ${row.key}`,
        width: "50%",
        hideFooter: true,
        contentRenderer: () => Detail,
        props: { data: res.data, cacheKey: row.key }
      });
    });
  }

  function onDeleteKey(row: CacheKeyItem) {
    deleteCacheKey(row.key).then(r => {
      if (r.code === 200) {
        message("已删除缓存", { type: "success" });
        onSearch();
      }
    });
  }

  function onbatchDel() {
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    const keys = curSelected.map((r: CacheKeyItem) => r.key);
    Promise.all(keys.map((k: string) => deleteCacheKey(k))).then(() => {
      message(`已删除 ${keys.length} 条缓存`, { type: "success" });
      tableRef.value.getTableRef().clearSelection();
      onSearch();
    });
  }

  function onClearAll() {
    clearAllCache().then(r => {
      if (r.code === 200) {
        message("已清空所有缓存", { type: "success" });
        onSearch();
      }
    });
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getCacheKeys(toRaw(form));
      dataList.value = data.records;
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } finally {
      loading.value = false;
    }
  }

  const resetForm = (formEl: any) => {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    onSearch();
  };

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    selectedNum,
    onSearch,
    resetForm,
    onViewValue,
    onDeleteKey,
    onbatchDel,
    onClearAll,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange
  };
}
