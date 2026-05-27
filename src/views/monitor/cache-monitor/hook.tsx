import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { emptyText, formatDate } from "@/utils/format";
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
  CacheOperationLog
} from "../cache/utils/types";

export function useCacheMonitor() {
  const loading = ref(true);
  const redisLoading = ref(false);
  const stats = ref<CacheStats | null>(null);
  const health = ref<CacheHealth | null>(null);
  const topKeys = ref<CacheTopKey[]>([]);
  const bigKeys = ref<CacheBigKey[]>([]);
  const logs = ref<CacheOperationLog[]>([]);
  const redisInfo = ref<Record<string, any> | null>(null);

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
    const t = stats.value?.cacheType?.toLowerCase();
    return t === "redis";
  });

  const hitRateDisplay = computed(() => {
    const v = stats.value?.hitRate;
    return v != null ? `${v}%` : "-";
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
    if (!s?.usedMemory || !s?.maxMemory) return 0;
    return Math.min(100, Math.round((s.usedMemory / s.maxMemory) * 100));
  });

  const memoryColor = computed(() => {
    const p = memoryPercent.value;
    if (p >= 90) return "#f56c6c";
    if (p >= 70) return "#e6a23c";
    return "#409eff";
  });

  const topKeyColumns: TableColumnList = [
    {
      label: "排名",
      type: "index",
      width: 60,
      align: "center"
    },
    { label: "Key", prop: "key", minWidth: 150 },
    {
      label: "访问次数",
      prop: "accessCount",
      width: 90,
      align: "right"
    },
    {
      label: "命中次数",
      prop: "hitCount",
      width: 90,
      align: "right"
    },
    {
      label: "命中率",
      width: 80,
      align: "center",
      cellRenderer: ({ row }) => {
        if (!row.accessCount) return "-";
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
    { label: "Key", prop: "key", minWidth: 150 },
    {
      label: "类型",
      prop: "type",
      width: 70,
      align: "center",
      cellRenderer: ({ row }) => (
        <el-tag size="small" type="info">
          {emptyText(row.type)}
        </el-tag>
      )
    },
    {
      label: "大小",
      prop: "sizeHuman",
      width: 90,
      align: "right",
      formatter: ({ row }) => emptyText(row.sizeHuman)
    }
  ];

  const logColumns: TableColumnList = [
    { label: "操作人", prop: "operator", width: 90 },
    {
      label: "操作",
      prop: "action",
      width: 70,
      cellRenderer: ({ row }) => {
        const map: Record<string, { text: string; type: string }> = {
          delete: { text: "删除", type: "danger" },
          clear: { text: "清空", type: "danger" },
          put: { text: "写入", type: "success" },
          get: { text: "读取", type: "info" },
          evict: { text: "驱逐", type: "warning" }
        };
        const cfg = map[row.action] || { text: row.action, type: "info" };
        return (
          <el-tag size="small" type={cfg.type as any}>
            {cfg.text}
          </el-tag>
        );
      }
    },
    { label: "Key", prop: "key", minWidth: 150 },
    {
      label: "时间",
      prop: "time",
      width: 140,
      formatter: ({ row }) => formatDate(row.time)
    },
    {
      label: "描述",
      prop: "description",
      minWidth: 150,
      showOverflowTooltip: true,
      formatter: ({ row }) => emptyText(row.description)
    }
  ];

  /** Redis 详情描述字段 */
  const redisDetailItems = computed(() => {
    const r = redisInfo.value;
    if (!r) return [];
    return [
      { label: "版本", value: r.version, icon: "ri:code-s-slash-line" },
      {
        label: "已用内存",
        value: r.usedMemoryHuman || formatMemory(r.usedMemory),
        icon: "ri:database-2-line"
      },
      {
        label: "最大内存",
        value: r.maxMemory ? formatMemory(r.maxMemory) : "无限制",
        icon: "ri:hard-drive-2-line"
      },
      {
        label: "连接客户端",
        value: r.connectedClients,
        icon: "ri:user-voice-line"
      },
      { label: "QPS", value: r.opsPerSec, icon: "ri:speed-line" },
      {
        label: "已过期 Key",
        value: r.expiredKeys,
        icon: "ri:timer-line"
      },
      {
        label: "已驱逐 Key",
        value: r.evictedKeys,
        icon: "ri:delete-bin-line"
      },
      {
        label: "运行时长",
        value: r.uptimeInSeconds ? formatUptime(r.uptimeInSeconds) : "-",
        icon: "ri:time-line"
      },
      {
        label: "命中次数",
        value: r.keyspaceHits,
        icon: "ri:target-line"
      },
      {
        label: "未命中次数",
        value: r.keyspaceMisses,
        icon: "ri:error-warning-line"
      }
    ];
  });

  function formatMemory(bytes: number | null | undefined): string {
    if (bytes == null) return "-";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}天${h}小时${m}分`;
    if (h > 0) return `${h}小时${m}分`;
    return `${m}分钟`;
  }

  /** 初始化趋势图 */
  function initTrendChart() {
    if (!trendChartRef.value) return;
    trendChart = echarts.init(trendChartRef.value);
    updateTrendChart([]);
  }

  /** 更新趋势图配置 */
  function updateTrendChart(data: any[]) {
    if (!trendChart) return;

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
  async function refreshTrend() {
    if (!trendChart) return;
    trendLoading.value = true;
    try {
      const res = await getCacheStatsHistory({
        type: stats.value?.cacheType || "local",
        duration: trendDuration.value
      });
      if (res.code === 200) {
        updateTrendChart(res.data?.points || []);
      }
    } finally {
      trendLoading.value = false;
    }
  }

  /** 窗口 resize 处理 */
  function handleResize() {
    trendChart?.resize();
  }

  async function loadData() {
    loading.value = true;
    try {
      const [statsRes, healthRes, topRes, bigRes, logsRes] = await Promise.all([
        getCacheStats(),
        getCacheHealth(),
        getCacheTopKeys(10),
        getCacheBigKeys(10),
        getCacheLogs(20)
      ]);
      if (statsRes.code === 200) stats.value = statsRes.data;
      if (healthRes.code === 200) health.value = healthRes.data;
      if (topRes.code === 200) topKeys.value = topRes.data.keys;
      if (bigRes.code === 200) bigKeys.value = bigRes.data.keys;
      if (logsRes.code === 200) logs.value = logsRes.data.logs;

      // 仅 Redis 时加载 Redis 专属信息
      if (statsRes.code === 200) {
        const t = statsRes.data?.cacheType?.toLowerCase();
        if (t === "redis") {
          await loadRedisInfo();
        }
      }

      // 加载趋势数据
      await nextTick();
      if (!trendChart) {
        initTrendChart();
      }
      await refreshTrend();
    } finally {
      loading.value = false;
    }
  }

  async function loadRedisInfo() {
    redisLoading.value = true;
    try {
      const res = await getRedisInfo();
      if (res.code === 200) redisInfo.value = res.data;
    } finally {
      redisLoading.value = false;
    }
  }

  onMounted(() => {
    loadData();
    window.addEventListener("resize", handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    trendChart?.dispose();
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
    hitRateDisplay,
    hitRateColor,
    memoryPercent,
    memoryColor,
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
