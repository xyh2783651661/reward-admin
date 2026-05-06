interface FormItemProps {
  id?: string | number;
  rewardKey: string;
  rewardType: string;
  rewardValue: number | string;
  description: string;
  condition: string;
}

interface FormProps {
  formInline: FormItemProps;
}

export type { FormItemProps, FormProps };
