interface FormItemProps {
  id?: string | number;
  name: string;
  type: string;
  base: number | string;
  excellence: number | string;
  full: number | string;
}

interface FormProps {
  formInline: FormItemProps;
}

export type { FormItemProps, FormProps };
