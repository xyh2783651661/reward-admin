import dayjs from "dayjs";
import editForm from "../form.vue";
import recipientForm from "../recipient-form.vue";
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
  holidayDate: null,
  lunarMonth: null,
  lunarDay: null,
  repeatType: "FIXED_DATE",
  repeatMonth: null,
  repeatWeekday: null,
  repeatOrdinal: null,
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
    repeatType: row?.repeatType ?? defaults.repeatType,
    repeatMonth:
      typeof row?.repeatMonth === "number"
        ? row.repeatMonth
        : defaults.repeatMonth,
    repeatWeekday:
      typeof row?.repeatWeekday === "number"
        ? row.repeatWeekday
        : defaults.repeatWeekday,
    repeatOrdinal:
      typeof row?.repeatOrdinal === "number"
        ? row.repeatOrdinal
        : defaults.repeatOrdinal,
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
    repeatType: formInline.repeatType,
    holidayType: formInline.holidayType,
    status: formInline.status,
    sortOrder: formInline.sortOrder ?? 0,
    description: formInline.description ?? ""
  };

  if (formInline.id !== undefined) {
    payload.id = formInline.id;
  }

  if (!payload.holidayName) {
    throw new Error("节假日名称为必填项");
  }

  if (!payload.repeatType) {
    throw new Error("重复类型为必选项");
  }

  if (!payload.holidayType) {
    throw new Error("节假日类型为必选项");
  }

  // 根据 repeatType 填充对应的日期字段
  switch (formInline.repeatType) {
    case "FIXED_DATE":
      if (!formInline.holidayDate) {
        throw new Error("固定公历日期类型必须填写公历日期");
      }
      payload.holidayDate = formInline.holidayDate;
      break;

    case "LUNAR":
      if (
        formInline.lunarMonth === null ||
        formInline.lunarMonth === undefined
      ) {
        throw new Error("农历日期类型必须填写农历月份");
      }
      if (formInline.lunarDay === null || formInline.lunarDay === undefined) {
        throw new Error("农历日期类型必须填写农历日期");
      }
      payload.lunarMonth = formInline.lunarMonth;
      payload.lunarDay = formInline.lunarDay;
      break;

    case "WEEKDAY_OF_MONTH":
      if (
        formInline.repeatMonth === null ||
        formInline.repeatMonth === undefined
      ) {
        throw new Error("某月第N个星期几类型必须填写月份");
      }
      if (
        formInline.repeatWeekday === null ||
        formInline.repeatWeekday === undefined
      ) {
        throw new Error("某月第N个星期几类型必须填写星期几");
      }
      if (
        formInline.repeatOrdinal === null ||
        formInline.repeatOrdinal === undefined
      ) {
        throw new Error("某月第N个星期几类型必须填写第几个");
      }
      payload.repeatMonth = formInline.repeatMonth;
      payload.repeatWeekday = formInline.repeatWeekday;
      payload.repeatOrdinal = formInline.repeatOrdinal;
      break;

    case "LAST_DAY_OF_MONTH":
      if (
        formInline.repeatMonth === null ||
        formInline.repeatMonth === undefined
      ) {
        throw new Error("某月最后一天类型必须填写月份");
      }
      payload.repeatMonth = formInline.repeatMonth;
      break;
  }

  return payload;
}

export function useHolidayConfig() {
  const form = reactive<SysHolidayConfigPageReq>({
    current: 1,
    size: 10,
    holidayName: "",
    holidayType: "",
    status: ""
  });
  const formRef = ref();
  const recipientFormRef = ref();
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

  const holidayTypeLabelMap = computed(() => {
    return new Map(
      formOptions.value.holidayTypes.map(item => [item.value, item.label])
    );
  });

  // repeatType 到中文的映射
  const repeatTypeLabelMap: Record<string, string> = {
    FIXED_DATE: "固定公历日期",
    LUNAR: "农历日期",
    WEEKDAY_OF_MONTH: "某月第N个星期几",
    LAST_DAY_OF_MONTH: "某月最后一天"
  };

  // 星期几到中文的映射
  const weekdayLabelMap: Record<number, string> = {
    1: "周一",
    2: "周二",
    3: "周三",
    4: "周四",
    5: "周五",
    6: "周六",
    7: "周日"
  };

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
      label: "日期信息",
      prop: "dateInfo",
      minWidth: 180,
      cellRenderer: ({ row }) => {
        const {
          repeatType,
          holidayDate,
          lunarMonth,
          lunarDay,
          repeatMonth,
          repeatWeekday,
          repeatOrdinal
        } = row;

        switch (repeatType) {
          case "FIXED_DATE":
            return (
              <span>
                {holidayDate ? dayjs(holidayDate).format("YYYY-MM-DD") : "-"}
              </span>
            );

          case "LUNAR":
            return lunarMonth && lunarDay ? (
              <span>
                农历{lunarMonth}月{lunarDay}日
              </span>
            ) : (
              <span>-</span>
            );

          case "WEEKDAY_OF_MONTH":
            if (repeatMonth && repeatWeekday && repeatOrdinal) {
              const ordinalText =
                repeatOrdinal === -1 ? "最后一个" : `第${repeatOrdinal}个`;
              return (
                <span>
                  {repeatMonth}月{ordinalText}
                  {weekdayLabelMap[repeatWeekday] ?? `周${repeatWeekday}`}
                </span>
              );
            }
            return <span>-</span>;

          case "LAST_DAY_OF_MONTH":
            return repeatMonth ? (
              <span>{repeatMonth}月最后一天</span>
            ) : (
              <span>-</span>
            );

          default:
            return <span>-</span>;
        }
      }
    },
    {
      label: "重复类型",
      prop: "repeatType",
      minWidth: 120,
      cellRenderer: ({ row }) => (
        <span>
          {repeatTypeLabelMap[row.repeatType] ?? row.repeatType ?? "-"}
        </span>
      )
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
      width: 200,
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
      const tasks: Array<Promise<unknown>> = [loadOptions()];

      if (isEdit && row?.id !== undefined) {
        tasks.push(
          getHolidayConfigDetail<SysHolidayConfig>(row.id).then(
            result => result.data
          )
        );
      }

      const result = await Promise.all(tasks);
      currentRow = normalizeFormInline(
        isEdit ? (result[1] as SysHolidayConfig) : row
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
        formOptions: formOptions.value
      },
      width: "680px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline: currentRow,
          formOptions: formOptions.value
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as SysHolidayConfig;

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

  async function openRecipientDialog(row: SysHolidayConfig) {
    if (!row?.id) return;

    let selectedIds: number[] = [];

    try {
      const [, holidayRecipientResult] = await Promise.all([
        loadRecipientOptions(),
        getHolidayRecipientList(row.id)
      ]);
      selectedIds = (holidayRecipientResult?.data ?? []).map(
        item => item.recipientId
      );
    } catch (error) {
      message(getErrorMessage(error, "加载收件人数据失败"), {
        type: "error"
      });
      return;
    }

    addDialog({
      title: `收件人关联 - ${row.holidayName}`,
      props: {
        holidayId: row.id,
        holidayName: row.holidayName,
        recipientOptions: recipientOptions.value,
        selectedRecipientIds: selectedIds
      },
      width: "800px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(recipientForm, {
          ref: recipientFormRef,
          holidayId: row.id,
          holidayName: row.holidayName,
          recipientOptions: recipientOptions.value,
          selectedRecipientIds: selectedIds
        }),
      beforeSure: async (done, { closeLoading }) => {
        const curRecipientIds = recipientFormRef.value?.getRecipientIds() ?? [];

        try {
          const result = await updateHolidayRecipient({
            holidayId: row.id,
            recipientIds: curRecipientIds
          });

          if (result.code !== 200) {
            throw new Error(result.msg || "更新收件人关联失败");
          }

          message("收件人关联更新成功", {
            type: "success"
          });
          done();
        } catch (error) {
          closeLoading();
          message(getErrorMessage(error, "更新收件人关联失败"), {
            type: "error"
          });
        }
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
    onSearch,
    resetForm,
    openDialog,
    openRecipientDialog,
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
