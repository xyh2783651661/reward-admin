interface FormItemProps {
  id?: string | number;
  title: string;
  anniversaryDate: string;
  anniversaryType: string; // e.g. "DATE"
  repeatType: string; // e.g. "YEARLY", "MONTHLY", "NONE"
  remark: string;
  remindDays: number | string;
  status: number | string; // 1=启用
}

interface FormProps {
  formInline: FormItemProps;
}

export type { FormItemProps, FormProps };
