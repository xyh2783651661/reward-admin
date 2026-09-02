import { ref } from "vue";
import { message } from "@/utils/message";
import {
  extractErrorMessage,
  isErrorResponse,
  readErrorText,
  saveBlob,
  type DownloadSource
} from "@/utils/download";

/**
 * 全局下载 / 导出 Hook
 *
 * 统一解决三件事，所有下载导出场景都应通过它调用，不要再各自手写：
 *
 * 1. **loading 状态**：请求期间按钮进入 loading，用户明确知道「已经在跑了」；
 * 2. **按钮幂等**：loading 期间再次点击直接丢弃，杜绝重复下发导出请求；
 * 3. **最小 loading 时长**：请求若几十毫秒就返回，按钮会闪一下就恢复，用户反而更不确定
 *    有没有触发。默认强制 loading 至少停留 400ms，保证每次点击都有可感知的反馈。
 *
 * 典型用法：
 * ```ts
 * const { loading, runExport } = useDownload();
 *
 * async function onExport() {
 *   await runExport(() => exportCheckRecord(payload), `检测流水_${ts}.xlsx`);
 * }
 * ```
 * 模板中绑定：` <el-button :loading="loading" @click="onExport">导出</el-button> `
 */

export interface DownloadTaskOptions {
  /**
   * 最小 loading 持续时间（毫秒），默认 400
   * 传 0 可关闭（仅建议在纯前端、无网络请求的场景使用）
   */
  minLoadingDuration?: number;
  /** 成功提示文案，默认「导出成功」，传 false 关闭提示 */
  successText?: string | false;
  /** 失败提示文案，默认「导出失败」，后端返回具体原因时会自动拼接在后 */
  errorText?: string;
  /** 幂等拦截时的提示文案，默认不提示（按钮已处于 loading，通常无需打扰用户） */
  busyText?: string | false;
  /** 额外的错误回调，用于上报或自定义处理 */
  onError?: (error: unknown) => void;
}

/** 默认最小 loading 时长：保证快速请求也有可感知的反馈 */
const DEFAULT_MIN_LOADING_DURATION = 400;

/**
 * 由业务主动抛出的下载错误，携带后端返回的真实原因
 *
 * 业务侧校验失败时（如「获取下载链接失败」）抛它，
 * Hook 会把 message 拼到失败提示后面，让用户看到具体原因而非笼统的「导出失败」。
 * 普通 Error 不会被展开，避免把 axios 的英文内部报错直接暴露给用户。
 */
export class DownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadError";
  }
}

/**
 * 全局下载 / 导出能力
 * @param defaults 该实例下所有任务的默认配置，可被单次调用覆盖
 */
export function useDownload(defaults: DownloadTaskOptions = {}) {
  /** 执行中标记：同时充当 loading 状态与幂等开关 */
  const loading = ref(false);

  const defaultMinDuration =
    defaults.minLoadingDuration ?? DEFAULT_MIN_LOADING_DURATION;

  /**
   * 执行任意异步下载任务，自带 loading、幂等与统一提示
   *
   * 幂等说明：`loading` 的置位发生在本函数第一个 await 之前（同步执行），
   * 因此同一按钮的连续快速点击不会出现两次都通过检查的情况。
   *
   * @returns 成功返回任务结果；被幂等拦截或失败时返回 undefined
   */
  async function run<T>(
    task: () => Promise<T>,
    options: DownloadTaskOptions = {}
  ): Promise<T | undefined> {
    const minDuration = options.minLoadingDuration ?? defaultMinDuration;

    // —— 幂等守卫：同步判断，执行中直接丢弃后续点击 ——
    if (loading.value) {
      const busyText = options.busyText ?? defaults.busyText;
      if (busyText) {
        message(busyText, { type: "warning" });
      }
      return undefined;
    }

    loading.value = true;

    try {
      const [result] = await Promise.all([task(), delay(minDuration)]);
      notifySuccess(options, defaults);
      return result;
    } catch (error) {
      handleError(error, options, defaults);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 执行二进制导出：请求 -> 探测错误响应 -> 落盘
   *
   * 相比裸调用接口，这里额外拦截了「HTTP 200 但响应体是 JSON 错误」的情况，
   * 避免把一段错误 JSON 当成文件下载下来还提示成功。
   */
  async function runExport(
    api: () => Promise<any>,
    fileName: string | (() => string),
    options: DownloadTaskOptions = {}
  ): Promise<void> {
    return run(async () => {
      const data = await api();

      if (isErrorResponse(data)) {
        const text = await readErrorText(data);
        throw new DownloadError(extractErrorMessage(text));
      }

      saveBlob(data as DownloadSource, resolveFileName(fileName));
    }, options);
  }

  return {
    /** loading 状态，直接绑定给按钮的 `:loading`；由内部维护，外部不要直接改写 */
    loading,
    /**
     * 通用执行入口，自带 loading 与幂等
     *
     * 适用于不走单一 Blob 落盘的场景，例如先拉链接列表再逐个触发下载，
     * 整体仍只占用一个 loading 态。
     */
    run,
    /** 二进制导出：请求 -> 探测错误响应 -> 落盘 */
    runExport
  };
}

function resolveFileName(fileName: string | (() => string)): string {
  return typeof fileName === "function" ? fileName() : fileName;
}

/** 成功提示：单次配置优先于实例默认值，显式传 false 则不提示 */
function notifySuccess(
  options: DownloadTaskOptions,
  defaults: DownloadTaskOptions
): void {
  const text = options.successText ?? defaults.successText ?? "导出成功";
  if (text) {
    message(text, { type: "success" });
  }
}

/** 失败提示：单次配置优先于实例默认值，后端有具体原因时拼接在后 */
function handleError(
  error: unknown,
  options: DownloadTaskOptions,
  defaults: DownloadTaskOptions
): void {
  const errorText = options.errorText ?? defaults.errorText ?? "导出失败";

  // 保留调用方的自定义钩子
  options.onError?.(error);
  defaults.onError?.(error);

  const detail =
    error instanceof DownloadError && error.message ? error.message : "";

  console.error(errorText, error);
  message(detail ? `${errorText}：${detail}` : errorText, { type: "error" });
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => window.setTimeout(resolve, ms));
}
