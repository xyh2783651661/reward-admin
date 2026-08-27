import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/** 早安问候配置项（morning_greeting_config 表） */
export interface MorningGreetingConfigItem {
  id?: number;
  targetUserId?: number;
  sendDate?: string;
  enabled?: number;
  remark?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** 分页查询 */
export const getMorningGreetingPage = (data?: object) => {
  return http.request<ApiPageResult<MorningGreetingConfigItem>>(
    "post",
    "/api/morning-greeting-configs/page",
    { data }
  );
};

/** 详情 */
export const getMorningGreetingDetail = (id: number | string) => {
  return http.request<ApiResult<MorningGreetingConfigItem>>(
    "get",
    `/api/morning-greeting-configs/detail/${id}`
  );
};

/** 下拉选项（状态、用户等） */
export const getMorningGreetingOptions = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/morning-greeting-configs/options"
  );
};

/** 新增 */
export const addMorningGreeting = (data?: object) => {
  return http.request<ApiResult<MorningGreetingConfigItem>>(
    "post",
    "/api/morning-greeting-configs/add",
    { data }
  );
};

/** 修改 */
export const updateMorningGreeting = (data?: object) => {
  return http.request<ApiResult<MorningGreetingConfigItem>>(
    "post",
    "/api/morning-greeting-configs/update",
    { data }
  );
};

/** 删除 */
export const deleteMorningGreeting = (id: number | string) => {
  return http.request<ApiResult<MorningGreetingConfigItem>>(
    "delete",
    `/api/morning-greeting-configs/${id}`
  );
};
