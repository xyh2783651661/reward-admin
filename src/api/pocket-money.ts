import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

export const getPocketMoneyRulePage = (data?: object) => {
  return http.request<ApiPageResult>(
    "post",
    "/api/reward-pocket-money-rules/page",
    {
      data
    }
  );
};

export const exportPocketMoneyRuleExcel = (data?: object) => {
  return http.request<Blob>(
    "post",
    "/api/reward-pocket-money-rules/export-excel",
    {
      data,
      responseType: "blob"
    }
  );
};

export const addPocketMoneyRule = (data?: object) => {
  return http.request<ApiResult>("post", "/api/reward-pocket-money-rules/add", {
    data
  });
};

export const updatePocketMoneyRule = (data?: object) => {
  return http.request<ApiResult>(
    "post",
    "/api/reward-pocket-money-rules/update",
    {
      data
    }
  );
};

export const deletePocketMoneyRule = (id: string | number) => {
  return http.request<ApiResult>(
    "delete",
    `/api/reward-pocket-money-rules/${id}`
  );
};

export const getPocketMoneyRuleOptions = () => {
  return http.request<
    ApiResult<{
      ruleTypeOptions: { label: string; value: string }[];
      ruleKeys: string[];
    }>
  >("get", "/api/reward-pocket-money-rules/options");
};
