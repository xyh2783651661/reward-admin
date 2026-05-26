import dayjs from "dayjs";
import editForm from "./form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "./utils/types";
import { deviceDetection } from "@pureadmin/utils";
import {
  getLoveRecordPage,
  deleteLoveRecord,
  addLoveRecord,
  updateLoveRecord
} from "@/api/love";
import { type Ref, ref, h } from "vue";
import type { PaginationProps } from "@pureadmin/table";
import { reactive, toRaw, onMounted } from "vue";

export function useLoveRecords(_tableRef?: Ref) {
  const formRef = ref();

  const form = reactive({
    date: "",
    current: 1,
    size: 10
  });

  const dataList = ref([]);
  const loading = ref(true);

  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const columns: TableColumnList = [
    { label: "ID", prop: "id", minWidth: 80 },
    {
      label: "日期",
      prop: "date",
      minWidth: 120,
      formatter: ({ date }) => date || "-"
    },
    { label: "内容", prop: "text", minWidth: 300 },
    { label: "心情", prop: "mood", minWidth: 100 },
    {
      label: "地点",
      prop: "location",
      minWidth: 150,
      formatter: ({ location }) => location?.name || "-"
    },
    {
      label: "媒体数",
      prop: "mediaIds",
      minWidth: 90,
      formatter: ({ mediaIds }) =>
        Array.isArray(mediaIds) ? mediaIds.length : 0
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 160, slot: "operation" }
  ];

  async function onSearch() {
    loading.value = true;
    try {
      const { data } = await getLoveRecordPage(toRaw(form));
      dataList.value = data.records ?? [];
      pagination.total = data.total ?? 0;
      pagination.pageSize = data.size ?? form.size;
      pagination.currentPage = data.current ?? form.current;
    } catch {
      dataList.value = [];
      pagination.total = 0;
    } finally {
      loading.value = false;
    }
  }

  function resetForm(formEl: any) {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  }

  function handleDelete(row: any) {
    deleteLoveRecord(row.id)
      .then(r => {
        if (r.code === 200) {
          message(`已删除ID为${row.id}的记录`, { type: "success" });
        }
      })
      .finally(() => {
        onSearch();
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

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}记录`,
      props: {
        formInline: {
          id: row?.id ?? "",
          date: row?.date ?? "",
          text: row?.text ?? "",
          mood: row?.mood ?? "",
          location: row?.location ?? {
            name: "",
            latitude: 0,
            longitude: 0
          },
          mediaIds: row?.mediaIds ?? []
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
        FormRef.validate((valid: boolean) => {
          if (valid) {
            const api =
              title === "新增"
                ? addLoveRecord
                : () => updateLoveRecord(curData.id, curData);
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
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange
  };
}
