import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/**
 * 微信用户 ↔ Reward 用户 绑定关系（后端 /admin/**，由管理端 Sa-Token 保护）。
 *
 * 注意：后端返回的 openid 已脱敏（首尾各 4 位），页面不需要也不应该拿完整 openid。
 */

export type WeChatIdentityRow = {
  id: number;
  userId: number;
  nickName?: string;
  registerSource?: string;
  openidMasked?: string;
  appId?: string;
  identityType?: string;
  createdTime?: string;
};

export type MiniSharedMode = {
  enabled: boolean;
  userId: number;
};

export const getWeChatIdentityPage = (params?: object) => {
  return http.request<ApiPageResult<WeChatIdentityRow>>(
    "get",
    "/api/admin/reward/wechat-identities/page",
    { params }
  );
};

/** 改挂：只改「这个微信登录后是谁」，不搬动任何业务数据 */
export const rebindWeChatIdentity = (id: number, userId: number) => {
  return http.request<ApiResult>(
    "put",
    `/api/admin/reward/wechat-identities/${id}/rebind`,
    { data: { userId } }
  );
};

/** 解绑（软删）：该微信下次登录会重新走首次登录逻辑 */
export const unbindWeChatIdentity = (id: number) => {
  return http.request<ApiResult>(
    "delete",
    `/api/admin/reward/wechat-identities/${id}`
  );
};

export const getMiniSharedMode = () => {
  return http.request<ApiResult<MiniSharedMode>>(
    "get",
    "/api/admin/reward/mini-shared-mode"
  );
};

export const updateMiniSharedMode = (data: {
  enabled: boolean;
  userId?: number;
}) => {
  return http.request<ApiResult>("put", "/api/admin/reward/mini-shared-mode", {
    data
  });
};
