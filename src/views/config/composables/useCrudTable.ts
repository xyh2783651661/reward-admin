import { message } from "@/utils/message";

import type { PaginationProps } from "@pureadmin/table";
import { reactive, ref, toRaw, onMounted } from "vue";

interface ApiResult {
  code: number;
  msg: string;
}

interface PageData<T = any> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

interface PageResult<T = any> extends ApiResult {
  data: PageData<T>;
}

export interface CrudTableConfig<TForm extends Record<string, any>> {
  searchApi: (params: any) => Promise<PageResult>;
  deleteApi: (id: number | string) => Promise<ApiResult>;
  defaultForm: TForm;
  deleteMessage?: (row: any) => string;
  onDeleteSuccess?: (row: any) => void;
}

export function useCrudTable<TForm extends Record<string, any>>(
  config: CrudTableConfig<TForm>
) {
  const form = reactive<TForm>({
    ...config.defaultForm,
    current: 1,
    size: 10
  } as TForm);

  const dataList = ref<any[]>([]);
  const loading = ref(true);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await config.searchApi(toRaw(form));
      dataList.value = data.records;
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  }

  function handleDelete(row: any) {
    config
      .deleteApi(row.id)
      .then(r => {
        if (r.code === 200) {
          const msg = config.deleteMessage
            ? config.deleteMessage(row)
            : `已删除ID为${row.id}的数据`;
          message(msg, { type: "success" });
        }
      })
      .finally(() => {
        onSearch();
        config.onDeleteSuccess?.(row);
      });
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

  function handleSelectionChange(_val: any) {}

  onMounted(() => {
    onSearch();
  });

  return {
    form,
    loading,
    dataList,
    pagination,
    onSearch,
    resetForm,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
