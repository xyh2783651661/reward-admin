import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/** 节假日配置项 */
export interface SysHolidayConfig {
  id: number;
  holidayName: string;
  holidayDate: string;
  lunarMonth: number;
  lunarDay: number;
  holidayType: string;
  status: 0 | 1;
  sortOrder: number;
  description: string;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

/** 分页查询请求参数 */
export interface SysHolidayConfigPageReq {
  current: number;
  size: number;
  holidayName?: string;
  holidayDate?: string;
  lunarMonth?: number;
  lunarDay?: number;
  holidayType?: string;
  status?: 0 | 1;
  sortOrder?: number;
  description?: string;
}

/** 选项项 */
export interface OptionItem<T = string | number> {
  label: string;
  value: T;
}

/** 表单选项 */
export interface SysHolidayOptions {
  holidayTypes: OptionItem<string>[];
  statusOptions: OptionItem<number>[];
}

/** 分页查询节假日配置 */
export const getHolidayConfigPage = <T = SysHolidayConfig>(
  data?: SysHolidayConfigPageReq
) => {
  return http.request<ApiPageResult<T>>("post", "/api/sys-holidays/page", {
    data
  });
};

/** 按 id 获取节假日配置详情 */
export const getHolidayConfigDetail = <T = SysHolidayConfig>(
  id: number | string
) => {
  return http.request<ApiResult<T>>("get", `/api/sys-holidays/detail/${id}`);
};

/** 获取表单选项 */
export const getHolidayConfigOptions = <T = SysHolidayOptions>() => {
  return http.request<ApiResult<T>>("get", "/api/sys-holidays/options");
};

/** 新增节假日配置 */
export const addHolidayConfig = <T = SysHolidayConfig>(data?: object) => {
  return http.request<ApiResult<T>>("post", "/api/sys-holidays/add", {
    data
  });
};

/** 修改节假日配置 */
export const updateHolidayConfig = <T = SysHolidayConfig>(data?: object) => {
  return http.request<ApiResult<T>>("post", "/api/sys-holidays/update", {
    data
  });
};

/** 删除节假日配置 */
export const deleteHolidayConfig = <T = SysHolidayConfig>(
  id: number | string
) => {
  return http.request<ApiResult<T>>("delete", `/api/sys-holidays/${id}`);
};

/** 节假日收件人关联项 */
export interface SysHolidayRecipient {
  id: number;
  holidayId: number;
  recipientId: number;
  remark: string;
  createdTime: string;
  updatedTime: string;
  deleted: number;
}

/** 节假日收件人关联请求参数 */
export interface SysHolidayRecipientReq {
  holidayId: number;
  recipientIds?: number[];
  remark?: string;
}

/** 查询节假日收件人关联列表 */
export const getHolidayRecipientList = <T = SysHolidayRecipient>(
  holidayId: number
) => {
  return http.request<ApiResult<T[]>>(
    "post",
    "/api/sys-holiday-recipients/list",
    {
      data: { holidayId }
    }
  );
};

/** 批量更新节假日收件人关联 */
export const updateHolidayRecipient = <T = null>(
  data?: SysHolidayRecipientReq
) => {
  return http.request<ApiResult<T>>(
    "post",
    "/api/sys-holiday-recipients/update",
    {
      data
    }
  );
};
