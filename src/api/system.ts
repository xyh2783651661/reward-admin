// Barrel re-export for backward compatibility.
// New code should import from domain-specific modules directly.

export type {
  ApiResult,
  ApiListResult,
  ApiPageData,
  ApiPageResult
} from "./types";

export {
  getRewardConfigList,
  addRewardConfig,
  updateRewardConfig,
  deleteRewardConfig,
  exportRewardConfigList,
  getRewardSubjectList,
  addRewardSubject,
  updateRewardSubject,
  deleteRewardSubject,
  getRewardUserList,
  getRewardUserPage,
  addRewardUser,
  updateRewardUser,
  deleteRewardUser,
  resetPwdRewardUser,
  getRewardApkVersionsList
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
  deleteSystemConfig
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
  getSystemLogsDetail,
  exportAccessLogsList
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
  getLoveStatistics,
  getLoveCalendarStats,
  getMemoryGallery,
  getLoveOptions
} from "./love";

export {
  getAllRoleList,
  getRoleIds,
  getRoleList,
  getRoleMenu,
  getRoleMenuIds
} from "./role";

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
