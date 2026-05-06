import dayjs from "dayjs";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { usePublicHooks } from "../../hooks";
import { addDialog } from "@/components/ReDialog";
import type { PaginationProps } from "@pureadmin/table";
import { deviceDetection } from "@pureadmin/utils";
import {
  addSystemConfig,
  deleteSystemConfig,
  getSystemConfigDetail,
  getSystemConfigList,
  getSystemConfigOptions,
  updateSystemConfig
} from "@/api/system";
import { computed, h, reactive, ref, toRaw } from "vue";
import type {
  ToggleValue,
  OptionItem,
  SystemConfigItem,
  SystemConfigPageReq,
  SystemConfigOptions,
  SystemConfigValueType
} from "./types";

const DEFAULT_FORM_INLINE: SystemConfigItem = {
  id: "",
  configKey: "",
  configValue: "",
  configGroup: "",
  valueType: "string",
  description: "",
  status: 1,
  sensitive: 0
};

const DEFAULT_FORM_OPTIONS: SystemConfigOptions = {
  valueTypes: [],
  statusOptions: [],
  sensitiveOptions: [],
  groups: []
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
  row?: Partial<SystemConfigItem> | null
): SystemConfigItem {
  const defaults = cloneDefaultFormInline();

  return {
    ...defaults,
    ...row,
    id: row?.id ?? defaults.id,
    configKey: String(row?.configKey ?? defaults.configKey),
    configValue: String(row?.configValue ?? defaults.configValue),
    configGroup: String(row?.configGroup ?? defaults.configGroup),
    valueType:
      (row?.valueType as SystemConfigValueType | "") || defaults.valueType,
    description: String(row?.description ?? defaults.description),
    status:
      typeof row?.status === "number"
        ? (row.status as ToggleValue)
        : defaults.status,
    sensitive:
      typeof row?.sensitive === "number"
        ? (row.sensitive as ToggleValue)
        : defaults.sensitive
  };
}

function normalizeFormOptions(
  options?: Partial<SystemConfigOptions> | null
): SystemConfigOptions {
  return {
    valueTypes: options?.valueTypes ?? [],
    statusOptions: options?.statusOptions ?? [],
    sensitiveOptions: options?.sensitiveOptions ?? [],
    groups: options?.groups ?? []
  };
}

function getOptionLabel<T>(
  options: Array<OptionItem<T>>,
  value: T | string | number | ""
) {
  return options.find(item => item.value === value)?.label ?? value ?? "-";
}

function buildSubmitPayload(formInline: SystemConfigItem) {
  const payload = {
    id: formInline.id,
    configKey: formInline.configKey.trim(),
    configValue: formInline.configValue ?? "",
    configGroup: formInline.configGroup.trim(),
    valueType: formInline.valueType || "string",
    description: formInline.description ?? "",
    status: formInline.status,
    sensitive: formInline.sensitive
  };

  if (!payload.configKey) {
    throw new Error("配置 Key 为必填项");
  }

  if (payload.valueType === "json" && payload.configValue.trim()) {
    payload.configValue = JSON.stringify(JSON.parse(payload.configValue));
  }

  return payload;
}

export function useSystemConfig() {
  const form = reactive<SystemConfigPageReq>({
    current: 1,
    size: 10,
    configKey: "",
    configGroup: "",
    valueType: "",
    status: "",
    sensitive: ""
  });
  const formRef = ref();
  const dataList = ref<SystemConfigItem[]>([]);
  const loading = ref(true);
  const optionsLoading = ref(false);
  const switchLoadMap = ref<Record<number, { loading?: boolean }>>({});
  const formOptions = ref<SystemConfigOptions>(DEFAULT_FORM_OPTIONS);
  const { switchStyle } = usePublicHooks();
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const valueTypeLabelMap = computed(() => {
    return new Map(
      formOptions.value.valueTypes.map(item => [item.value, item.label])
    );
  });

  const columns: TableColumnList = [
    {
      label: "ID",
      prop: "id",
      width: 88
    },
    {
      label: "配置 Key",
      prop: "configKey",
      minWidth: 260
    },
    {
      label: "配置值",
      prop: "configValue",
      minWidth: 260,
      cellRenderer: ({ row }) => (
        <span class="font-mono">
          {row.sensitive === 1
            ? row.configValue
              ? "******"
              : "-"
            : row.configValue || "-"}
        </span>
      )
    },
    {
      label: "配置分组",
      prop: "configGroup",
      minWidth: 140,
      formatter: ({ configGroup }) => configGroup || "-"
    },
    {
      label: "值类型",
      prop: "valueType",
      minWidth: 110,
      cellRenderer: ({ row }) => (
        <el-tag effect="plain">
          {valueTypeLabelMap.value.get(
            row.valueType as SystemConfigValueType
          ) ??
            row.valueType ??
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
          style={switchStyle.value}
          onChange={() => onStatusChange(scope as any)}
        />
      )
    },
    {
      label: "敏感标识",
      prop: "sensitive",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-tag type={row.sensitive === 1 ? "danger" : "info"} effect="plain">
          {getOptionLabel(
            formOptions.value.sensitiveOptions,
            row.sensitive as ToggleValue
          )}
        </el-tag>
      )
    },
    {
      label: "说明",
      prop: "description",
      minWidth: 220,
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
      const { data } = await getSystemConfigOptions<SystemConfigOptions>();
      formOptions.value = normalizeFormOptions(data);
    } catch (error) {
      message(getErrorMessage(error, "加载配置选项失败"), {
        type: "error"
      });
    } finally {
      optionsLoading.value = false;
    }
  }

  async function onSearch() {
    loading.value = true;

    try {
      const { data } = await getSystemConfigList<SystemConfigItem>(toRaw(form));
      dataList.value = data?.records ?? [];
      pagination.total = data?.total ?? 0;
      pagination.pageSize = data?.size ?? 10;
      pagination.currentPage = data?.current ?? 1;
    } catch (error) {
      dataList.value = [];
      pagination.total = 0;
      message(getErrorMessage(error, "加载系统配置失败"), {
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

  async function openDialog(title = "新增", row?: SystemConfigItem) {
    const isEdit = title !== "新增" && row?.id !== undefined && row?.id !== "";
    let currentRow = cloneDefaultFormInline();

    try {
      const tasks: Array<Promise<unknown>> = [loadOptions()];

      if (isEdit && row?.id !== undefined) {
        tasks.push(
          getSystemConfigDetail<SystemConfigItem>(row.id).then(
            result => result.data
          )
        );
      }

      const result = await Promise.all(tasks);
      currentRow = normalizeFormInline(
        isEdit ? (result[1] as SystemConfigItem) : row
      );
    } catch (error) {
      message(getErrorMessage(error, `${title}数据加载失败`), {
        type: "error"
      });
      return;
    }

    addDialog({
      title: `${title}配置`,
      props: {
        formInline: currentRow,
        formOptions: formOptions.value
      },
      width: "720px",
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
        const curData = options.props.formInline as SystemConfigItem;

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
              ? await updateSystemConfig(payload)
              : await addSystemConfig(payload);

            if (result.code !== 200) {
              throw new Error(result.msg || `${title}失败`);
            }

            message(`${title}配置成功`, {
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
          row.configKey
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
      const result = await updateSystemConfig({
        id: row.id,
        status: targetStatus
      });

      if (result.code !== 200) {
        throw new Error(result.msg || "状态更新失败");
      }

      message(`已${targetStatus === 1 ? "启用" : "禁用"}${row.configKey}`, {
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

  function handleDelete(row: SystemConfigItem) {
    deleteSystemConfig(row.id as string | number)
      .then(result => {
        if (result.code !== 200) {
          throw new Error(result.msg || "删除失败");
        }

        message(`已删除配置 ${row.configKey}`, {
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

  function handleSelectionChange(val: SystemConfigItem[]) {
    console.log("handleSelectionChange", val);
  }

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
    handleDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
