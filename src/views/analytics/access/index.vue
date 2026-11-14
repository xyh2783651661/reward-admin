<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsAccessOverview,
  type AnalyticsAccessOverview
} from "@/api/analytics";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import AnalyticsSection from "../components/AnalyticsSection.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import MetricCard from "../components/MetricCard.vue";
import ChartCard from "../components/ChartCard.vue";
import DataTable from "../components/DataTable.vue";
import InsightPanel, { type Insight } from "../components/InsightPanel.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import {
  SEMANTIC,
  cartesianOption,
  rankingOption,
  donutOption,
  tooltipHtml,
  toneColor
} from "../utils/chartTheme";
import {
  failRateTone,
  formatDuration,
  formatNumber,
  formatPercent
} from "../utils/format";

defineOptions({ name: "AnalyticsAccess" });

const router = useRouter();
const range = ref(30);
const scope = computed(() => `近 ${range.value} 天`);

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsAccessOverview>(
    days => getAnalyticsAccessOverview(days),
    { range, errorLabel: "加载访问分析数据失败" }
  );

function goSystemLog(query: Record<string, string>) {
  router.push({ path: "/log/system", query });
}

const insights = computed<Insight[]>(() => {
  const d = data.value;
  if (!d) return [];
  const list: Insight[] = [];

  if (d.failRate > 5) {
    list.push({
      level: d.failRate > 10 ? "critical" : "warning",
      title: "整体请求失败率偏高",
      evidence: `${scope.value}失败率 ${formatPercent(d.failRate)}（阈值 5% / 10%）`,
      actionLabel: "查看失败日志",
      onAction: () => goSystemLog({ success: "false" })
    });
  }

  const worst = [...(d.failApis ?? [])].sort(
    (a, b) => b.failRate - a.failRate
  )[0];
  if (worst && worst.failRate > 50) {
    list.push({
      level: "critical",
      title: `接口 ${worst.uri} 失败率超过一半`,
      evidence: `失败率 ${formatPercent(worst.failRate)}，建议优先排查`,
      actionLabel: "查看该接口日志",
      onAction: () => goSystemLog({ uri: worst.uri, success: "false" })
    });
  }

  const slow = (d.apiLatency ?? []).filter(a => a.p95 > 1000);
  if (slow.length) {
    list.push({
      level: "warning",
      title: `${slow.length} 个接口 P95 耗时超过 1 秒`,
      evidence: `最慢：${slow[0].uri}，P95 ${formatDuration(slow[0].p95)}（请求量 ≥ 20 的接口，阈值 1000ms）`
    });
  }

  const scripts = d.batchScripts?.length ?? 0;
  if (scripts > 0) {
    list.push({
      level: "info",
      title: `检测到 ${scripts} 个疑似批量脚本`,
      evidence:
        "同一 IP + 接口请求 ≥ 50 次且 80% 以上耗时 0ms，详见页面下方列表"
    });
  }
  return list;
});

const dailyOption = computed(() => {
  const t = data.value?.dailyTrend ?? [];
  return cartesianOption({
    categories: t.map(i => i.date),
    series: [
      {
        name: "有效请求",
        type: "line",
        data: t.map(i => i.effective),
        color: SEMANTIC.primary,
        area: true
      },
      {
        name: "轮询请求",
        type: "line",
        data: t.map(i => i.polling),
        color: SEMANTIC.muted,
        dashed: true
      }
    ],
    leftAxis: { name: "次" },
    tooltipFormatters: {
      有效请求: v => `${formatNumber(v)} 次`,
      轮询请求: v => `${formatNumber(v)} 次`
    }
  });
});

const clientTotal = computed(() =>
  (data.value?.clientTypes ?? []).reduce((s, i) => s + i.count, 0)
);

const clientOption = computed(() => {
  const list = [...(data.value?.clientTypes ?? [])].sort(
    (a, b) => b.count - a.count
  );
  if (list.length <= 6) {
    return donutOption({
      items: list.map(c => ({ name: c.browserType, value: c.count })),
      valueName: "请求数",
      format: v => formatNumber(v),
      centerValue: formatNumber(clientTotal.value),
      centerTitle: "请求"
    });
  }
  return rankingOption({
    items: list.slice(0, 10).map(c => ({
      name: c.browserType,
      value: c.count,
      label: `${formatNumber(c.count)} · ${formatPercent(clientTotal.value ? (c.count / clientTotal.value) * 100 : 0)}`
    })),
    valueName: "请求数",
    format: v => formatNumber(v)
  });
});

const bucketColors = [
  SEMANTIC.positive,
  SEMANTIC.primary,
  SEMANTIC.warning,
  SEMANTIC.negative
];

const bucketOption = computed(() => {
  const b = data.value?.latencyBuckets ?? [];
  const option = cartesianOption({
    categories: b.map(i => i.bucket),
    series: [{ name: "请求数", data: b.map(i => i.count) }],
    barMaxWidth: 56,
    tooltipFormatters: { 请求数: v => `${formatNumber(v)} 次` },
    tooltipNote: i => {
      const item = b[i ?? -1];
      return item
        ? `占全部业务请求 ${formatPercent(item.percentage)}`
        : undefined;
    }
  });
  option.series[0] = {
    ...option.series[0],
    data: b.map((i, idx) => ({
      value: i.count,
      itemStyle: {
        color: bucketColors[idx % bucketColors.length],
        borderRadius: [3, 3, 0, 0]
      }
    })),
    label: {
      show: true,
      position: "top",
      fontSize: 11,
      formatter: (p: any) => formatPercent(b[p.dataIndex]?.percentage)
    }
  };
  return option;
});

const failOption = computed(() =>
  rankingOption({
    items: (data.value?.failApis ?? []).map(a => ({
      name: a.uri,
      value: a.failRate,
      color: toneColor(failRateTone(a.failRate)),
      note: "点击查看该接口的失败日志"
    })),
    valueName: "失败率",
    format: v => formatPercent(v),
    max: 100,
    labelWidth: 200
  })
);

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const hours = Array.from({ length: 24 }, (_, i) => `${i} 时`);

const heatmapOption = computed(() => {
  const points = data.value?.heatmap ?? [];
  const max = Math.max(...points.map(p => p.count), 1);
  return {
    tooltip: {
      position: "top",
      formatter: (p: any) =>
        tooltipHtml(`${weekdays[p.value[1]]} ${hours[p.value[0]]}`, [
          {
            color: SEMANTIC.primary,
            label: "请求",
            value: `${formatNumber(p.value[2])} 次`
          }
        ])
    },
    grid: { left: 4, right: 12, top: 8, bottom: 52, containLabel: true },
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true },
      axisLabel: { interval: 2 }
    },
    yAxis: { type: "category", data: weekdays, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemWidth: 12,
      itemHeight: 140,
      inRange: { color: ["#eef2ff", "#a5b4fc", "#4f46e5", "#312e81"] }
    },
    series: [
      {
        type: "heatmap",
        data: points.map(p => [p.hour, p.weekday - 1, p.count]),
        emphasis: { itemStyle: { borderColor: "#fff", borderWidth: 1 } }
      }
    ]
  };
});

function onIpClick(row: { ipLocation?: string }) {
  if (row?.ipLocation) goSystemLog({ ipLocation: row.ipLocation });
}

function latencyClass(value: number, warn: number, danger: number) {
  if (value > danger) return "text-negative";
  if (value > warn) return "text-warning";
  return "";
}
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="访问分析"
      description="请求量、接口性能与异常访问（已排除通知轮询）"
      :loading="loading"
      @refresh="load"
    />
    <StatsMetaLine :meta="meta" />

    <AnalyticsState
      :loading="loading"
      :error="error"
      :has-data="!!data"
      @retry="load"
    />

    <template v-if="data">
      <InsightPanel
        :insights="insights"
        rules="整体失败率 > 5%；单接口失败率 > 50%；接口 P95 > 1000ms；疑似批量脚本"
        :loading="loading"
      />

      <div class="access-metrics">
        <MetricCard
          label="有效请求"
          :value="data.effectiveRequests"
          size="hero"
          hint="排除系统通知轮询后的业务请求"
          :caption="scope"
        />
        <MetricCard label="独立公网 IP" :value="data.uniqueIps" size="hero" />
        <MetricCard
          label="平均耗时"
          :value="data.avgCostMs"
          kind="duration"
          size="hero"
        />
        <MetricCard
          label="失败率"
          :value="data.failRate"
          kind="percent"
          size="hero"
          :tone="failRateTone(data.failRate)"
          clickable
          @click="goSystemLog({ success: 'false' })"
        />
      </div>

      <AnalyticsSection title="流量概览">
        <div class="access-grid access-grid--wide">
          <ChartCard
            title="请求趋势"
            description="有效请求与系统轮询"
            :scope="scope"
            :option="dailyOption"
            :height="300"
            :empty="!data.dailyTrend?.length"
          />
          <ChartCard
            title="客户端类型"
            :scope="scope"
            :option="clientOption"
            :height="300"
            :empty="!data.clientTypes?.length"
          />
        </div>
        <ChartCard
          title="访问时间规律"
          description="星期 × 小时，颜色越深请求越多"
          :scope="scope"
          :option="heatmapOption"
          :height="300"
          :empty="!data.heatmap?.length"
        />
      </AnalyticsSection>

      <AnalyticsSection title="接口性能与失败">
        <ChartCard
          title="API 耗时分位数"
          description="按 P95 降序，仅展示请求量 ≥ 20 的接口；P50 > 500ms 或 P95 > 1000ms 标色"
          :scope="scope"
          :empty="!data.apiLatency?.length"
        >
          <DataTable :data="data.apiLatency">
            <el-table-column
              prop="uri"
              label="接口"
              min-width="220"
              show-overflow-tooltip
            />
            <el-table-column label="请求数" width="100" align="right">
              <template #default="{ row }">{{
                formatNumber(row.count)
              }}</template>
            </el-table-column>
            <el-table-column label="平均" width="90" align="right">
              <template #default="{ row }">{{
                formatDuration(row.avgMs)
              }}</template>
            </el-table-column>
            <el-table-column label="P50" width="90" align="right">
              <template #default="{ row }">
                <span :class="latencyClass(row.p50, 500, Infinity)">
                  {{ formatDuration(row.p50) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="P95" width="90" align="right">
              <template #default="{ row }">
                <span :class="latencyClass(row.p95, 500, 1000)">
                  {{ formatDuration(row.p95) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="P99" width="90" align="right">
              <template #default="{ row }">{{
                formatDuration(row.p99)
              }}</template>
            </el-table-column>
            <el-table-column label="最大" width="90" align="right">
              <template #default="{ row }">{{
                formatDuration(row.maxMs)
              }}</template>
            </el-table-column>
          </DataTable>
        </ChartCard>

        <div class="access-grid">
          <ChartCard
            title="耗时分段分布"
            description="全量业务请求"
            :scope="scope"
            :option="bucketOption"
            :height="280"
            :empty="!data.latencyBuckets?.length"
          />
          <ChartCard
            title="失败率 TOP10 接口"
            description="点击条形查看该接口的失败日志"
            :scope="scope"
            :option="failOption"
            :height="Math.max(240, (data.failApis?.length ?? 0) * 36)"
            :empty="!data.failApis?.length"
            clickable
            @chart-click="
              p => p?.name && goSystemLog({ uri: p.name, success: 'false' })
            "
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="异常来源">
        <div class="access-grid">
          <ChartCard
            title="高频 IP 排行 TOP15"
            description="点击行查看该归属地访问日志"
            :scope="scope"
            :empty="!data.topIps?.length"
          >
            <DataTable :data="data.topIps" clickable @row-click="onIpClick">
              <el-table-column prop="ip" label="IP" width="130" />
              <el-table-column
                prop="ipLocation"
                label="归属地"
                min-width="140"
                show-overflow-tooltip
              />
              <el-table-column label="请求数" width="90" align="right">
                <template #default="{ row }">
                  {{ formatNumber(row.requestCount) }}
                </template>
              </el-table-column>
              <el-table-column
                prop="distinctUris"
                label="接口数"
                width="80"
                align="right"
              />
              <el-table-column
                prop="lastSeen"
                label="最后访问"
                min-width="150"
              />
            </DataTable>
          </ChartCard>
          <ChartCard
            title="疑似批量脚本"
            description="同一 IP + 接口请求 ≥ 50 次且 80% 以上耗时 0ms"
            :scope="scope"
          >
            <DataTable :data="data.batchScripts" empty-text="未检测到批量脚本">
              <el-table-column prop="ip" label="IP" width="130" />
              <el-table-column
                prop="ipLocation"
                label="归属地"
                min-width="120"
                show-overflow-tooltip
              />
              <el-table-column
                prop="uri"
                label="接口"
                min-width="160"
                show-overflow-tooltip
              />
              <el-table-column label="请求数" width="90" align="right">
                <template #default="{ row }">
                  {{ formatNumber(row.requestCount) }}
                </template>
              </el-table-column>
              <el-table-column label="0ms 占比" width="90" align="right">
                <template #default="{ row }">
                  {{ formatPercent(row.zeroCostRate) }}
                </template>
              </el-table-column>
            </DataTable>
          </ChartCard>
        </div>
      </AnalyticsSection>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.access-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ra-space-md);
}

.access-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--ra-space-md);

  &--wide {
    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  }
}

.text-negative {
  color: var(--el-color-danger);
}

.text-warning {
  color: var(--el-color-warning);
}
</style>
