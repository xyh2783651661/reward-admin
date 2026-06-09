import editForm from "./form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "./utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  getAnniversaryList,
  addAnniversary,
  updateAnniversary,
  deleteAnniversary
} from "@/api/love";
import { type Ref, ref, h, onMounted } from "vue";

type AnniversaryRecord = FormItemProps & {
  date?: string;
  type?: string;
  countdownDays?: number;
  createdAt?: string;
  updatedAt?: string;
  extra?: Record<string, any>;
};

function getAnniversaryRows(data: unknown): AnniversaryRecord[] {
  if (Array.isArray(data)) return data as AnniversaryRecord[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { anniversaries?: unknown }).anniversaries)
  ) {
    return (data as { anniversaries: AnniversaryRecord[] }).anniversaries;
  }

  return [];
}

function normalizeAnniversary(row: AnniversaryRecord): AnniversaryRecord {
  return {
    ...row,
    anniversaryDate: row.anniversaryDate ?? row.date ?? "",
    anniversaryType: row.anniversaryType ?? row.type ?? "OTHER",
    repeatType: row.repeatType ?? "yearly",
    remindDays: row.remindDays ?? row.countdownDays ?? "",
    status: row.status ?? 1
  };
}

export function useAnniversaries(_tableRef?: Ref) {
  const formRef = ref();
  const dataList = ref<AnniversaryRecord[]>([]);
  const loading = ref(true);

  const columns: TableColumnList = [
    { label: "ID", prop: "id", minWidth: 80 },
    { label: "标题", prop: "title", minWidth: 200 },
    {
      label: "日期",
      prop: "anniversaryDate",
      minWidth: 120,
      formatter: ({ anniversaryDate }) => anniversaryDate || "-"
    },
    { label: "类型", prop: "anniversaryType", minWidth: 100 },
    { label: "重复", prop: "repeatType", minWidth: 100 },
    { label: "提醒天数", prop: "remindDays", minWidth: 100 },
    {
      label: "状态",
      prop: "status",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.status === 1 ? "success" : "danger"}
          effect="plain"
        >
          {row.status === 1 ? "启用" : "停用"}
        </el-tag>
      )
    },
    { label: "备注", prop: "remark", minWidth: 200 },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getAnniversaryList();
      dataList.value = getAnniversaryRows(data).map(normalizeAnniversary);
    } catch (error) {
      console.error(error);
      dataList.value = [];
      message("加载纪念日列表失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  function handleDelete(row: any) {
    deleteAnniversary(row.id)
      .then(r => {
        if (r.code === 200) {
          message(`已删除${row.title}`, { type: "success" });
        }
      })
      .finally(() => {
        onSearch();
      });
  }

  function openDialog(title = "新增", row?: AnniversaryRecord) {
    addDialog({
      title: `${title}纪念日`,
      props: {
        formInline: {
          id: row?.id ?? "",
          title: row?.title ?? "",
          anniversaryDate: row?.anniversaryDate ?? row?.date ?? "",
          anniversaryType: row?.anniversaryType ?? row?.type ?? "DATE",
          repeatType: row?.repeatType ?? "yearly",
          remark: row?.remark ?? "",
          remindDays: row?.remindDays ?? 3,
          status: row?.status ?? 1
        }
      },
      width: "45%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef, formInline: null }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        FormRef.validate((valid: boolean) => {
          if (valid) {
            const api =
              title === "新增"
                ? addAnniversary
                : () => updateAnniversary(curData.id, curData);
            api(curData)
              .then(r => {
                message(r.msg, {
                  type: r.code === 200 ? "success" : "error"
                });
              })
              .finally(() => {
                done();
                onSearch();
              });
          }
        });
      }
    });
  }

  onMounted(() => {
    onSearch();
  });

  return {
    loading,
    columns,
    dataList,
    onSearch,
    openDialog,
    handleDelete
  };
}
