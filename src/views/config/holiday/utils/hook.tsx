import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { deviceDetection } from "@pureadmin/utils";
import {
  getHolidayConfigPage,
  getHolidayConfigDetail,
  getHolidayConfigOptions,
  addHolidayConfig,
  updateHolidayConfig,
  deleteHolidayConfig,
  getHolidayRecipientList,
  updateHolidayRecipient
} from "@/api/system";
import { getMailRecipientList } from "@/api/mail";
import { computed, h, reactive, ref, toRaw } from "vue";
import type {
  ToggleValue,
  OptionItem,
  SysHolidayConfig,
  SysHolidayConfigPageReq,
  SysHolidayOptions,
  RecipientOption
} from "./types";

const DEFAULT_FORM_INLINE: SysHolidayConfig = {
  id: undefined,
  holidayName: "",
  holidayDate: "",
  lunarMonth: null,
  lunarDay: null,
  holidayType: "",
  status: 1,
  sortOrder: 0,
  description: ""
};

const DEFAULT_FORM_OPTIONS: SysHolidayOptions = {
  holidayTypes: [],
  statusOptions: []
};

function getErrorMessage(error: unknown, fallback = "操作失败") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function cloneDefaultFormInline() {
  return {
    ...DEFAULT_FORM_INLINE
  };
}

function normalizeFormInline(
  row?: Partial<SysHolidayConfig> | null
): SysHolidayConfig {
  const defaults = cloneDefaultFormInline();

  return {
    ...defaults,
    ...row,
    id: row?.id ?? defaults.id,
    holidayName: String(row?.holidayName ?? defaults.holidayName),
    holidayDate: row?.holidayDate ?? defaults.holidayDate,
    lunarMonth:
      typeof row?.lunarMonth === "number"
        ? row.lunarMonth
        : defaults.lunarMonth,
    lunarDay:
      typeof row?.lunarDay === "number" ? row.lunarDay : defaults.lunarDay,
    holidayType: String(row?.holidayType ?? defaults.holidayType),
    status:
      typeof row?.status === "number"
        ? (row.status as ToggleValue)
        : defaults.status,
    sortOrder:
      typeof row?.sortOrder === "number" ? row.sortOrder : defaults.sortOrder,
    description: String(row?.description ?? defaults.description)
  };
}

function normalizeFormOptions(
  options?: Partial<SysHolidayOptions> | null
): SysHolidayOptions {
  return {
    holidayTypes: options?.holidayTypes ?? [],
    statusOptions: options?.statusOptions ?? []
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getOptionLabel<T>(
  options: Array<OptionItem<T>>,
  value: T | string | number | ""
) {
  return options.find(item => item.value === value)?.label ?? value ?? "-";
}

function buildSubmitPayload(formInline: SysHolidayConfig) {
  const payload: Record<string, any> = {
    holidayName: formInline.holidayName.trim(),
    holidayType: formInline.holidayType,
    status: formInline.status,
    sortOrder: formInline.sortOrder ?? 0,
    description: formInline.description ?? ""
  };

  if (formInline.id !== undefined) {
    payload.id = formInline.id;
  }

  if (formInline.holidayDate) {
    payload.holidayDate = formInline.holidayDate;
  }

  if (formInline.lunarMonth !== null && formInline.lunarMonth !== undefined) {
    payload.lunarMonth = formInline.lunarMonth;
  }

  if (formInline.lunarDay !== null && formInline.lunarDay !== undefined) {
    payload.lunarDay = formInline.lunarDay;
  }

  if (!payload.holidayName) {
    throw new Error("节假日名称为必填项");
  }

  if (!payload.holidayType) {
    throw new Error("节假日类型为必选项");
  }

  const hasHolidayDate = !!payload.holidayDate;
  const hasLunarDate =
    payload.lunarMonth !== null &&
    payload.lunarMonth !== undefined &&
    payload.lunarDay !== null &&
    payload.lunarDay !== undefined;

  if (!hasHolidayDate && !hasLunarDate) {
    throw new Error("公历日期和农历日期至少填写一项");
  }

  return payload;
}

export function useHolidayConfig() {
  const form = reactive<SysHolidayConfigPageReq>({
    current: 1,
    size: 10,
    holidayName: "",
    holidayDate: "",
    lunarMonth: null,
    lunarDay: null,
    holidayType: "",
    status: "",
    sortOrder: null,
    description: ""
  });
  const formRef = ref();
  const dataList = ref<SysHolidayConfig[]>([]);
  const loading = ref(true);
  const optionsLoading = ref(false);
  const switchLoadMap = ref<Record<number, { loading?: boolean }>>({});
  const formOptions = ref<SysHolidayOptions>(DEFAULT_FORM_OPTIONS);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });

  const recipientOptions = ref<RecipientOption[]>([]);
  const selectedRecipientIds = ref<number[]>([]);

  const holidayTypeLabelMap = computed(() => {
    return new Map(
      formOptions.value.holidayTypes.map(item => [item.value, item.label])
    );
  });

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      width: 80
    },
    {
      label: "节假日名称",
      prop: "holidayName",
      minWidth: 140
    },
    {
      label: "公历日期",
      prop: "holidayDate",
      minWidth: 120,
      formatter: ({ holidayDate }) =>
        holidayDate ? dayjs(holidayDate).format("YYYY-MM-DD") : "-"
    },
    {
      label: "农历日期",
      prop: "lunarDate",
      minWidth: 120,
      cellRenderer: ({ row }) => {
        if (row.lunarMonth && row.lunarDay) {
          return (
            <span>
              {row.lunarMonth}月{row.lunarDay}日
            </span>
          );
        }
        return <span>-</span>;
      }
    },
    {
      label: "节假日类型",
      prop: "holidayType",
      minWidth: 120,
      cellRenderer: ({ row }) => (
        <el-tag effect="plain">
          {holidayTypeLabelMap.value.get(row.holidayType) ??
            row.holidayType ??
            "-"}
        </el-tag>
      )
    },
    {
      label: "状态",
      prop: "status",
      minWidth: 96,
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="启用"
          inactive-text="禁用"
          inline-prompt
          onChange={() => onStatusChange(scope as any)}
        />
      )
    },
    {
      label: "排序",
      prop: "sortOrder",
      minWidth: 80
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 200,
      formatter: ({ description }) => description || "-"
    },
    {
      label: "更新时间",
      prop: "updatedTime",
      minWidth: 168,
      formatter: ({ updatedTime }) =>
        updatedTime ? dayjs(updatedTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "创建时间",
      prop: "createdTime",
      minWidth: 168,
      formatter: ({ createdTime }) =>
        createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
    },
    {
      label: "操作",
      fixed: "right",
      width: 140,
      slot: "operation"
    }
  ];

  async function loadOptions() {
    optionsLoading.value = true;

    try {
      const { data } = await getHolidayConfigOptions<SysHolidayOptions>();
      formOptions.value = normalizeFormOptions(data);
    } catch (error) {
      message(getErrorMessage(error, "加载配置选项失败"), {
        type: "error"
      });
    } finally {
      optionsLoading.value = false;
    }
  }

  async function loadRecipientOptions() {
    try {
      const { data } = await getMailRecipientList({ current: 1, size: 1000 });
      recipientOptions.value = (data?.records ?? []).map(item => ({
        id: item.id,
        name: item.name,
        email: item.email
      }));
    } catch (error) {
      message(getErrorMessage(error, "加载收件人列表失败"), {
        type: "error"
      });
    }
  }

  async function loadHolidayRecipients(holidayId: number) {
    try {
      const { data } = await getHolidayRecipientList(holidayId);
      selectedRecipientIds.value = (data ?? []).map(item => item.recipientId);
    } catch (error) {
      selectedRecipientIds.value = [];
      message(getErrorMessage(error, "加载收件人关联失败"), {
        type: "error"
      });
    }
  }

  async function onSearch() {
    loading.value = true;

    try {
      const { data } = await getHolidayConfigPage<SysHolidayConfig>(
        toRaw(form)
      );
      dataList.value = data?.records ?? [];
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? 10;
      pagination.currentPage = data?.current ?? 1;
    } catch (error) {
      dataList.value = [];
      pagination.total = 0;
      message(getErrorMessage(error, "加载节假日配置失败"), {
        type: "error"
      });
    } finally {
      loading.value = false;
    }
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    form.current = 1;
    onSearch();
  };

  async function openDialog(title = "新增", row?: SysHolidayConfig) {
    const isEdit = title !== "新增" && row?.id !== undefined;
    let currentRow = cloneDefaultFormInline();

    try {
      const tasks: Array<Promise<unknown>> = [
        loadOptions(),
        loadRecipientOptions()
      ];

      if (isEdit && row?.id !== undefined) {
        tasks.push(
          getHolidayConfigDetail<SysHolidayConfig>(row.id).then(
            result => result.data
          )
        );
        tasks.push(loadHolidayRecipients(row.id));
      }

      const result = await Promise.all(tasks);
      currentRow = normalizeFormInline(
        isEdit ? (result[2] as SysHolidayConfig) : row
      );
    } catch (error) {
      message(getErrorMessage(error, `${title}数据加载失败`), {
        type: "error"
      });
      return;
    }

    addDialog({
      title: `${title}节假日配置`,
      props: {
        formInline: currentRow,
        formOptions: formOptions.value,
        recipientOptions: recipientOptions.value,
        selectedRecipientIds: selectedRecipientIds.value
      },
      width: "780px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline: currentRow,
          formOptions: formOptions.value,
          recipientOptions: recipientOptions.value,
          selectedRecipientIds: selectedRecipientIds.value
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as SysHolidayConfig;
        const curRecipientIds = formRef.value?.getRecipientIds() ?? [];

        if (!FormRef) {
          closeLoading();
          return;
        }

        FormRef.validate(async valid => {
          if (!valid) {
            closeLoading();
            return;
          }

          let payload: ReturnType<typeof buildSubmitPayload>;

          try {
            payload = buildSubmitPayload(curData);
          } catch (error) {
            closeLoading();
            message(getErrorMessage(error, "表单校验失败"), {
              type: "warning"
            });
            return;
          }

          try {
            const result = isEdit
              ? await updateHolidayConfig(payload)
              : await addHolidayConfig(payload);

            if (result.code !== 200) {
              throw new Error(result.msg || `${title}失败`);
            }

            // 更新收件人关联
            const holidayId = result.data?.id;
            if (holidayId) {
              await updateHolidayRecipient({
                holidayId,
                recipientIds: curRecipientIds ?? []
              });
            }

            message(`${title}节假日配置成功`, {
              type: "success"
            });
            done();
            await Promise.all([onSearch(), loadOptions()]);
          } catch (error) {
            closeLoading();
            message(getErrorMessage(error, `${title}失败`), {
              type: "error"
            });
          }
        });
      }
    });
  }

  async function onStatusChange({ row, index }) {
    const targetStatus = row.status as ToggleValue;
    const previousStatus = targetStatus === 1 ? 0 : 1;

    try {
      await ElMessageBox.confirm(
        `确认要<strong>${
          targetStatus === 1 ? "启用" : "禁用"
        }</strong><strong style='color:var(--el-color-primary)'>${
          row.holidayName
        }</strong>吗?`,
        "系统提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
          dangerouslyUseHTMLString: true,
          draggable: true
        }
      );
    } catch {
      row.status = previousStatus;
      return;
    }

    switchLoadMap.value[index] = Object.assign({}, switchLoadMap.value[index], {
      loading: true
    });

    try {
      const result = await updateHolidayConfig({
        id: row.id,
        status: targetStatus
      });

      if (result.code !== 200) {
        throw new Error(result.msg || "状态更新失败");
      }

      message(`已${targetStatus === 1 ? "启用" : "禁用"}${row.holidayName}`, {
        type: "success"
      });
      await onSearch();
    } catch (error) {
      row.status = previousStatus;
      message(getErrorMessage(error, "状态更新失败"), {
        type: "error"
      });
    } finally {
      switchLoadMap.value[index] = Object.assign(
        {},
        switchLoadMap.value[index],
        {
          loading: false
        }
      );
    }
  }

  function handleDelete(row: SysHolidayConfig) {
    deleteHolidayConfig(row.id as number)
      .then(result => {
        if (result.code !== 200) {
          throw new Error(result.msg || "删除失败");
        }

        message(`已删除节假日配置 ${row.holidayName}`, {
          type: "success"
        });
      })
      .catch(error => {
        message(getErrorMessage(error, "删除失败"), {
          type: "error"
        });
      })
      .finally(() => {
        void Promise.all([onSearch(), loadOptions()]);
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

  function handleSelectionChange(_val: SysHolidayConfig[]) {}

  void Promise.all([onSearch(), loadOptions()]);

  return {
    form,
    formOptions,
    loading,
    optionsLoading,
    columns,
    dataList,
    pagination,
    recipientOptions,
    selectedRecipientIds,
    onSearch,
    resetForm,
    openDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
