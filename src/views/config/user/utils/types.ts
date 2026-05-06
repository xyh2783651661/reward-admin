interface FormItemProps {
  id: string;
  nickName: string;
  avatar: string;
  phone: string;
  birthday: string;
}

interface FormProps {
  formInline: FormItemProps;
}

interface RoleOption {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

interface RoleFormItemProps {
  nickName: string;
  roleOptions: RoleOption[];
  ids: Array<number | string>;
}

interface RoleFormProps {
  formInline: RoleFormItemProps;
}

export type { FormItemProps, FormProps, RoleFormItemProps, RoleFormProps };
