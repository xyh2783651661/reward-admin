import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getMailSendRecordsList } from "@/api/system";
import { usePublicHooks } from "@/views/system/hooks";
import type { PaginationProps } from "@pureadmin/table";
import { reactive, ref, onMounted, toRaw } from "vue";
import { addDialog } from "@/components/ReDialog/index";
import Detail from "@/views/monitor/logs/login/detail.vue";
import type { MailSendRecordItem } from "./types";

export function useMailLog() {
  const form = reactive({
    subject: "",
    status: "" as number | "",
    requestTime: [] as string[],
    current: 1,
    size: 10
  });
  const dataList = ref<MailSendRecordItem[]>([]);
  const loading = ref(true);
  const { tagStyle } = usePublicHooks();

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
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

  function onDetail(row: MailSendRecordItem) {
    if (!row.content?.trim()) {
      message("该邮件记录没有可预览的内容", {
        type: "warning"
      });
      return;
    }

    addDialog({
      title: `邮件详情${row.subject ? ` - ${row.subject}` : ""}`,
      fullscreen: true,
      hideFooter: true,
      contentRenderer: () => Detail,
      props: {
        record: row
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

  async function onSearch() {
    loading.value = true;
    const { data } = await getMailSendRecordsList<MailSendRecordItem>(
      toRaw(form)
    );
    dataList.value = data.records ?? [];
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
    onSearch,
    resetForm,
    handleSizeChange,
    handleCurrentChange,
    onDetail
  };
}
