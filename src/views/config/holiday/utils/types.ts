type ToggleValue = 0 | 1;

type RepeatType =
  | "FIXED_DATE"
  | "LUNAR"
  | "WEEKDAY_OF_MONTH"
  | "LAST_DAY_OF_MONTH";

interface OptionItem<T = string | number> {
  label: string;
  value: T;
}

interface SysHolidayConfig {
  id?: number;
  holidayName: string;
  holidayDate: string | null;
  lunarMonth: number | null;
  lunarDay: number | null;
  repeatType: RepeatType;
  repeatMonth: number | null;
  repeatWeekday: number | null;
  repeatOrdinal: number | null;
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
  holidayType: string;
  status: ToggleValue | "";
}

interface SysHolidayOptions {
  holidayTypes: Array<OptionItem<string>>;
  statusOptions: Array<OptionItem<ToggleValue>>;
  repeatTypes?: Array<OptionItem<string>>;
  weekdayOptions?: Array<OptionItem<number>>;
  ordinalOptions?: Array<OptionItem<number>>;
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
  RepeatType,
  FormProps,
  OptionItem,
  SysHolidayConfig,
  SysHolidayConfigPageReq,
  SysHolidayOptions,
  SysHolidayRecipient,
  SysHolidayRecipientReq,
  RecipientOption
};
