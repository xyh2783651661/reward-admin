import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getToken, formatToken, removeToken } from "@/utils/auth";
import { useUserStoreHook } from "@/store/modules/user";
import {
  APP_ID as appId,
  CLIENT_TYPE as clientType,
  CLIENT_VERSION as clientVersion,
  buildSignedHeaders
} from "@/utils/http/headers";

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-App-Id": appId,
    "X-Client-Type": clientType,
    "X-Client-Version": clientVersion
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** `token`过期后，暂存待执行的请求 */
  private static requests = [];

  /** 防止重复刷新`token` */
  private static isRefreshing = false;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 重连原始请求 */
  private static retryOriginalRequest(config: PureHttpRequestConfig) {
    return new Promise(resolve => {
      PureHttp.requests.push((token: string) => {
        config.headers["Authorization"] = formatToken(token);
        config.headers["X-Token"] = token;
        resolve(config);
      });
    });
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        /** ===== 签名相关（重点） ===== */
        Object.assign(config.headers, buildSignedHeaders());
        /** ============================ */

        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
        /** 请求白名单，放置一些不需要`token`的接口（通过设置请求白名单，防止`token`过期后再请求造成的死循环问题） */
        const whiteList = [
          "/api/admin/auth/refresh-token",
          "/api/admin/auth/login"
        ];
        return whiteList.some(url => config.url.endsWith(url))
          ? config
          : new Promise(resolve => {
              const data = getToken();
              if (data) {
                const now = new Date().getTime();
                const expired = parseInt(data.expires) - now <= 0;
                if (expired) {
                  if (!PureHttp.isRefreshing) {
                    PureHttp.isRefreshing = true;
                    // token过期刷新
                    useUserStoreHook()
                      .handRefreshToken({ refreshToken: data.refreshToken })
                      .then(res => {
                        const token = res.data.accessToken;
                        config.headers["Authorization"] = formatToken(token);
                        config.headers["X-Token"] = token;
                        PureHttp.requests.forEach(cb => cb(token));
                        PureHttp.requests = [];
                      })
                      .finally(() => {
                        PureHttp.isRefreshing = false;
                      });
                  }
                  resolve(PureHttp.retryOriginalRequest(config));
                } else {
                  config.headers["Authorization"] = formatToken(
                    data.accessToken
                  );
                  config.headers["X-Token"] = data.accessToken;
                  resolve(config);
                }
              } else {
                resolve(config);
              }
            });
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        return response.data;
      },
      async (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        // 后端已改为按语义返回真实 HTTP 状态（400/403/404/500...），失败响应不再走 then，
        // 统一落到这里。responseType: "blob"（导出接口）拿到的错误体是 Blob，
        // getErrorMessage 读不到 body.msg，因此这里先把它解析回 JSON 对象。
        await normalizeBlobErrorBody($error);
        // 401：登录态失效，清理 token 并跳转登录页（不弹 toast，已跳转登录）
        if ($error?.response?.status === 401) {
          removeToken();
          if (location.hash !== "#/login") location.hash = "#/login";
          return Promise.reject($error);
        }
        // 其余响应异常交由业务侧 catch 处理（不在此做全局 toast，避免重复弹窗）
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();

/**
 * 把 blob 形态的错误响应体还原成 JSON 对象。
 *
 * 背景：导出类接口用 `responseType: "blob"`，后端出错时返回的是
 * `application/json` 的错误体（被包成 Blob）。axios 拒绝后
 * `error.response.data` 是 Blob，`getErrorMessage` / `useDownload`
 * 都读不到 `msg`，用户只能看到笼统的「导出失败」。
 *
 * 只处理 json / text 类型的 Blob；真二进制错误体（极罕见）保持原样，
 * 避免把文件内容误当 JSON 解析。
 */
async function normalizeBlobErrorBody(error: PureHttpError): Promise<void> {
  const response = error?.response;
  const raw = response?.data;
  if (!(raw instanceof Blob)) return;

  const type = (raw.type || "").toLowerCase();
  if (!type.includes("json") && !type.includes("text")) return;

  try {
    const text = await raw.text();
    if (!text) return;
    (response as { data: unknown }).data = JSON.parse(text);
  } catch {
    // 解析失败就保持 Blob 原样，交给调用方的兜底文案
  }
}
