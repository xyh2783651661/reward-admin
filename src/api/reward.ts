import { http } from "@/utils/http";
import type { ApiResult, ApiListResult, ApiPageResult } from "./types";

// Reward Calculate (Web)
export const calculateReward = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/reward/calculate",
    { data }
  );
};

export const getRewardResult = (params?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/reward/result",
    { params }
  );
};

export const getRewardCompare = (params?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/reward/compare",
    { params }
  );
};

export const getRewardSubjects = (params?: object) => {
  return http.request<ApiListResult>("get", "/api/reward/subjects", {
    params
  });
};

export const deleteRewardResult = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward/${id}`);
};

export const batchDeleteRewardResults = (ids: Array<string | number>) => {
  return http.request<ApiResult>("delete", "/api/reward", { data: ids });
};

export const getRewardDownloadUrl = (id: string | number) => {
  return `/api/reward/download/${id}`;
};

export const uploadRewardAvatar = (id: string | number, file: File) => {
  const formData = new FormData();
  formData.append("id", String(id));
  formData.append("file", file);
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/reward/avatar",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

// Reward Calculate (APK)
export const calculateRewardApk = (data?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/reward-apk/calculate",
    { data }
  );
};

export const getRewardApkResult = (params?: object) => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/reward-apk/result",
    { params }
  );
};

export const getRewardApkSubjects = (params?: object) => {
  return http.request<ApiListResult>("get", "/api/reward-apk/subjects", {
    params
  });
};

export const getRewardApkProfile = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/reward-apk/profile"
  );
};

export const updateRewardApkProfile = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-apk/profile", { data });
};

export const uploadRewardApkAvatar = (file: File, id?: string | number) => {
  const formData = new FormData();
  formData.append("file", file);
  if (id !== undefined && id !== null) formData.append("id", String(id));
  return http.request<ApiResult<Record<string, any>>>(
    "post",
    "/api/reward-apk/avatar",
    {
      data: formData,
      headers: { "Content-Type": "multipart/form-data" }
    }
  );
};

export const deleteRewardApkResult = (id: string | number) => {
  return http.request<ApiResult>("delete", `/api/reward-apk/${id}`);
};

export const getRewardApkDownloadUrl = (id: string | number) => {
  return `/api/reward-apk/download/${id}`;
};

export const getRewardApkRuleDownloadUrl = () => {
  return "/api/reward-apk/download/rule";
};

export const getLastRewardApkVersion = () => {
  return http.request<ApiResult<Record<string, any>>>(
    "get",
    "/api/reward-apk/last-version"
  );
};

export const getRewardApkWebLatestDownloadUrl = () => {
  return "/api/reward-apk/web/download-latest";
};

export const getRewardApkAndroidLatestDownloadUrl = () => {
  return "/api/reward-apk/android/download-latest";
};

export const saveRewardApkVersion = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-apk/version-apk", {
    data
  });
};

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

export const getRewardConfigRuleDownloadUrl = () => {
  return "/api/reward-configs/download/rule";
};

// Reward Subject
export const getRewardSubjectList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/api/reward-subjects/page", {
    data
  });
};

export const getRewardSubjectAllList = (data?: object) => {
  return http.request<ApiListResult>("post", "/api/reward-subjects/list", {
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

export const getRewardOptions = () => {
  return http.request<ApiResult<Record<string, any>>>("get", "/api/options");
};
