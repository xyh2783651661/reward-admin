import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "@/hooks/usePublicHooks";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  addMorningGreeting,
  deleteMorningGreeting,
  getMorningGreetingOptions,
  getMorningGreetingPage,
  updateMorningGreeting
} from "@/api/morning-greeting";
import { getRewardUserList } from "@/api/system";
import { useCrudTable } from "../../composables";
import { type Ref, ref, h, onMounted } from "vue";

export function useMorningGreeting(_treeRef?: Ref) {
  const formRef = ref();
  const switchLoadMap = ref({});
  const { switchStyle } = usePublicHooks();
  const userOptions = ref<{ id: number; nickName: string }[]>([]);
  const enabledOptions = ref<Array<{ value: any; label: string }>>([]);

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
  } = useCrudTable<{
    targetUserId?: number | string;
    sendDate?: string;
    enabled?: number;
  }>({
    searchApi: getMorningGreetingPage,
    deleteApi: deleteMorningGreeting,
    defaultForm: { targetUserId: "", sendDate: "" },
    deleteMessage: row => `已删除ID为${row.id}的数据`
  });

  onMounted(async () => {
    try {
      const { data } = await getRewardUserList({});
      userOptions.value = (data ?? []) as { id: number; nickName: string }[];
    } catch {
      userOptions.value = [];
    }
    try {
      const { data } = await getMorningGreetingOptions();
      enabledOptions.value = data?.enabledOptions ?? [];
    } catch (e) {
      console.error(e);
    }
  });

  const columns: TableColumnList = [
    { label: "ID", prop: "id" },
    {
      label: "目标用户",
      prop: "targetUserId",
      minWidth: 140,
      cellRenderer: ({ row }) => {
        const u = userOptions.value.find(x => x.id === row.targetUserId);
        return <span>{u ? u.nickName : (row.targetUserId ?? "-")}</span>;
      }
    },
    {
      label: "发送日期",
      prop: "sendDate",
      minWidth: 130,
      formatter: ({ sendDate }) => sendDate || "每天"
    },
    {
      label: "状态",
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.enabled}
          active-value={1}
          inactive-value={0}
          active-text="已启用"
          inactive-text="已禁用"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope as any)}
        />
      ),
      minWidth: 90
    },
    { label: "备注", prop: "remark", minWidth: 160 },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 160,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.enabled ? "启用" : "禁用"
      }</strong><strong style='color:var(--el-color-primary)'>ID为${
        row.id
      }</strong>的早安问候配置吗?`,
      "系统提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(() => {
        switchLoadMap.value[index] = Object.assign(
          {},
          switchLoadMap.value[index],
          { loading: true }
        );
        setTimeout(() => {
          switchLoadMap.value[index] = Object.assign(
            {},
            switchLoadMap.value[index],
            { loading: false }
          );
          updateMorningGreeting({ id: row.id, enabled: row.enabled }).then(
            r => {
              if (r.code === 200) {
                message(
                  `已${row.enabled ? "启用" : "禁用"}ID为${row.id}的配置`,
                  {
                    type: "success"
                  }
                );
              }
            }
          );
        }, 300);
      })
      .catch(() => {
        row.enabled ? (row.enabled = 0) : (row.enabled = 1);
      });
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}早安问候配置`,
      props: {
        formInline: {
          id: row?.id ?? "",
          targetUserId: row?.targetUserId ?? "",
          sendDate: row?.sendDate ?? "",
          enabled: row?.enabled ?? 1,
          remark: row?.remark ?? ""
        }
      },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        const msg = `您${title}了目标用户为${curData.targetUserId}的这条数据`;
        function chores() {
          done();
          onSearch();
        }
        FormRef.validate(valid => {
          if (valid) {
            const api =
              title === "新增" ? addMorningGreeting : updateMorningGreeting;
            api(curData)
              .then(r => {
                if (r.code === 200) {
                  message(msg + `${r.msg}`, { type: "success" });
                } else {
                  message(msg + `${r.msg}`, { type: "error" });
                }
              })
              .finally(() => {
                chores();
              });
          }
        });
      }
    });
  }

  return {
    form,
    loading,
    dataList,
    pagination,
    columns,
    userOptions,
    enabledOptions,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
