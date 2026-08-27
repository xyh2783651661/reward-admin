interface FormItemProps {
  id: string;
  /** 目标用户 ID（来自用户列表） */
  targetUserId: number | "";
  /** 发送日期，留空表示每天发送；格式 YYYY-MM-DD */
  sendDate: string;
  /** 1=启用 0=禁用 */
  enabled: number;
  remark: string;
}

interface FormProps {
  formInline: FormItemProps;
}

export type { FormItemProps, FormProps };
