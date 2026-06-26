import type { SysUserReq, SysRoleVo } from "@/api/rbac";

type FormProps = {
  formInline: SysUserReq;
  roleOptions: SysRoleVo[];
};

export type { FormProps };
