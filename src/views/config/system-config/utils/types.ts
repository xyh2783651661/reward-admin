type SystemConfigValueType = "string" | "int" | "double" | "boolean" | "json";

type ToggleValue = 0 | 1;

interface OptionItem<T = string | number> {
  label: string;
  value: T;
}

interface SystemConfigItem {
  id?: string | number;
  configKey: string;
  configValue: string;
  configGroup: string;
  valueType: SystemConfigValueType | "";
  description: string;
  status: ToggleValue;
  sensitive: ToggleValue;
  createdTime?: string;
  updatedTime?: string;
  deleted?: number;
}

interface SystemConfigPageReq {
  current: number;
  size: number;
  configKey: string;
  configGroup: string;
  valueType: SystemConfigValueType | "";
  status: ToggleValue | "";
  sensitive: ToggleValue | "";
}

interface SystemConfigOptions {
  valueTypes: Array<OptionItem<SystemConfigValueType>>;
  statusOptions: Array<OptionItem<ToggleValue>>;
  sensitiveOptions: Array<OptionItem<ToggleValue>>;
  groups: Array<OptionItem<string>>;
}

interface FormProps {
  formInline: SystemConfigItem;
  formOptions: SystemConfigOptions;
}

export type {
  ToggleValue,
  FormProps,
  OptionItem,
  SystemConfigItem,
  SystemConfigPageReq,
  SystemConfigOptions,
  SystemConfigValueType
};
