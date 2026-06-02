import dayjs from "dayjs";
import Detail from "./detail.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { useCopyToClipboard } from "@pureadmin/utils";
import {
  getSystemLogsList,
  getSystemLogsDetail,
  getAccessLogsFilterOptions,
  exportAccessLogsList
} from "@/api/system";
import Info from "~icons/ri/question-line";
import { usePublicHooks } from "@/views/system/hooks";

export function useSystemLog(tableRef: Ref) {
  const form = reactive({
    module: "",
    method: "",
    uri: "",
    ipLocation: "",
    browserType: "",
    description: "",
    success: "",
    requestTime: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const exportLoading = ref(false);
  const { copied, update } = useCopyToClipboard();
  const { tagStyle } = usePublicHooks();

  const filterOptions = ref({
    modules: [] as string[],
    methods: [] as string[],
    ipLocations: [] as string[],
    browserTypes: [] as string[]
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
      label: "所属模块",
      prop: "module",
      minWidth: 100
    },
    {
      headerRenderer: () => (
        <span class="flex-c">
          请求接口
          <iconifyIconOffline
            icon={Info}
            class="ml-1 cursor-help"
            v-tippy={{
              content: "双击下面请求接口进行拷贝"
            }}
          />
        </span>
      ),
      prop: "uri",
      minWidth: 140
    },
    {
      label: "请求时间",
      prop: "createdTime",
      minWidth: 180,
      formatter: ({ createdTime }) =>
        dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss")
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
      label: "请求描述",
      prop: "description",
      minWidth: 140
    },
    {
      label: "请求方法",
      prop: "method",
      minWidth: 140
    },
    {
      label: "IP 地址",
      prop: "ip",
      minWidth: 100
    },
    {
      label: "地点",
      prop: "ipLocation",
      minWidth: 140
    },
    {
      label: "请求来源",
      prop: "client",
      minWidth: 140
    },
    {
      label: "设备类型",
      prop: "deviceType",
      minWidth: 100
    },
    {
      label: "操作系统",
      prop: "osType",
      minWidth: 100
    },
    {
      label: "浏览器类型",
      prop: "browserType",
      minWidth: 100
    },
    {
      label: "请求耗时",
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
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  function handleSizeChange(val: number) {
    console.log(`${val} items per page`);
    form.size = val;
    form.current = 1; // 切换 pageSize 时重置到第一页
    onSearch();
  }

  function handleCurrentChange(val: number) {
    console.log(`current page: ${val}`);
    form.current = val;
    onSearch();
  }

  const exportExcel = async () => {
    if (exportLoading.value) return;

    exportLoading.value = true;
    try {
      const blob = await exportAccessLogsList(toRaw(form));

      const fileName = "系统日志.xlsx";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = fileName;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("导出失败", e);
      message("导出失败", {
        type: "error"
      });
    } finally {
      setTimeout(() => {
        exportLoading.value = false;
      }, 500);
    }
  };

  /** 拷贝请求接口，表格单元格被双击时触发 */
  function handleCellDblclick({ url }, { property }) {
    if (property !== "url") return;
    update(url);
    copied.value
      ? message(`${url} 已拷贝`, { type: "success" })
      : message("拷贝失败", { type: "warning" });
  }

  function onDetail(row) {
    getSystemLogsDetail(row.id).then(res => {
      console.log(res);
      addDialog({
        title: "系统日志详情",
        fullscreen: true,
        hideFooter: true,
        contentRenderer: () => Detail,
        props: {
          data: [res.data]
        }
      });
    });
  }

  async function onSearch() {
    loading.value = true;
    const { data } = await getSystemLogsList(toRaw(form));
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
      const { data } = await getAccessLogsFilterOptions();
      filterOptions.value = {
        modules: data?.modules ?? [],
        methods: data?.methods ?? [],
        ipLocations: data?.ipLocations ?? [],
        browserTypes: data?.browserTypes ?? []
      };
    } catch (error) {
      console.error("加载筛选选项失败", error);
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
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
    onDetail,
    resetForm,
    exportExcel,
    exportLoading,
    handleSizeChange,
    handleCellDblclick,
    handleCurrentChange
  };
}
