import dayjs from "dayjs";
import { message } from "@/utils/message";
import { getMailSendRecordsList } from "@/api/system";
import { getMailSendRecordOptions, getMailSendRecordDetail } from "@/api/mail";
import type { OptionsResponse } from "@/components/DictSelect/types";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import type { PaginationProps } from "@pureadmin/table";
import { reactive, ref, onMounted, toRaw } from "vue";
import { addDialog } from "@/components/ReDialog/index";
import Detail from "@/views/monitor/logs/login/detail.vue";
import type { MailSendRecordItem } from "./types";

export function useMailLog() {
  const form = reactive({
    subject: "",
    status: "" as number | "",
    type: "",
    mqStatus: "" as number | "",
    recipient: "",
    messageId: "",
    priority: "" as number | "",
    provider: "",
    requestTime: [] as string[],
    current: 1,
    size: 10
  });
  const dataList = ref<MailSendRecordItem[]>([]);
  const loading = ref(true);
  const optionsLoading = ref(false);
  // 统一承接 options 接口返回，避免每页手写多个 xxxOptions ref
  const options = reactive<OptionsResponse>({
    statusOptions: [],
    typeOptions: [],
    mqStatusOptions: [],
    priorityOptions: []
  });
  const { tagStyle } = usePublicHooks();

  const priorityLabel: Record<number, string> = {
    1: "高",
    2: "较高",
    3: "中",
    4: "较低",
    5: "低"
  };
  const priorityTagType: Record<number, string> = {
    1: "danger",
    2: "warning",
    3: "info",
    4: "info",
    5: "info"
  };
  const mqStatusLabel: Record<number, string> = {
    0: "待投递",
    1: "投递中",
    2: "已投递",
    3: "投递失败"
  };
  const mqStatusTagType: Record<number, string> = {
    0: "info",
    1: "warning",
    2: "success",
    3: "danger"
  };

  const mailStatusLabel: Record<number, string> = {
    0: "待发送",
    1: "成功",
    2: "失败",
    3: "发送中",
    4: "重试中",
    5: "已取消",
    6: "状态未知"
  };

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
          {mailStatusLabel[row.status as number] ?? "未知"}
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
      label: "优先级",
      prop: "priority",
      minWidth: 90,
      cellRenderer: ({ row }) => {
        const p = row.priority as number;
        if (p == null) return <span>-</span>;
        return (
          <el-tag
            size="small"
            type={priorityTagType[p] ?? "info"}
            effect="plain"
          >
            {priorityLabel[p] ?? p}
          </el-tag>
        );
      }
    },
    {
      label: "MQ状态",
      prop: "mqStatus",
      minWidth: 100,
      cellRenderer: ({ row }) => {
        const s = row.mqStatus as number;
        if (s == null) return <span>-</span>;
        return (
          <el-tag
            size="small"
            type={mqStatusTagType[s] ?? "info"}
            effect="plain"
          >
            {mqStatusLabel[s] ?? s}
          </el-tag>
        );
      }
    },
    {
      label: "供应商",
      prop: "provider",
      minWidth: 120,
      formatter: ({ provider }) => provider || "-"
    },
    {
      label: "操作",
      fixed: "right",
      slot: "operation"
    }
  ];

  async function onDetail(row: MailSendRecordItem) {
    if (row.id == null) return;

    try {
      const { data } = await getMailSendRecordDetail<MailSendRecordItem>(
        row.id
      );
      if (!data) {
        message("未找到该邮件记录", {
          type: "warning"
        });
        return;
      }

      addDialog({
        title: `邮件详情${data.subject ? ` - ${data.subject}` : ""}`,
        fullscreen: true,
        hideFooter: true,
        contentRenderer: () => Detail,
        props: {
          record: data
        }
      });
    } catch (e) {
      console.error("加载邮件详情失败", e);
      message("加载邮件详情失败", {
        type: "error"
      });
    }
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
    try {
      const { data } = await getMailSendRecordsList<MailSendRecordItem>(
        toRaw(form)
      );
      dataList.value = data.records ?? [];
      pagination.total = data.total;
      pagination.pageSize = data.size;
      pagination.currentPage = data.current;
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  async function loadStatusOptions() {
    optionsLoading.value = true;
    try {
      const { data } = await getMailSendRecordOptions();
      if (data) {
        Object.assign(options, data);
      }
    } catch (e) {
      console.error("加载邮件状态选项失败", e);
    } finally {
      optionsLoading.value = false;
    }
  }

  onMounted(() => {
    onSearch();
    loadStatusOptions();
  });

  return {
    form,
    loading,
    optionsLoading,
    options,
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
