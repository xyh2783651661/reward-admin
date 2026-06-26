import { http } from "@/utils/http";
import type { ApiResult } from "./types";

export type UserResult = {
  success: boolean;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 按钮级别权限 */
    permissions: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

export type RefreshTokenResult = {
  success: boolean;
  data: {
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/api/admin/auth/login", { data });
};

/** 文档认证登录路径（保留旧登录入口兼容现有流程） */
export const authLogin = (data?: object) => {
  return http.request<UserResult>("post", "/api/auth/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>(
    "post",
    "/api/admin/auth/refresh-token",
    { data }
  );
};

/** 登出 */
export const logout = () => {
  return http.request<ApiResult>("post", "/api/admin/auth/logout");
};

/** 获取当前用户信息 */
export const getCurrentUser = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/admin/auth/me"
  );
};

/** 修改密码 */
export const changePassword = (data?: object) => {
  return http.request<ApiResult>("post", "/api/auth/change-password", { data });
};
