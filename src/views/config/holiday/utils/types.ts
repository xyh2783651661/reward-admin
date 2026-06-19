type ToggleValue = 0 | 1;

interface OptionItem<T = string | number> {
  label: string;
  value: T;
}

interface SysHolidayConfig {
  id?: number;
  holidayName: string;
  holidayDate: string;
  lunarMonth: number | null;
  lunarDay: number | null;
  holidayType: string;
  status: ToggleValue;
  sortOrder: number;
  description: string;
  createdTime?: string;
  updatedTime?: string;
  deleted?: number;
}

interface SysHolidayConfigPageReq {
  current: number;
  size: number;
  holidayName: string;
  holidayDate: string;
  lunarMonth: number | null;
  lunarDay: number | null;
  holidayType: string;
  status: ToggleValue | "";
  sortOrder: number | null;
  description: string;
}

interface SysHolidayOptions {
  holidayTypes: Array<OptionItem<string>>;
  statusOptions: Array<OptionItem<ToggleValue>>;
}

interface SysHolidayRecipient {
  id: number;
  holidayId: number;
  recipientId: number;
  remark: string;
  createdTime?: string;
  updatedTime?: string;
  deleted?: number;
}

interface SysHolidayRecipientReq {
  holidayId: number;
  recipientIds?: number[];
  remark?: string;
}

interface RecipientOption {
  id: number;
  name: string;
  email: string;
}

interface FormProps {
  formInline: SysHolidayConfig;
  formOptions: SysHolidayOptions;
}

export type {
  ToggleValue,
  FormProps,
  OptionItem,
  SysHolidayConfig,
  SysHolidayConfigPageReq,
  SysHolidayOptions,
  SysHolidayRecipient,
  SysHolidayRecipientReq,
  RecipientOption
};
