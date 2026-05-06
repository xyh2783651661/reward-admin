import { http } from "@/utils/http";

type ApiResult<T = unknown> = {
  code: number;
  msg: string;
  success: boolean;
  data: T;
};

type ApiListResult<T = Record<string, any>> = ApiResult<T[]>;

type ApiPageData<T = Record<string, any>> = {
  records: T[];
  total: number;
  size: number;
  current: number;
};

type ApiPageResult<T = Record<string, any>> = ApiResult<ApiPageData<T>>;

export const getUserList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/user", { data });
};

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

export const getMailRecipientList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/mail-recipients/page", {
    data
  });
};

export const deleteMailRecipient = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/mail-recipients/${id}`);
};

export const updateMailRecipient = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-recipients/update", {
    data
  });
};

export const getRewardConfigList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-configs/page", {
    data
  });
};

export const exportRewardConfigList = (data?: object) => {
  return http.request<Blob>("post", "/api/reward-configs/export-excel", {
    data,
    responseType: "blob"
  });
};

export const exportAccessLogsList = (data?: object) => {
  return http.request<Blob>("post", "/api/access-logs/export-excel", {
    data,
    responseType: "blob"
  });
};

export const getRewardSubjectList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-subjects/page", {
    data
  });
};

export const addRewardConfig = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-configs/add", {
    data
  });
};

export const addMailRecipient = (data?: object) => {
  return http.request<ApiResult>("post", "/api/mail-recipients/add", {
    data
  });
};

export const addRewardSubject = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-subjects/add", {
    data
  });
};

export const addRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/add", {
    data
  });
};

export const updateRewardConfig = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-configs/update", {
    data
  });
};

export const updateRewardSubject = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-subjects/update", {
    data
  });
};

export const updateRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/update", {
    data
  });
};

export const deleteRewardConfig = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-configs/${id}`);
};

export const deleteRewardSubject = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-subjects/${id}`);
};

export const deleteRewardUser = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-users/${id}`);
};

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

export const getMenuList = (data?: object) => {
  return http.request<ApiListResult>("post", "/menu", { data });
};

export const getDeptList = (data?: object) => {
  return http.request<ApiListResult>("post", "/dept", { data });
};

export const getOnlineLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/online-logs", { data });
};

export const getLoginLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/login-logs", { data });
};

export const getOperationLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/task-logs/page", { data });
};

export const getMailSendRecordsList = <T = Record<string, any>>(
  data?: object
) => {
  return http.request<ApiPageResult<T>>("post", "/api/mail-send-records/page", {
    data
  });
};

export const getRewardApkVersionsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-apk/versions-page", {
    data
  });
};

export const getSystemLogsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/access-logs/page", { data });
};

export const getSystemLogsDetail = (id: string | number) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    `/api/access-logs-detail/${id}`
  );
};

export const getRoleMenu = (data?: object) => {
  return http.request<ApiListResult>("post", "/role-menu", { data });
};

export const getRewardUserList = (data?: object) => {
  return http.request<ApiListResult>("post", "/api/reward-users/list", {
    data
  });
};

export const getRewardUserPage = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-users/page", {
    data
  });
};

export const resetPwdRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/reset-pwd", {
    data
  });
};

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

export const getRoleMenuIds = (data?: object) => {
  return http.request<ApiListResult<number | string>>(
    "post",
    "/role-menu-ids",
    {
      data
    }
  );
};
