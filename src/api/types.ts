export type ApiResult<T = unknown> = {
  code: number;
  msg: string;
  success: boolean;
  data: T;
};

export type ApiListResult<T = Record<string, any>> = ApiResult<T[]>;

export type ApiPageData<T = Record<string, any>> = {
  records: T[];
  total: number;
  size: number;
  current: number;
};

export type ApiPageResult<T = Record<string, any>> = ApiResult<ApiPageData<T>>;
