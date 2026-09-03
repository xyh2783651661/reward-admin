import { http } from "@/utils/http";
import type { ApiResult, ApiListResult, ApiPageResult } from "./types";
import type { OptionsResponse } from "@/components/DictSelect/types";

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

// Mail Send Record Options (status/type/mqStatus/priority)
export const getMailSendRecordOptions = () => {
  return http.request<ApiResult<OptionsResponse>>(
    "get",
    "/api/mail-send-records/options"
  );
};

// Mail Send Record Detail (by id) - returns full entity
export const getMailSendRecordDetail = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("get", `/api/mail-send-records/${id}`);
};

// Mail Recipient Options (status, etc.)
export const getMailRecipientOptions = () => {
  return http.request<ApiResult<Record<string, any[]>>>(
    "get",
    "/api/mail-recipients/options"
  );
};

// ==================== 邮件批量发送任务 ====================

export const getMailSendTaskList = <T = Record<string, any>>(data?: object) => {
  return http.request<ApiPageResult<T>>("post", "/api/mail-send-tasks/page", {
    data
  });
};

export const addMailSendTask = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-send-tasks/add", { data });
};

export const updateMailSendTask = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-send-tasks/update", {
    data
  });
};

export const deleteMailSendTask = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/mail-send-tasks/${id}`);
};

export const getMailSendTaskDetail = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("get", `/api/mail-send-tasks/${id}`);
};

export const getMailSendTaskRecipients = <T = Record<string, any>>(
  id: string | number,
  data?: object
) => {
  return http.request<ApiPageResult<T>>(
    "post",
    `/api/mail-send-tasks/${id}/recipients`,
    { data }
  );
};

export const checkMailSendTask = <T = Record<string, any>>(
  id: string | number
) => {
  return http.request<ApiResult<T>>("get", `/api/mail-send-tasks/${id}/check`);
};

export const sendMailSendTask = (id: string | number) => {
  return http.request<ApiResult>("post", `/api/mail-send-tasks/${id}/send`);
};

export const retryMailSendTask = (id: string | number) => {
  return http.request<ApiResult>("post", `/api/mail-send-tasks/${id}/retry`);
};

export const cancelMailSendTask = (id: string | number) => {
  return http.request<ApiResult>("post", `/api/mail-send-tasks/${id}/cancel`);
};

export const getMailSendTaskOptions = () => {
  return http.request<ApiResult<Record<string, any[]>>>(
    "get",
    "/api/mail-send-tasks/options"
  );
};

export const uploadMailAttachment = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/mail-send-tasks/attachments/upload",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

export const uploadMailImage = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/mail-send-tasks/images/upload",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};
