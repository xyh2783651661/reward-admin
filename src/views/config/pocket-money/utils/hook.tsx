import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { useCrudDialog } from "@/hooks/useCrudDialog";
import type { FormItemProps } from "../utils/types";
import type { SearchField } from "@/components/ReSearchBar/types";
import {
  getPocketMoneyRulePage,
  getPocketMoneyRuleOptions,
  exportPocketMoneyRuleExcel,
  addPocketMoneyRule,
  updatePocketMoneyRule,
  deletePocketMoneyRule
} from "@/api/system";
import { useCrudTable, useTableExport } from "../../composables";
import { computed, ref, onMounted } from "vue";

export function usePocketMoneyRule() {
  const ruleKeyOptions = ref<{ label: string; value: string }[]>([]);
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
    deleteMessage: row => `已删除规则「${row.ruleKey}」`,
    onDeleteSuccess: () => fetchOptions()
  });

  const { exportLoading, exportExcel } = useTableExport(
    exportPocketMoneyRuleExcel,
    "零花钱规则.xlsx",
    () => form
  );

  const searchFields = computed<SearchField[]>(() => [
    {
      prop: "ruleKey",
      label: "规则标识",
      type: "select",
      options: ruleKeyOptions.value
    },
    {
      prop: "ruleType",
      label: "规则类型",
      type: "select",
      options: ruleTypeOptions.value
    },
    { prop: "description", label: "规则描述", type: "input" }
  ]);

  const columns: TableColumnList = [
    { label: "ID", prop: "id", width: 80, hide: true },
    { label: "规则标识", prop: "ruleKey", minWidth: 160, sortable: true },
    { label: "规则类型", prop: "ruleType", minWidth: 100 },
    {
      label: "金额数值",
      prop: "ruleValue",
      minWidth: 100,
      align: "right",
      sortable: true,
      formatter: ({ ruleValue }) =>
        ruleValue === null || ruleValue === undefined || ruleValue === ""
          ? "-"
          : ruleValue
    },
    {
      label: "规则描述",
      prop: "description",
      minWidth: 200,
      showOverflowTooltip: true,
      formatter: ({ description }) => description || "-"
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      width: 168,
      sortable: true,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "创建时间",
      prop: "createdTime",
      width: 168,
      hide: true,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    { label: "操作", fixed: "right", width: 140, slot: "operation" }
  ];

  async function fetchOptions() {
    try {
      const { data } = await getPocketMoneyRuleOptions();
      ruleKeyOptions.value = data?.ruleKeys ?? [];
      ruleTypeOptions.value = data?.ruleTypeOptions ?? [];
    } catch (error) {
      message(getErrorMessage(error, "加载规则选项失败"), { type: "error" });
    }
  }

  const { open } = useCrudDialog<FormItemProps>({
    title: "零花钱规则",
    formComponent: editForm,
    width: "680px",
    defaultForm: row => ({
      id: row?.id ?? "",
      ruleKey: row?.ruleKey ?? "",
      ruleType: row?.ruleType ?? "",
      ruleValue: row?.ruleValue ?? "",
      description: row?.description ?? ""
    }),
    extraProps: () => ({
      ruleKeyOptions: ruleKeyOptions.value,
      ruleTypeOptions: ruleTypeOptions.value
    }),
    submitApi: (payload, mode) =>
      mode === "新增"
        ? addPocketMoneyRule(payload)
        : updatePocketMoneyRule(payload)
  });

  function openDialog(title: "新增" | "修改" = "新增", row?: FormItemProps) {
    void open(title, row, () => {
      onSearch();
      fetchOptions();
    });
  }

  onMounted(() => {
    fetchOptions();
  });

  return {
    form,
    loading,
    exportLoading,
    searchFields,
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
