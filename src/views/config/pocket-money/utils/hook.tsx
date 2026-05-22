import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { deviceDetection } from "@pureadmin/utils";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import type { PaginationProps } from "@pureadmin/table";
import {
  getPocketMoneyRulePage,
  getPocketMoneyRuleOptions,
  exportPocketMoneyRuleExcel,
  addPocketMoneyRule,
  updatePocketMoneyRule,
  deletePocketMoneyRule
} from "@/api/system";
import { reactive, ref, onMounted, h, toRaw } from "vue";

export function useRole() {
  const form = reactive({
    ruleKey: "",
    ruleType: "",
    description: "",
    current: 1,
    size: 10
  });
  const formRef = ref();
  const dataList = ref([]);
  const loading = ref(true);
  const exportLoading = ref(false);
  const ruleKeyOptions = ref<string[]>([]);
  const ruleTypeOptions = ref<{ label: string; value: string }[]>([]);
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
      label: "规则标识",
      prop: "ruleKey",
      minWidth: 160
    },
    {
      label: "规则类型",
      prop: "ruleType",
      minWidth: 100
    },
    {
      label: "金额数值",
      prop: "ruleValue",
      minWidth: 100
    },
    {
      label: "规则描述",
      prop: "description",
      minWidth: 180
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 160,
      formatter: ({ createdTime }) =>
        dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 160,
      formatter: ({ updatedTime }) =>
        dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 140,
      slot: "operation"
    }
  ];

  function handleDelete(row) {
    deletePocketMoneyRule(row.id).then(r => {
      if (r.code === 200) {
        message(r.msg, { type: "success" });
      } else {
        message(r.msg, { type: "error" });
      }
    });
    onSearch();
    fetchOptions();
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

  function handleSelectionChange(val) {
    console.log("handleSelectionChange", val);
  }

  async function fetchOptions() {
    const { data } = await getPocketMoneyRuleOptions();
    ruleKeyOptions.value = data.ruleKeys ?? [];
    ruleTypeOptions.value = data.ruleTypeOptions ?? [];
  }

  async function onSearch() {
    loading.value = true;
    const { data } = await getPocketMoneyRulePage(toRaw(form));
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

  async function exportExcel() {
    if (exportLoading.value) return;

    exportLoading.value = true;
    try {
      const blob = await exportPocketMoneyRuleExcel(toRaw(form));

      const fileName = "零花钱规则.xlsx";
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
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    const formInlineData = {
      id: row?.id ?? "",
      ruleKey: row?.ruleKey ?? "",
      ruleType: row?.ruleType ?? "",
      ruleValue: row?.ruleValue ?? "",
      description: row?.description ?? ""
    };
    addDialog({
      title: `${title}零花钱规则`,
      props: {
        formInline: formInlineData
      },
      width: "40%",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline: formInlineData,
          ruleKeyOptions: ruleKeyOptions.value,
          ruleTypeOptions: ruleTypeOptions.value
        }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        function chores() {
          done();
          onSearch();
          fetchOptions();
        }
        FormRef.validate(valid => {
          if (valid) {
            if (title === "新增") {
              addPocketMoneyRule(curData)
                .then(r => {
                  if (r.code === 200) {
                    message(r.msg, { type: "success" });
                  } else {
                    message(r.msg, { type: "error" });
                  }
                })
                .finally(() => {
                  chores();
                });
            } else {
              updatePocketMoneyRule(curData)
                .then(r => {
                  if (r.code === 200) {
                    message(r.msg, { type: "success" });
                  } else {
                    message(r.msg, { type: "error" });
                  }
                })
                .finally(() => {
                  chores();
                });
            }
          }
        });
      }
    });
  }

  onMounted(() => {
    fetchOptions();
    onSearch();
  });

  return {
    form,
    loading,
    exportLoading,
    ruleKeyOptions,
    ruleTypeOptions,
    columns,
    dataList,
    pagination,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    exportExcel,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
