import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

export const getSystemConfigList = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiPageResult<T>>("post", "/api/system-configs/page", {
    data
  });
};

export const getSystemConfigByKey = <T = Record<string, any>>(
  configKey: string
) => {
  return http.request<ApiResult<T>>("get", `/api/system-configs/${configKey}`);
};

export const getSystemConfigDetail = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("get", `/api/system-configs/detail/${id}`);
};

export const getSystemConfigOptions = <T = Record<string, any>>() => {
  return http.request<ApiResult<T>>("get", "/api/system-configs/options");
};

export const addSystemConfig = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiResult<T>>("post", "/api/system-configs/add", {
    data
  });
};

export const updateSystemConfig = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiResult<T>>("post", "/api/system-configs/update", {
    data
  });
};

export const deleteSystemConfig = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("delete", `/api/system-configs/${id}`);
};
