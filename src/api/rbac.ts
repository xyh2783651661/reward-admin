import { http } from "@/utils/http";
import type { ApiResult, ApiListResult, ApiPageResult } from "./types";

/** 菜单类型：0目录 1菜单 2按钮 */
export type MenuType = 0 | 1 | 2;

export interface SysMenuVo {
  id: number;
  parentId: number;
  menuName: string;
  menuType: MenuType;
  path?: string;
  component?: string;
  routeName?: string;
  perms?: string;
  icon?: string;
  titleZh?: string;
  titleEn?: string;
  rank?: number;
  keepAlive?: number;
  showLink?: number;
  frameSrc?: string;
  status?: number;
  createdTime?: string;
  children?: SysMenuVo[];
}

export interface SysRoleVo {
  id: number;
  roleCode: string;
  roleName: string;
  status?: number;
  remark?: string;
  createdTime?: string;
  menuIds?: number[];
}

export interface SysMenuReq {
  id?: number;
  parentId?: number;
  menuName: string;
  menuType: MenuType;
  path?: string;
  component?: string;
  routeName?: string;
  perms?: string;
  icon?: string;
  titleZh?: string;
  titleEn?: string;
  rank?: number;
  keepAlive?: number;
  showLink?: number;
  frameSrc?: string;
  status?: number;
}

export interface SysRoleReq {
  id?: number;
  roleCode?: string;
  roleName?: string;
  status?: number;
  remark?: string;
  current?: number;
  size?: number;
}

/** 菜单树 */
export const getMenuTree = () => {
  return http.request<ApiResult<SysMenuVo[]>>("get", "/api/admin/menus/tree");
};

/** 新增菜单 */
export const addMenu = (data: SysMenuReq) => {
  return http.request<ApiResult>("post", "/api/admin/menus/add", { data });
};

/** 更新菜单 */
export const updateMenu = (data: SysMenuReq) => {
  return http.request<ApiResult>("post", "/api/admin/menus/update", { data });
};

/** 删除菜单 */
export const deleteMenu = (id: number) => {
  return http.request<ApiResult>("delete", `/api/admin/menus/${id}`);
};

/** 角色分页 */
export const getRolePage = (data: SysRoleReq) => {
  return http.request<ApiPageResult<SysRoleVo>>(
    "post",
    "/api/admin/roles/page",
    { data }
  );
};

/** 全部启用角色 */
export const getRoleAll = () => {
  return http.request<ApiListResult<SysRoleVo>>("get", "/api/admin/roles/list");
};

/** 角色详情（含 menuIds） */
export const getRoleDetail = (id: number) => {
  return http.request<ApiResult<SysRoleVo>>("get", `/api/admin/roles/${id}`);
};

/** 新增角色 */
export const addRole = (data: SysRoleReq) => {
  return http.request<ApiResult>("post", "/api/admin/roles/add", { data });
};

/** 更新角色 */
export const updateRole = (data: SysRoleReq) => {
  return http.request<ApiResult>("post", "/api/admin/roles/update", { data });
};

/** 删除角色 */
export const deleteRole = (id: number) => {
  return http.request<ApiResult>("delete", `/api/admin/roles/${id}`);
};

/** 给角色分配菜单 */
export const assignRoleMenus = (data: {
  roleId: number;
  menuIds: number[];
}) => {
  return http.request<ApiResult>("post", "/api/admin/roles/assign-menus", {
    data
  });
};

// ==================== 系统用户 ====================

export interface SysUserVo {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  status?: number;
  remark?: string;
  createdTime?: string;
  roleIds?: number[];
}

export interface SysUserReq {
  id?: number;
  username?: string;
  password?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  status?: number;
  remark?: string;
  roleIds?: number[];
  current?: number;
  size?: number;
}

/** 用户分页 */
export const getUserPage = (data: SysUserReq) => {
  return http.request<ApiPageResult<SysUserVo>>(
    "post",
    "/api/admin/users/page",
    { data }
  );
};

/** 用户详情（含角色 ID） */
export const getUserDetail = (id: number) => {
  return http.request<ApiResult<SysUserVo>>("get", `/api/admin/users/${id}`);
};

/** 新增用户 */
export const addUser = (data: SysUserReq) => {
  return http.request<ApiResult>("post", "/api/admin/users/add", { data });
};

/** 更新用户 */
export const updateUser = (data: SysUserReq) => {
  return http.request<ApiResult>("post", "/api/admin/users/update", { data });
};

/** 删除用户 */
export const deleteUser = (id: number) => {
  return http.request<ApiResult>("delete", `/api/admin/users/${id}`);
};

/** 重置密码 */
export const resetUserPassword = (data: { id: number; password: string }) => {
  return http.request<ApiResult>("post", "/api/admin/users/reset-password", {
    data
  });
};
