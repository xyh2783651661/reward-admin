import { http } from "@/utils/http";
import type { ApiListResult, ApiPageResult } from "./types";

export const getAllRoleList = () => {
  return http.request<ApiListResult>("get", "/list-all-role");
};

export const getRoleIds = (data?: object) => {
  return http.request<ApiListResult<number | string>>(
    "post",
    "/list-role-ids",
    {
      data
    }
  );
};

export const getRoleList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/role", { data });
};

export const getRoleMenu = (data?: object) => {
  return http.request<ApiListResult>("post", "/role-menu", { data });
};

export const getRoleMenuIds = (data?: object) => {
  return http.request<ApiListResult<number | string>>(
    "post",
    "/role-menu-ids",
    {
      data
    }
  );
};
