import { http } from "@/utils/http";

type Result = {
  code: number;
  msg: string;
  success: boolean;
  data?: Array<any>;
};

type ResultTable = {
  success: boolean;
  data?: {
    /** 列表数据 */
    records: Array<any>;
    /** 总条目数 */
    total?: number;
    /** 每页显示条目个数 */
    size?: number;
    /** 当前页数 */
    current?: number;
  };
};

/** 获取系统管理-用户管理列表 */
export const getUserList = (data?: object) => {
  return http.request<ResultTable>("post", "/user", { data });
};

/** 系统管理-用户管理-获取所有角色列表 */
export const getAllRoleList = () => {
  return http.request<Result>("get", "/list-all-role");
};

/** 系统管理-用户管理-根据userId，获取对应角色id列表（userId：用户id） */
export const getRoleIds = (data?: object) => {
  return http.request<Result>("post", "/list-role-ids", { data });
};

/** 获取系统管理-角色管理列表 */
export const getRoleList = (data?: object) => {
  return http.request<ResultTable>("post", "/role", { data });
};

export const getRewardConfigList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/reward-configs/page", {
    data
  });
};

export const getRewardSubjectList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/reward-subjects/page", {
    data
  });
};

export const addRewardConfig = (data?: object) => {
  return http.request<Result>("post", "/api/reward-configs/add", {
    data
  });
};

export const addRewardSubject = (data?: object) => {
  return http.request<Result>("post", "/api/reward-subjects/add", {
    data
  });
};

export const updateRewardConfig = (data?: object) => {
  return http.request<Result>("post", "/api/reward-configs/update", {
    data
  });
};

export const updateRewardSubject = (data?: object) => {
  return http.request<Result>("post", "/api/reward-subjects/update", {
    data
  });
};

export const deleteRewardConfig = (id: string | number) => {
  return http.request<Result>("delete", `/api/reward-configs/${id}`);
};

export const deleteRewardSubject = (id: string | number) => {
  return http.request<Result>("delete", `/api/reward-subjects/${id}`);
};

/** 获取系统管理-菜单管理列表 */
export const getMenuList = (data?: object) => {
  return http.request<Result>("post", "/menu", { data });
};

/** 获取系统管理-部门管理列表 */
export const getDeptList = (data?: object) => {
  return http.request<Result>("post", "/dept", { data });
};

/** 获取系统监控-在线用户列表 */
export const getOnlineLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/online-logs", { data });
};

/** 获取系统监控-登录日志列表 */
export const getLoginLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/login-logs", { data });
};

/** 获取系统监控-操作日志列表 */
export const getOperationLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/task-logs/page", { data });
};

export const getMailSendRecordsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/mail-send-records/page", {
    data
  });
};

export const getRewardApkVersionsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/reward-apk-versions/page", {
    data
  });
};

/** 获取系统监控-系统日志列表 */
export const getSystemLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/access-logs/page", { data });
};

/** 获取系统监控-系统日志-根据 id 查日志详情 */
export const getSystemLogsDetail = (id: string | number) => {
  return http.request<Result>("get", `/api/access-logs-detail/${id}`);
};

/** 获取角色管理-权限-菜单权限 */
export const getRoleMenu = (data?: object) => {
  return http.request<Result>("post", "/role-menu", { data });
};

/** 获取角色管理-权限-菜单权限-根据角色 id 查对应菜单 */
export const getRoleMenuIds = (data?: object) => {
  return http.request<Result>("post", "/role-menu-ids", { data });
};
