interface FormItemProps {
  id: string;
  nickName: string;
  avatar: string;
  phone: string;
  birthday: string;
  /** 农历生日，存储格式「月-日」，负月=闰月（如 -8-15）。空串=未维护 */
  lunarBirthday: string;
}

interface FormProps {
  formInline: FormItemProps;
}

interface RoleOption {
  id: number | string;
  /** 兼容旧字段；角色接口实际返回 roleName */
  name?: string;
  roleName?: string;
  roleCode?: string;
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
