import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { deviceDetection } from "@pureadmin/utils";
import { addDialog } from "@/components/ReDialog";
import type { FormItemProps } from "../utils/types";
import {
  getPocketMoneyRulePage,
  getPocketMoneyRuleOptions,
  exportPocketMoneyRuleExcel,
  addPocketMoneyRule,
  updatePocketMoneyRule,
  deletePocketMoneyRule
} from "@/api/system";
import { useCrudTable, useTableExport } from "../../composables";
import { ref, onMounted, h } from "vue";

export function usePocketMoneyRule() {
  const formRef = ref();
  const ruleKeyOptions = ref<string[]>([]);
  const ruleTypeOptions = ref<{ label: string; value: string }[]>([]);

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
    searchApi: getPocketMoneyRulePage,
    deleteApi: deletePocketMoneyRule,
    defaultForm: { ruleKey: "", ruleType: "", description: "" },
    deleteMessage: row => `已删除ID为${row.id}的数据`,
    onDeleteSuccess: () => fetchOptions()
  });

  const { exportLoading, exportExcel } = useTableExport(
    exportPocketMoneyRuleExcel,
    "零花钱规则.xlsx",
    () => form
  );

  const columns: TableColumnList = [
    { label: "ID", prop: "id" },
    { label: "规则标识", prop: "ruleKey", minWidth: 160 },
    { label: "规则类型", prop: "ruleType", minWidth: 100 },
    { label: "金额数值", prop: "ruleValue", minWidth: 100 },
    { label: "规则描述", prop: "description", minWidth: 180 },
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
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  async function fetchOptions() {
    const { data } = await getPocketMoneyRuleOptions();
    ruleKeyOptions.value = data.ruleKeys ?? [];
    ruleTypeOptions.value = data.ruleTypeOptions ?? [];
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
      props: { formInline: formInlineData },
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
            const api =
              title === "新增" ? addPocketMoneyRule : updatePocketMoneyRule;
            api(curData)
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

  onMounted(() => {
    fetchOptions();
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
