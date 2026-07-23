// Barrel re-export for backward compatibility.
// New code should import from domain-specific modules directly.

export type {
  ApiResult,
  ApiListResult,
  ApiPageData,
  ApiPageResult
} from "./types";

export {
  calculateReward,
  getRewardResult,
  getRewardCompare,
  getRewardSubjects,
  deleteRewardResult,
  batchDeleteRewardResults,
  getRewardDownloadUrl,
  uploadRewardAvatar,
  calculateRewardApk,
  getRewardApkResult,
  getRewardApkSubjects,
  getRewardApkProfile,
  updateRewardApkProfile,
  uploadRewardApkAvatar,
  deleteRewardApkResult,
  getRewardApkDownloadUrl,
  getRewardApkRuleDownloadUrl,
  getLastRewardApkVersion,
  getRewardApkWebLatestDownloadUrl,
  getRewardApkAndroidLatestDownloadUrl,
  saveRewardApkVersion,
  getRewardConfigList,
  addRewardConfig,
  updateRewardConfig,
  deleteRewardConfig,
  exportRewardConfigList,
  getRewardConfigRuleDownloadUrl,
  getRewardSubjectList,
  getRewardSubjectAllList,
  addRewardSubject,
  updateRewardSubject,
  deleteRewardSubject,
  getRewardUserList,
  getRewardUserPage,
  addRewardUser,
  updateRewardUser,
  deleteRewardUser,
  resetPwdRewardUser,
  getRewardApkVersionsList,
  getRewardOptions
} from "./reward";

export {
  getMailRecipientList,
  addMailRecipient,
  updateMailRecipient,
  deleteMailRecipient,
  getMailRecipientUserList,
  updateMailRecipientUser,
  getMailSendRecordsList
} from "./mail";

export {
  getSystemConfigList,
  getSystemConfigByKey,
  getSystemConfigDetail,
  getSystemConfigOptions,
  addSystemConfig,
  updateSystemConfig,
  deleteSystemConfig,
  exportSystemConfigList
} from "./system-config";

export {
  getPocketMoneyRulePage,
  exportPocketMoneyRuleExcel,
  addPocketMoneyRule,
  updatePocketMoneyRule,
  deletePocketMoneyRule,
  getPocketMoneyRuleOptions
} from "./pocket-money";

export {
  getOnlineLogsList,
  getLoginLogsList,
  getOperationLogsList,
  getSystemLogsList,
  getAccessLogsList,
  getAccessLogDetail,
  getSystemLogsDetail,
  getAccessLogsFilterOptions,
  deleteAccessLog,
  batchDeleteAccessLogs,
  exportAccessLogsList,
  getTraceDetail,
  getTaskLogsFilterOptions,
  getTaskLogDetail,
  getTaskLogStats
} from "./logs";

export { getAiCallRecordPage, getAiCallRecordDetail } from "./ai";

export {
  getSysNoticePage,
  getSysNoticeDetail,
  addSysNotice,
  updateSysNotice,
  deleteSysNotice,
  publishSysNotice,
  withdrawSysNotice,
  markNoticeRead,
  batchMarkNoticeRead,
  markAllNoticeRead,
  getUnreadCount
} from "./notice";

export {
  initLoveUser,
  getLoveRecordPage,
  getLoveRecordByDate,
  getLoveRecordDetail,
  addLoveRecord,
  updateLoveRecord,
  deleteLoveRecord,
  getAnniversaryList,
  addAnniversary,
  updateAnniversary,
  deleteAnniversary,
  uploadMedia,
  deleteMedia,
  reverseGeocode,
  searchLocations,
  getLoveStatistics,
  getLoveCalendarStats,
  getMemoryGallery,
  exportMemoriesPdf,
  exportMemoriesImage,
  reportLoveEvent,
  getSyncBootstrap,
  getSyncChanges,
  pushSyncChanges,
  getLoveOptions,
  getCurrentRecordDraft,
  saveRecordDraft,
  deleteRecordDraft,
  getCustomMoods,
  addCustomMood,
  deleteCustomMood
} from "./love";

export {
  getHolidayConfigPage,
  getHolidayConfigDetail,
  getHolidayConfigOptions,
  addHolidayConfig,
  updateHolidayConfig,
  deleteHolidayConfig,
  getHolidayRecipientList,
  updateHolidayRecipient
} from "./holiday";

export {
  getAllRoleList,
  getRoleIds,
  getRoleList,
  getRoleMenu,
  getRoleMenuIds
} from "./role";

export {
  getCacheInfo,
  getCacheKeys,
  getCacheValue,
  deleteCacheKey,
  clearAllCache,
  getCacheStats,
  getCacheStatsHistory,
  getCacheHealth,
  getCacheTopKeys,
  getCacheBigKeys,
  getCacheLogs,
  getRedisInfo
} from "./cache";

import { http } from "@/utils/http";
import type { ApiListResult, ApiPageResult } from "./types";

export const getUserList = (data?: object) => {
  return http.request<ApiPageResult>("post", "/user", { data });
};

export const getMenuList = (data?: object) => {
  return http.request<ApiListResult>("post", "/menu", { data });
};

export const getDeptList = (data?: object) => {
  return http.request<ApiListResult>("post", "/dept", { data });
};
