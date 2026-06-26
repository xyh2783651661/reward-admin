import { emptyText, formatDate } from "@/utils/format";
import { getLoginLogsList } from "@/api/system";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import type { PaginationProps } from "@pureadmin/table";
import { reactive, ref, onMounted, toRaw } from "vue";

export function useLoginLog() {
  const form = reactive({
    username: "",
    ip: "",
    success: "" as string,
    requestTime: [] as string[],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const { tagStyle } = usePublicHooks();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    { label: "ID", prop: "id", minWidth: 80 },
    {
      label: "用户名",
      prop: "username",
      minWidth: 120,
      formatter: ({ row }) => emptyText(row.username)
    },
    {
      label: "登录 IP",
      prop: "ip",
      minWidth: 140,
      formatter: ({ row }) => emptyText(row.ip)
    },
    {
      label: "登录地点",
      prop: "ipLocation",
      minWidth: 160,
      formatter: ({ row }) => emptyText(row.ipLocation)
    },
    {
      label: "状态",
      prop: "success",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} style={tagStyle.value(row.success ? 1 : 2)}>
          {row.success ? "成功" : "失败"}
        </el-tag>
      )
    },
    {
      label: "操作系统",
      prop: "osType",
      minWidth: 120,
      formatter: ({ row }) => emptyText(row.osType)
    },
    {
      label: "浏览器",
      prop: "browserType",
      minWidth: 100,
      formatter: ({ row }) => emptyText(row.browserType)
    },
    {
      label: "登录时间",
      prop: "loginTime",
      minWidth: 180,
      formatter: ({ row }) => formatDate(row.loginTime)
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 160,
      formatter: ({ row }) => emptyText(row.description)
    }
  ];

  function handleSizeChange(val: number) {
    form.size = val;
    form.current = 1;
    onSearch();
  }

  function handleCurrentChange(val: number) {
    form.current = val;
    onSearch();
  }

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getLoginLogsList(toRaw(form));
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
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange
  };
}
