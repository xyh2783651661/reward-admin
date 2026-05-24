import { http } from "@/utils/http";
import type { ApiResult, ApiListResult, ApiPageResult } from "./types";

// Reward Config
export const getRewardConfigList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-configs/page", {
    data
  });
};

export const addRewardConfig = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-configs/add", {
    data
  });
};

export const updateRewardConfig = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-configs/update", {
    data
  });
};

export const deleteRewardConfig = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-configs/${id}`);
};

export const exportRewardConfigList = (data?: object) => {
  return http.request<Blob>("post", "/api/reward-configs/export-excel", {
    data,
    responseType: "blob"
  });
};

// Reward Subject
export const getRewardSubjectList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-subjects/page", {
    data
  });
};

export const addRewardSubject = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-subjects/add", {
    data
  });
};

export const updateRewardSubject = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-subjects/update", {
    data
  });
};

export const deleteRewardSubject = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-subjects/${id}`);
};

// Reward User
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

export const addRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/add", {
    data
  });
};

export const updateRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/update", {
    data
  });
};

export const deleteRewardUser = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-users/${id}`);
};

export const resetPwdRewardUser = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-users/reset-pwd", {
    data
  });
};

// Reward APK Versions
export const getRewardApkVersionsList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-apk/versions-page", {
    data
  });
};
