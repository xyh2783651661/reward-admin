import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { emptyText, formatDate } from "@/utils/format";
import { message } from "@/utils/message";
import {
  getCacheStats,
  getCacheHealth,
  getCacheTopKeys,
  getCacheBigKeys,
  getCacheLogs,
  getRedisInfo,
  getCacheStatsHistory
} from "@/api/system";
import * as echarts from "echarts";
import type {
  CacheStats,
  CacheHealth,
  CacheTopKey,
  CacheBigKey,
  CacheOperationLog,
  CacheRedisInfo,
  CacheMetricItem,
  CacheInsight
} from "../cache/utils/types";

type CacheRequestResult<T> = PromiseSettledResult<{
  code: number;
  msg?: string;
  data?: T;
}>;

type FeedbackOptions = {
  silent?: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useCacheMonitor() {
  const loading = ref(true);
  const redisLoading = ref(false);
  const stats = ref<CacheStats | null>(null);
  const health = ref<CacheHealth | null>(null);
  const topKeys = ref<CacheTopKey[]>([]);
  const bigKeys = ref<CacheBigKey[]>([]);
  const logs = ref<CacheOperationLog[]>([]);
  const redisInfo = ref<CacheRedisInfo | null>(null);
  const lastUpdatedAt = ref("");
  const partialErrorText = ref("");

  // 组件卸载标志
  let isUnmounted = false;

  // 趋势图相关
  const trendChartRef = ref<HTMLDivElement | null>(null);
  const trendLoading = ref(false);
  const trendDuration = ref("1h");
  let trendChart: echarts.ECharts | null = null;

  const durationOptions = [
    { label: "1小时", value: "1h" },
    { label: "6小时", value: "6h" },
    { label: "24小时", value: "24h" },
    { label: "7天", value: "7d" }
  ];

  const isRedis = computed(() => {
    const cacheType = stats.value?.cacheType?.toLowerCase();
    return cacheType === "redis";
  });

  const statusMeta = computed(() => {
    if (!health.value) {
      return {
        text: "检测中",
        type: "info",
        message: "正在读取缓存健康状态与运行指标"
      };
    }

    if (health.value.available) {
      return {
        text: health.value.status || "运行中",
        type: "success",
        message: health.value.message || "缓存服务响应正常，监控数据可用"
      };
    }

    return {
      text: health.value.status || "异常",
      type: "danger",
      message: health.value.message || "缓存服务不可用，请检查连接或服务状态"
    };
  });

  const lastUpdatedText = computed(() => {
    return lastUpdatedAt.value
      ? `更新于 ${lastUpdatedAt.value}`
      : "等待首次刷新";
  });

  const hitRateDisplay = computed(() => {
    return formatPercent(stats.value?.hitRate);
  });

  const hitRateColor = computed(() => {
    const v = stats.value?.hitRate;
    if (v == null) return "";
    if (v >= 90) return "#67c23a";
    if (v >= 70) return "#e6a23c";
    return "#f56c6c";
  });

  const memoryPercent = computed(() => {
    const s = stats.value;
    if (s?.memoryUsageRate != null) return normalizePercent(s.memoryUsageRate);
    if (s?.usedMemory == null || !s?.maxMemory) return 0;
    return Math.min(100, Math.round((s.usedMemory / s.maxMemory) * 100));
  });

  const memoryUsageDisplay = computed(() => {
    if (stats.value?.memoryUsageRate != null) {
      return formatPercent(stats.value.memoryUsageRate);
    }
    if (stats.value?.usedMemory != null && stats.value.maxMemory) {
      return `${memoryPercent.value}%`;
    }
    if (stats.value?.usedMemory != null) return "无限制";
    return "-";
  });

  const memoryColor = computed(() => {
    const p = memoryPercent.value;
    if (p >= 90) return "#f56c6c";
    if (p >= 70) return "#e6a23c";
    return "#409eff";
  });

  const metricCards = computed<CacheMetricItem[]>(() => [
    {
      label: "Key 总数",
      value: formatNumber(stats.value?.keyCount),
      icon: "ri:key-2-line",
      gradient: "linear-gradient(135deg, #667eea, #764ba2)",
      description: "当前缓存中可检索的键数量"
    },
    {
      label: "请求次数",
      value: formatNumber(stats.value?.requestCount),
      icon: "ri:bar-chart-box-line",
      gradient: "linear-gradient(135deg, #f093fb, #f5576c)",
      description: "监控周期内累计缓存访问量"
    },
    {
      label: "命中率",
      value: hitRateDisplay.value,
      color: hitRateColor.value,
      highlight: true,
      icon: "ri:target-line",
      gradient: "linear-gradient(135deg, #4facfe, #00f2fe)",
      description: getHitRateHint(stats.value?.hitRate)
    },
    {
      label: "已用内存",
      value: formatMemory(stats.value?.usedMemory ?? null),
      sub: stats.value?.maxMemory
        ? `上限 ${formatMemory(stats.value.maxMemory)}`
        : "容量未限制",
      icon: "ri:database-line",
      gradient: "linear-gradient(135deg, #43e97b, #38f9d7)",
      description: getMemoryHint()
    },
    {
      label: "命中 / 未命中",
      value: formatNumber(stats.value?.hitCount),
      sub: `未命中 ${formatNumber(stats.value?.missCount)}`,
      icon: "ri:time-line",
      gradient: "linear-gradient(135deg, #fa709a, #fee140)",
      description: "命中次数越高，说明缓存策略越有效"
    },
    {
      label: "健康状态",
      value: statusMeta.value.text,
      color: health.value?.available ? "#67c23a" : "#f56c6c",
      icon: "ri:shield-check-line",
      gradient: "linear-gradient(135deg, #a18cd1, #fbc2eb)",
      description: statusMeta.value.message
    }
  ]);

  const insightCards = computed<CacheInsight[]>(() => {
    const cards: CacheInsight[] = [];

    if (health.value && !health.value.available) {
      cards.push({
        title: "服务异常",
        description: statusMeta.value.message,
        type: "danger",
        icon: "ri:error-warning-line"
      });
    }

    const hitRate = stats.value?.hitRate;
    if (hitRate != null && hitRate < 70) {
      cards.push({
        title: "命中率偏低",
        description: "建议检查热点数据是否正确写入缓存，或优化过期策略",
        type: "warning",
        icon: "ri:target-line"
      });
    }

    if (memoryPercent.value >= 90) {
      cards.push({
        title: "内存压力较高",
        description: "当前内存使用率接近上限，请关注大 Key 与淘汰策略",
        type: "danger",
        icon: "ri:database-2-line"
      });
    } else if (memoryPercent.value >= 70) {
      cards.push({
        title: "内存占用偏高",
        description: "建议定期清理冷数据，避免高峰期触发频繁驱逐",
        type: "warning",
        icon: "ri:database-2-line"
      });
    }

    if ((stats.value?.evictionCount ?? 0) > 0) {
      cards.push({
        title: "存在 Key 驱逐",
        description: `累计驱逐 ${formatNumber(stats.value?.evictionCount)} 次，可结合大 Key 分析定位原因`,
        type: "warning",
        icon: "ri:delete-bin-line"
      });
    }

    if (cards.length === 0) {
      cards.push({
        title: "运行表现稳定",
        description: "当前健康状态、命中率与容量指标均处于可接受范围",
        type: "success",
        icon: "ri:checkbox-circle-line"
      });
    }

    return cards.slice(0, 4);
  });

  const topKeyColumns: TableColumnList = [
    {
      label: "排名",
      type: "index",
      width: 60,
      align: "center"
    },
    {
      label: "Key",
      prop: "key",
      minWidth: 220,
      showOverflowTooltip: true,
      cellRenderer: ({ row }) => renderKeyCell(row?.key)
    },
    {
      label: "访问次数",
      prop: "accessCount",
      width: 110,
      align: "right",
      formatter: ({ row }) => formatNumber(row?.accessCount)
    },
    {
      label: "命中次数",
      prop: "hitCount",
      width: 110,
      align: "right",
      formatter: ({ row }) => formatNumber(row?.hitCount)
    },
    {
      label: "命中率",
      width: 80,
      align: "center",
      cellRenderer: ({ row }) => {
        if (!row?.accessCount) return "-";
        const rate = ((row.hitCount / row.accessCount) * 100).toFixed(1);
        const color =
          Number(rate) >= 90
            ? "#67c23a"
            : Number(rate) >= 70
              ? "#e6a23c"
              : "#f56c6c";
        return <span style={{ color, fontWeight: 600 }}>{rate}%</span>;
      }
    }
  ];

  const bigKeyColumns: TableColumnList = [
    {
      label: "排名",
      type: "index",
      width: 60,
      align: "center"
    },
    {
      label: "Key",
      prop: "key",
      minWidth: 220,
      showOverflowTooltip: true,
      cellRenderer: ({ row }) => renderKeyCell(row?.key)
    },
    {
      label: "类型",
      prop: "type",
      width: 70,
      align: "center",
      cellRenderer: ({ row }) => (
        <el-tag size="small" type="info">
          {emptyText(row?.type)}
        </el-tag>
      )
    },
    {
      label: "大小",
      prop: "sizeHuman",
      width: 110,
      align: "right",
      formatter: ({ row }) => (row?.sizeHuman ? emptyText(row.sizeHuman) : "-")
    }
  ];

  const logColumns: TableColumnList = [
    {
      label: "操作人",
      prop: "operator",
      width: 100,
      formatter: ({ row }) => emptyText(row?.operator)
    },
    {
      label: "操作",
      prop: "action",
      width: 70,
      cellRenderer: ({ row }) => {
        if (!row?.action) return "-";
        const map: Record<string, { text: string; type: string }> = {
          DELETE: { text: "删除", type: "danger" },
          CLEAR: { text: "清空", type: "danger" },
          PUT: { text: "写入", type: "success" },
          SET: { text: "设置", type: "success" },
          GET: { text: "读取", type: "info" },
          EVICT: { text: "驱逐", type: "warning" },
          EXPIRE: { text: "过期", type: "warning" }
        };
        const cfg = map[row.action] || {
          text: row.action,
          type: "info"
        };
        return (
          <el-tag size="small" type={cfg.type as any}>
            {cfg.text}
          </el-tag>
        );
      }
    },
    {
      label: "Key",
      prop: "key",
      minWidth: 220,
      showOverflowTooltip: true,
      cellRenderer: ({ row }) => renderKeyCell(row?.key)
    },
    {
      label: "时间",
      prop: "time",
      width: 170,
      formatter: ({ row }) => formatDate(row?.time)
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 150,
      showOverflowTooltip: true,
      formatter: ({ row }) => emptyText(row?.description)
    }
  ];

  /** Redis 详情描述字段 */
  const redisDetailItems = computed(() => {
    const redis = redisInfo.value;
    if (!redis) return [];
    return [
      { label: "版本", value: redis.version, icon: "ri:code-s-slash-line" },
      {
        label: "已用内存",
        value: redis.usedMemoryHuman || formatMemory(redis.usedMemory),
        icon: "ri:database-2-line"
      },
      {
        label: "最大内存",
        value: redis.maxMemory ? formatMemory(redis.maxMemory) : "无限制",
        icon: "ri:hard-drive-2-line"
      },
      {
        label: "连接客户端",
        value: formatNumber(redis.connectedClients),
        icon: "ri:user-voice-line"
      },
      {
        label: "QPS",
        value: formatNumber(redis.opsPerSec),
        icon: "ri:speed-line"
      },
      {
        label: "已过期 Key",
        value: formatNumber(redis.expiredKeys),
        icon: "ri:timer-line"
      },
      {
        label: "已驱逐 Key",
        value: formatNumber(redis.evictedKeys),
        icon: "ri:delete-bin-line"
      },
      {
        label: "运行时长",
        value: redis.uptimeInSeconds
          ? formatUptime(redis.uptimeInSeconds)
          : "-",
        icon: "ri:time-line"
      },
      {
        label: "命中次数",
        value: formatNumber(redis.keyspaceHits),
        icon: "ri:target-line"
      },
      {
        label: "未命中次数",
        value: formatNumber(redis.keyspaceMisses),
        icon: "ri:error-warning-line"
      }
    ];
  });

  function renderKeyCell(key: string | null | undefined) {
    const displayKey = emptyText(key);
    if (!key) return displayKey;

    return (
      <div class="cache-key-cell">
        <span class="cache-key-text" title={key}>
          {displayKey}
        </span>
        <button
          class="cache-key-copy"
          type="button"
          title="复制 Key"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            copyCacheKey(key);
          }}
        >
          复制
        </button>
      </div>
    );
  }

  async function copyCacheKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      message("Key 已复制", { type: "success" });
    } catch {
      message("复制失败，请手动选择 Key", { type: "error" });
    }
  }

  function formatNumber(value: number | null | undefined): string {
    if (value == null) return "-";
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  function formatPercent(value: number | null | undefined): string {
    if (value == null) return "-";
    return `${Number(value.toFixed(2))}%`;
  }

  function normalizePercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function getHitRateHint(value: number | null | undefined): string {
    if (value == null) return "暂无命中率数据，等待监控上报";
    if (value >= 90) return "命中表现优秀，可继续保持当前缓存策略";
    if (value >= 70) return "命中表现正常，仍可关注热点数据覆盖率";
    return "命中率偏低，建议检查缓存预热和过期策略";
  }

  function getMemoryHint(): string {
    if (stats.value?.usedMemory == null) return "当前缓存类型暂未上报内存指标";
    if (!stats.value?.maxMemory)
      return "当前未设置容量上限，请关注持续增长趋势";
    if (memoryPercent.value >= 90) return "内存压力较高，建议及时清理或扩容";
    if (memoryPercent.value >= 70)
      return "内存使用偏高，建议关注大 Key 与淘汰策略";
    return "内存使用处于安全区间";
  }

  function formatMemory(bytes: number | null | undefined): string {
    if (bytes == null) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    return `${(bytes / Math.pow(1024, unitIndex)).toFixed(1)} ${units[unitIndex]}`;
  }

  function formatUptime(seconds: number): string {
    if (!seconds || seconds < 60) return "小于 1 分钟";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天${hours}小时${minutes}分`;
    if (hours > 0) return `${hours}小时${minutes}分`;
    return `${minutes}分钟`;
  }

  /** 初始化趋势图 */
  function initTrendChart() {
    if (!trendChartRef.value || isUnmounted) return;
    // 确保 DOM 元素已挂载
    if (!trendChartRef.value.isConnected) return;
    trendChart = echarts.init(trendChartRef.value);
    updateTrendChart([]);
  }

  /** 更新趋势图配置 */
  function updateTrendChart(data: any[]) {
    if (!trendChart || isUnmounted) return;

    const times = data.map(item => item.time);
    const hitRates = data.map(item => item.hitRate);
    const memories = data.map(item =>
      item.usedMemory ? (item.usedMemory / 1024 / 1024).toFixed(2) : 0
    );
    const requests = data.map(item => item.requestCount);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--el-bg-color-overlay)",
        borderColor: "var(--el-border-color-lighter)",
        textStyle: { color: "var(--el-text-color-primary)" },
        axisPointer: { type: "cross" }
      },
      legend: {
        data: ["命中率", "内存(MB)", "请求量"],
        bottom: 0,
        textStyle: { color: "var(--el-text-color-regular)" }
      },
      grid: {
        left: 50,
        right: 50,
        top: 20,
        bottom: 40
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: "var(--el-border-color)" } },
        axisLabel: { color: "var(--el-text-color-secondary)" }
      },
      yAxis: [
        {
          type: "value",
          name: "命中率(%)",
          min: 0,
          max: 100,
          axisLine: { show: false },
          splitLine: {
            lineStyle: { color: "var(--el-border-color-extra-light)" }
          },
          axisLabel: { color: "var(--el-text-color-secondary)" }
        },
        {
          type: "value",
          name: "内存(MB)",
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: { color: "var(--el-text-color-secondary)" }
        }
      ],
      series: [
        {
          name: "命中率",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2 },
          itemStyle: { color: "#67c23a" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(103, 194, 58, 0.3)" },
              { offset: 1, color: "rgba(103, 194, 58, 0.05)" }
            ])
          },
          data: hitRates
        },
        {
          name: "内存(MB)",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2 },
          itemStyle: { color: "#409eff" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(64, 158, 255, 0.3)" },
              { offset: 1, color: "rgba(64, 158, 255, 0.05)" }
            ])
          },
          data: memories
        },
        {
          name: "请求量",
          type: "bar",
          barWidth: 20,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#f093fb" },
              { offset: 1, color: "#f5576c" }
            ]),
            borderRadius: [4, 4, 0, 0]
          },
          data: requests
        }
      ]
    };

    trendChart.setOption(option, true);
  }

  /** 刷新趋势图数据 */
  async function refreshTrend(options: FeedbackOptions = {}) {
    if (!trendChart || isUnmounted) return;
    trendLoading.value = true;
    try {
      const res = await getCacheStatsHistory({
        type: stats.value?.cacheType || "local",
        duration: trendDuration.value
      });
      if (isUnmounted) return;
      if (res.code === 200) {
        updateTrendChart(res.data?.points || []);
      } else if (!options.silent) {
        message(res.msg || "趋势数据刷新失败", { type: "error" });
      }
    } catch (error) {
      if (!options.silent) {
        message(getErrorMessage(error, "趋势数据刷新失败"), { type: "error" });
      }
    } finally {
      if (!isUnmounted) {
        trendLoading.value = false;
      }
    }
  }

  /** 窗口 resize 处理 */
  function handleResize() {
    if (!isUnmounted && trendChart) {
      trendChart.resize();
    }
  }

  async function loadData(options: FeedbackOptions = {}) {
    if (isUnmounted) return;
    loading.value = true;
    partialErrorText.value = "";
    try {
      const [statsRes, healthRes, topRes, bigRes, logsRes] =
        await Promise.allSettled([
          getCacheStats(),
          getCacheHealth(),
          getCacheTopKeys(10),
          getCacheBigKeys(10),
          getCacheLogs(20)
        ]);

      if (isUnmounted) return;

      const failedModules: string[] = [];
      const nextStats = unwrapResult(
        statsRes as CacheRequestResult<CacheStats>,
        "统计概览",
        failedModules
      );
      const nextHealth = unwrapResult(
        healthRes as CacheRequestResult<CacheHealth>,
        "健康状态",
        failedModules
      );
      const nextTopKeys = unwrapResult(
        topRes as CacheRequestResult<{ keys: CacheTopKey[] }>,
        "热点 Key",
        failedModules
      );
      const nextBigKeys = unwrapResult(
        bigRes as CacheRequestResult<{ keys: CacheBigKey[] }>,
        "大 Key",
        failedModules
      );
      const nextLogs = unwrapResult(
        logsRes as CacheRequestResult<{ logs: CacheOperationLog[] }>,
        "操作日志",
        failedModules
      );

      if (nextStats) stats.value = nextStats;
      if (nextHealth) health.value = nextHealth;
      if (nextTopKeys) topKeys.value = nextTopKeys.keys ?? [];
      if (nextBigKeys) bigKeys.value = nextBigKeys.keys ?? [];
      if (nextLogs) logs.value = nextLogs.logs ?? [];

      partialErrorText.value = failedModules.length
        ? `部分数据加载失败：${failedModules.join("、")}`
        : "";

      // 仅 Redis 时加载 Redis 专属信息
      if (nextStats) {
        const cacheType = nextStats.cacheType?.toLowerCase();
        if (cacheType === "redis") {
          await loadRedisInfo(options);
        } else {
          redisInfo.value = null;
        }
      }

      if (isUnmounted) return;

      // 加载趋势数据
      await nextTick();
      if (!trendChart && !isUnmounted) {
        initTrendChart();
      }
      await refreshTrend({ silent: true });
      lastUpdatedAt.value = formatDate(new Date().toISOString());

      if (!options.silent) {
        message(partialErrorText.value || "缓存监控已刷新", {
          type: partialErrorText.value ? "warning" : "success"
        });
      }
    } catch (error) {
      partialErrorText.value = getErrorMessage(error, "缓存监控加载失败");
      if (!options.silent) {
        message(partialErrorText.value, { type: "error" });
      }
    } finally {
      if (!isUnmounted) {
        loading.value = false;
      }
    }
  }

  function unwrapResult<T>(
    result: CacheRequestResult<T>,
    label: string,
    failedModules: string[]
  ): T | null {
    if (result.status === "fulfilled" && result.value.code === 200) {
      return result.value.data ?? null;
    }

    failedModules.push(label);
    return null;
  }

  async function loadRedisInfo(options: FeedbackOptions = {}) {
    if (isUnmounted) return;
    redisLoading.value = true;
    try {
      const res = await getRedisInfo();
      if (isUnmounted) return;
      if (res.code === 200) {
        redisInfo.value = res.data;
      } else if (!options.silent) {
        message(res.msg || "Redis 信息加载失败", { type: "error" });
      }
    } catch (error) {
      redisInfo.value = null;
      if (!options.silent) {
        message(getErrorMessage(error, "Redis 信息加载失败"), {
          type: "error"
        });
      }
    } finally {
      if (!isUnmounted) {
        redisLoading.value = false;
      }
    }
  }

  onMounted(() => {
    loadData({ silent: true });
    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    isUnmounted = true;
    window.removeEventListener("resize", handleResize);
    if (trendChart) {
      trendChart.dispose();
      trendChart = null;
    }
  });

  return {
    loading,
    redisLoading,
    stats,
    health,
    topKeys,
    bigKeys,
    logs,
    redisInfo,
    isRedis,
    statusMeta,
    lastUpdatedText,
    partialErrorText,
    hitRateDisplay,
    hitRateColor,
    memoryPercent,
    memoryUsageDisplay,
    memoryColor,
    metricCards,
    insightCards,
    topKeyColumns,
    bigKeyColumns,
    logColumns,
    redisDetailItems,
    formatMemory,
    formatUptime,
    loadData,
    loadRedisInfo,
    // 趋势图相关
    trendChartRef,
    trendLoading,
    trendDuration,
    durationOptions,
    refreshTrend
  };
}
