import dayjs from "dayjs";
import { getOperationLogsList, getTaskLogsFilterOptions } from "@/api/system";
import { usePublicHooks } from "@/views/system/hooks";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { addDialog } from "@/components/ReDialog/index";
import Detail from "@/views/monitor/logs/operation/detail.vue";

export function useOperationLog(_tableRef?: Ref) {
  const form = reactive({
    taskName: "",
    classMethod: "",
    success: "",
    requestTime: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const { tagStyle } = usePublicHooks();

  const filterOptions = ref({
    taskNames: [] as string[],
    classMethods: [] as string[]
  });

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      minWidth: 90
    },
    {
      label: "任务名",
      prop: "taskName",
      minWidth: 100
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 200
    },
    {
      label: "执行耗时",
      prop: "timeCost",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.timeCost < 1000 ? "success" : "warning"}
          effect="plain"
        >
          {row.timeCost} ms
        </el-tag>
      )
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} style={tagStyle.value(row.success ? 1 : 2)}>
          {row.success ? "成功" : "失败"}
        </el-tag>
      )
    },
    {
      label: "开始时间",
      prop: "startTime",
      minWidth: 300,
      formatter: ({ startTime }) =>
        dayjs(startTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "结束时间",
      prop: "endTime",
      minWidth: 300,
      formatter: ({ endTime }) => dayjs(endTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "调用方法",
      prop: "classMethod",
      minWidth: 260
    },
    {
      label: "执行详情",
      prop: "detail",
      minWidth: 120,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} type={row.detail ? "primary" : "info"}>
          {row.detail ? "有步骤" : "无"}
        </el-tag>
      )
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  function onDetail(row) {
    addDialog({
      title: row.success ? "执行详情" : "异常信息详情",
      fullscreen: true,
      hideFooter: true,
      contentRenderer: () => Detail,
      props: {
        exception: row.exception,
        detail: row.detail
      }
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

  async function onSearch() {
    loading.value = true;
    const { data } = await getOperationLogsList(toRaw(form));
    dataList.value = data.records;
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;

    setTimeout(() => {
      loading.value = false;
    }, 500);
  }

  async function loadFilterOptions() {
    try {
      const { data } = await getTaskLogsFilterOptions();
      filterOptions.value = {
        taskNames: data?.taskNames ?? [],
        classMethods: data?.classMethods ?? []
      };
    } catch (error) {
      console.error("加载任务日志筛选选项失败", error);
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  onMounted(() => {
    onSearch();
    loadFilterOptions();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    filterOptions,
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    onDetail
  };
}
