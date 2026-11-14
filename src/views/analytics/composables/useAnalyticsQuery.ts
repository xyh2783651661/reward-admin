import { onMounted, ref, shallowRef, watch, type Ref } from "vue";
import type { StatsMeta } from "@/api/analytics";
import { getErrorMessage } from "@/utils/error";
import { message } from "@/utils/message";

type Fetcher<T> = (
  range: number
) => Promise<{ data?: { data: T; meta: StatsMeta } }>;

interface Options {
  /** 统计周期（天），传入 ref 时随其变化自动重新请求 */
  range?: Ref<number>;
  /** 失败提示前缀，例如「加载 AI 分析数据失败」 */
  errorLabel: string;
}

/**
 * 分析页统一的数据加载：loading / error / 数据 / 口径元信息，
 * 并用请求序号丢弃过期响应，避免快速切换周期时旧数据覆盖新数据。
 */
export function useAnalyticsQuery<T>(fetcher: Fetcher<T>, options: Options) {
  const data = shallowRef<T | null>(null);
  const meta = shallowRef<StatsMeta | null>(null);
  const loading = ref(false);
  const error = ref("");
  let requestId = 0;

  async function load() {
    const id = ++requestId;
    loading.value = true;
    error.value = "";
    try {
      const res = await fetcher(options.range?.value ?? 0);
      if (id !== requestId) return;
      data.value = res.data?.data ?? null;
      meta.value = res.data?.meta ?? null;
    } catch (e) {
      if (id !== requestId) return;
      error.value = getErrorMessage(e, options.errorLabel);
      message(error.value, { type: "error" });
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  if (options.range) watch(options.range, load);
  onMounted(load);

  return { data, meta, loading, error, load };
}
