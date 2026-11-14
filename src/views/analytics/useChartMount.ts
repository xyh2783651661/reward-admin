import { onBeforeUnmount, ref } from "vue";
import echarts from "@/plugins/echarts";

/**
 * 分析页图表统一挂载逻辑。
 *
 * <p>解决两个常见问题：</p>
 * <ol>
 *   <li>模板中必须使用绑定写法 `:ref="el => setChartRef('key', el)"`，
 *       使用字符串写法 `ref="el => ..."` 时 Vue 会把它当作 ref 名而不会执行函数。</li>
 *   <li>ECharts 在 `display:none` 容器（如未激活的 Tab）内初始化会得到 0 尺寸，
 *       需要用 {@link resizeAll} 在容器可见后重新计算。</li>
 * </ol>
 */
export function useChartMount() {
  const chartRefs = ref<Record<string, HTMLElement>>({});
  const charts: Record<string, echarts.ECharts> = {};
  const chartEls: Record<string, HTMLElement> = {};

  /** 模板 ref 回调：绑定到 :ref 上 */
  function setChartRef(key: string, el: unknown) {
    if (el instanceof HTMLElement) {
      chartRefs.value[key] = el;
    }
  }

  /**
   * 挂载（或重新挂载）图表。
   * 若容器元素已更换（v-if 重建），会销毁旧实例并在新容器上重建，避免渲染到游离节点。
   */
  function mountChart(
    key: string,
    option: Record<string, any>,
    theme?: string
  ) {
    const el = chartRefs.value[key];
    if (!el) return;

    const existing = charts[key];
    if (existing && !existing.isDisposed()) {
      if (chartEls[key] === el) {
        existing.setOption(option, true);
        existing.resize();
        return;
      }
      // 容器已更换，销毁旧实例后重建
      existing.dispose();
      delete charts[key];
      delete chartEls[key];
    }

    const chart = echarts.init(el as HTMLElement, theme ?? null, {
      renderer: "canvas"
    });
    charts[key] = chart;
    chartEls[key] = el as HTMLElement;
    chart.setOption(option);
    chart.resize();
  }

  /** 容器恢复可见后调用，强制重算尺寸 */
  function resizeAll() {
    Object.values(charts).forEach(chart => {
      if (!chart.isDisposed()) chart.resize();
    });
  }

  function resizeChart(key: string) {
    const chart = charts[key];
    if (chart && !chart.isDisposed()) chart.resize();
  }

  /**
   * 绑定图表点击事件（用于下钻）。
   * 每次重新挂载后都需要重新绑定，因此建议在 render 之后调用。
   */
  function onChartClick(key: string, handler: (params: any) => void) {
    const chart = charts[key];
    if (!chart || chart.isDisposed()) return;
    chart.off("click");
    chart.on("click", handler);
  }

  function onResize() {
    resizeAll();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("resize", onResize);
  }

  onBeforeUnmount(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onResize);
    }
    Object.keys(charts).forEach(key => {
      const chart = charts[key];
      if (chart && !chart.isDisposed()) chart.dispose();
      delete charts[key];
      delete chartEls[key];
    });
  });

  return {
    chartRefs,
    setChartRef,
    mountChart,
    resizeAll,
    resizeChart,
    onChartClick
  };
}
