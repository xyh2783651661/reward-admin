import { http } from "@/utils/http";
import type { ApiResult, ApiListResult, ApiPageResult } from "./types";

// Mail Recipients
export const getMailRecipientList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/mail-recipients/page", {
    data
  });
};

export const addMailRecipient = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-recipients/add", {
    data
  });
};

export const updateMailRecipient = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-recipients/update", {
    data
  });
};

export const deleteMailRecipient = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/mail-recipients/${id}`);
};

// Mail Recipient Users
export const getMailRecipientUserList = (data?: object) => {
  return http.request<ApiListResult>("post", "/api/mail-recipient-users/list", {
    data
  });
};

export const updateMailRecipientUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-recipient-users/update", {
    data
  });
};

// Mail Send Records
export const getMailSendRecordsList = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>("post", "/api/mail-send-records/page", {
    data
  });
};
