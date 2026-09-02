import dayjs from "dayjs";
import Detail from "./detail.vue";
import { message } from "@/utils/message";
import { useDownload } from "@/hooks/useDownload";
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
import { getAccessLogOptions } from "@/api/logs";
import Info from "~icons/ri/question-line";
import { usePublicHooks } from "@/hooks/usePublicHooks";

export function useSystemLog(_tableRef: Ref) {
  const form = reactive({
    traceId: "",
    module: "",
    method: "",
    uri: "",
    ipLocation: "",
    browserType: "",
    description: "",
    success: "",
    action: "",
    resourceType: "",
    resourceId: "",
    bizType: "",
    bizId: "",
    operatorId: "",
    operatorName: "",
    requestTime: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const { loading: exportLoading, runExport } = useDownload();
  const { copied, update } = useCopyToClipboard();
  const { tagStyle } = usePublicHooks();
  const optionsLoading = ref(false);
  const successOptions = ref<{ value: string; label: string }[]>([]);

  const filterOptions = ref({
    modules: [] as string[],
    methods: [] as string[],
    actions: [] as string[],
    resourceTypes: [] as string[],
    bizTypes: [] as string[],
    operatorNames: [] as string[],
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
          TraceId
          <iconifyIconOffline
            icon={Info}
            class="ml-1 cursor-help"
            v-tippy={{ content: "双击 TraceId 可快速复制" }}
          />
        </span>
      ),
      prop: "traceId",
      minWidth: 180
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
      label: "操作类型",
      prop: "action",
      minWidth: 120
    },
    {
      label: "资源类型",
      prop: "resourceType",
      minWidth: 120
    },
    {
      label: "资源ID",
      prop: "resourceId",
      minWidth: 120
    },
    {
      label: "业务类型",
      prop: "bizType",
      minWidth: 120
    },
    {
      label: "业务ID",
      prop: "bizId",
      minWidth: 120
    },
    {
      label: "操作人",
      prop: "operatorName",
      minWidth: 120
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

  function exportExcel() {
    return runExport(() => exportAccessLogsList(toRaw(form)), "系统日志.xlsx");
  }

  /** 双击快速复制请求接口或 TraceId */
  function handleCellDblclick(row, { property }) {
    if (!["uri", "traceId"].includes(property)) return;
    const value = row?.[property] ?? "";
    if (!value) return;
    update(value);
    copied.value
      ? message(`${value} 已拷贝`, { type: "success" })
      : message("拷贝失败", { type: "warning" });
  }

  function onDetail(row) {
    getSystemLogsDetail(row.id).then(res => {
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
    try {
      const { data } = await getSystemLogsList(toRaw(form));
      dataList.value = data.records;
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } finally {
      loading.value = false;
    }
  }

  async function loadFilterOptions() {
    optionsLoading.value = true;
    try {
      const [accessOpts, successOpts] = await Promise.all([
        getAccessLogsFilterOptions(),
        getAccessLogOptions()
      ]);
      filterOptions.value = {
        modules: accessOpts.data?.modules ?? [],
        methods: accessOpts.data?.methods ?? [],
        actions: accessOpts.data?.actions ?? [],
        resourceTypes: accessOpts.data?.resourceTypes ?? [],
        bizTypes: accessOpts.data?.bizTypes ?? [],
        operatorNames: accessOpts.data?.operatorNames ?? [],
        ipLocations: accessOpts.data?.ipLocations ?? [],
        browserTypes: accessOpts.data?.browserTypes ?? []
      };
      successOptions.value = successOpts.data?.successOptions ?? [];
    } catch (error) {
      console.error("加载筛选选项失败", error);
    } finally {
      optionsLoading.value = false;
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
    optionsLoading,
    successOptions,
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
