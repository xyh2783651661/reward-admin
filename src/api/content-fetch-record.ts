import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/**
 * 内容源抓取流水。
 *
 * 记录每日早报 / 生日邮件从微博、知乎、B站、GitHub 等外部信源抓取内容的结果，
 * 用于回答「今天的早报为什么少了某个板块」「某信源是不是已经连续失败几天」。
 */

export const getContentFetchRecordPage = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    "/api/daily-content-fetch-records/page",
    { data }
  );
};

/** 导出抓取流水（筛选条件与列表一致） */
export const exportContentFetchRecords = (data?: object) => {
  return http.request<Blob>(
    "post",
    "/api/daily-content-fetch-records/export-excel",
    { data, responseType: "blob" }
  );
};

/**
 * 某条抓取流水解析出的条目（抓到了什么）。
 *
 * 与「原始请求」的区别：原始请求是 HTTP 报文，只有真正发过请求才有；
 * 本接口是解析后的内容条目，是后台最常看的那个。
 */
export const getContentFetchRecordItems = <T = Record<string, any>>(
  id: number
) => {
  return http.request<ApiResult<T[]>>(
    "get",
    `/api/daily-content-fetch-records/${id}/items`
  );
};

/** 筛选选项：statusOptions（固定三态）、sourceKeyOptions（取自已注册信源） */
export const getContentFetchRecordOptions = () => {
  return http.request<ApiResult<Record<string, any[]>>>(
    "get",
    "/api/daily-content-fetch-records/options"
  );
};
