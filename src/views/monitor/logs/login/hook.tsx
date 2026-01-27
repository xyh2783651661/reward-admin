import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getKeyList } from "@pureadmin/utils";
import { getMailSendRecordsList } from "@/api/system";
import { usePublicHooks } from "@/views/system/hooks";
import type { PaginationProps } from "@pureadmin/table";
import { type Ref, reactive, ref, onMounted, toRaw } from "vue";
import { addDialog } from "@/components/ReDialog/index";
import Detail from "@/views/monitor/logs/login/detail.vue";

export function useRole(tableRef: Ref) {
  const form = reactive({
    subject: "",
    status: "",
    requestTime: ["", ""],
    current: 1,
    size: 10
  });
  const dataList = ref([]);
  const loading = ref(true);
  const selectedNum = ref(0);
  const { tagStyle } = usePublicHooks();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "勾选列", // 如果需要表格多选，此处label必须设置
      type: "selection",
      fixed: "left",
      reserveSelection: true // 数据刷新后保留选项
    },
    {
      label: "ID",
      prop: "id"
    },
    {
      label: "主题",
      prop: "subject"
    },
    {
      label: "接收人",
      prop: "recipient",
      minWidth: 100
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} style={tagStyle.value(row.status)}>
          {row.status == 0 ? "待发送" : row.status == 1 ? "成功" : "失败"}
        </el-tag>
      )
    },
    {
      label: "发送时间",
      prop: "lastSendTime",
      minWidth: 300,
      cellRenderer: ({ row }) =>
        row.status == 1
          ? dayjs(row.lastSendTime).format("YYYY-MM-DD HH:mm:ss")
          : ""
    },
    {
      label: "发送次数",
      prop: "sendAttempts"
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  function onDetail(row) {
    console.log("row", row);
    console.log("row-content", row.content);
    addDialog({
      title: "邮件详情",
      fullscreen: true,
      hideFooter: true,
      contentRenderer: () => Detail,
      props: {
        content: row.content
      }
    });
  }

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

  /** 当CheckBox选择项发生变化时会触发该事件 */
  function handleSelectionChange(val) {
    selectedNum.value = val.length;
    // 重置表格高度
    tableRef.value.setAdaptive();
  }

  /** 取消选择 */
  function onSelectionCancel() {
    selectedNum.value = 0;
    // 用于多选表格，清空用户的选择
    tableRef.value.getTableRef().clearSelection();
  }

  /** 批量删除 */
  function onbatchDel() {
    // 返回当前选中的行
    const curSelected = tableRef.value.getTableRef().getSelectionRows();
    // 接下来根据实际业务，通过选中行的某项数据，比如下面的id，调用接口进行批量删除
    message(`已删除序号为 ${getKeyList(curSelected, "id")} 的数据`, {
      type: "success"
    });
    tableRef.value.getTableRef().clearSelection();
    onSearch();
  }

  async function onSearch() {
    loading.value = true;
    const { data } = await getMailSendRecordsList(toRaw(form));
    dataList.value = data.records;
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;

    setTimeout(() => {
      loading.value = false;
    }, 500);
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
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
    onbatchDel,
    handleSizeChange,
    onSelectionCancel,
    handleCurrentChange,
    handleSelectionChange,
    onDetail
  };
}
