import dayjs from "dayjs";
import editForm from "./form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "./utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  getSysNoticePage,
  deleteSysNotice,
  addSysNotice,
  updateSysNotice,
  publishSysNotice,
  withdrawSysNotice
} from "@/api/notice";
import { useCrudTable } from "@/views/config/composables";
import { type Ref, ref, h } from "vue";

export function useSysNotice(_tableRef?: Ref) {
  const formRef = ref();

  const {
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
  } = useCrudTable({
    searchApi: getSysNoticePage,
    deleteApi: deleteSysNotice,
    defaultForm: {
      keyword: "",
      filterNoticeType: "",
      status: "",
      current: 1,
      size: 10
    }
  });

  const columns: TableColumnList = [
    { label: "ID", prop: "id", minWidth: 80 },
    { label: "标题", prop: "title", minWidth: 200 },
    {
      label: "类型",
      prop: "noticeType",
      minWidth: 100,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.noticeType === 1 ? "success" : "warning"}
          effect="plain"
        >
          {row.noticeType === 1 ? "功能更新" : "系统公告"}
        </el-tag>
      )
    },
    {
      label: "优先级",
      prop: "priority",
      minWidth: 90,
      cellRenderer: ({ row, props }) => {
        const map = { 4: "info", 5: "", 7: "warning", 9: "danger" };
        const labelMap = { 4: "信息", 5: "普通", 7: "警告", 9: "紧急" };
        return (
          <el-tag
            size={props.size}
            type={map[row.priority] || ""}
            effect="plain"
          >
            {labelMap[row.priority] || row.priority}
          </el-tag>
        );
      }
    },
    {
      label: "平台",
      prop: "platformMask",
      minWidth: 120,
      formatter: ({ platformMask }) => {
        const platforms = [];
        if (platformMask & 1) platforms.push("Web");
        if (platformMask & 2) platforms.push("Android");
        if (platformMask & 4) platforms.push("iOS");
        return platforms.join(", ") || "-";
      }
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 100,
      cellRenderer: ({ row, props }) => {
        const map = { 0: "info", 1: "success", 2: "danger" };
        const labelMap = { 0: "草稿", 1: "已发布", 2: "已撤回" };
        return (
          <el-tag
            size={props.size}
            type={map[row.status] || "info"}
            effect="plain"
          >
            {labelMap[row.status] || row.status}
          </el-tag>
        );
      }
    },
    {
      label: "发布时间",
      prop: "publishTime",
      minWidth: 160,
      formatter: ({ publishTime }) =>
        publishTime ? dayjs(publishTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 280,
      slot: "operation"
    }
  ];

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}公告`,
      props: {
        formInline: {
          id: row?.id ?? "",
          title: row?.title ?? "",
          content: row?.content ?? "",
          noticeType: row?.noticeType ?? "",
          priority: row?.priority ?? "",
          platformMask: row?.platformMask
            ? typeof row.platformMask === "number"
              ? decomposePlatformMask(row.platformMask)
              : row.platformMask
            : [],
          minVersion: row?.minVersion ?? "",
          publishTime: row?.publishTime ?? "",
          offlineTime: row?.offlineTime ?? "",
          operator: row?.operator ?? "",
          status: row?.status ?? 0
        }
      },
      width: "50%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        function chores() {
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            // Combine platformMask array into a single number
            const submitData = {
              ...curData,
              platformMask: Array.isArray(curData.platformMask)
                ? curData.platformMask.reduce(
                    (acc: number, val: number) => acc | val,
                    0
                  )
                : curData.platformMask
            };
            const api = title === "新增" ? addSysNotice : updateSysNotice;
            api(submitData)
              .then(r => {
                message(r.msg, { type: r.code === 200 ? "success" : "error" });
              })
              .finally(() => {
                chores();
              });
          }
        });
      }
    });
  }

  /** Decompose platform mask number into an array of individual values */
  function decomposePlatformMask(mask: number): number[] {
    const result = [];
    if (mask & 1) result.push(1);
    if (mask & 2) result.push(2);
    if (mask & 4) result.push(4);
    return result;
  }

  function handlePublish(row: FormItemProps) {
    publishSysNotice(row.id).then(r => {
      message(r.msg, { type: r.code === 200 ? "success" : "error" });
      onSearch();
    });
  }

  function handleWithdraw(row: FormItemProps) {
    withdrawSysNotice(row.id).then(r => {
      message(r.msg, { type: r.code === 200 ? "success" : "error" });
      onSearch();
    });
  }

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handlePublish,
    handleWithdraw,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
