<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsAccessOverview,
  type AnalyticsAccessOverview
} from "@/api/analytics";
import AnalyticsChart from "../components/AnalyticsChart.vue";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import Chapter from "../components/Chapter.vue";
import DataTable from "../components/DataTable.vue";
import FactList, { type Fact } from "../components/FactList.vue";
import type { Finding } from "../components/FindingList.vue";
import FindingsSection from "../components/FindingsSection.vue";
import LeadStrip from "../components/LeadStrip.vue";
import Readout from "../components/Readout.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import {
  SEMANTIC,
  cartesianOption,
  donutOption,
  rankingOption,
  toneColor,
  tooltipHtml
} from "../utils/chartTheme";
import {
  failRateTone,
  formatDuration,
  formatNumber,
  formatPercent
} from "../utils/format";
import { compareHalves, peakIndex } from "../utils/series";

defineOptions({ name: "AnalyticsAccess" });

const FAIL_WARN = 5;
const FAIL_CRITICAL = 10;
const API_FAIL_CRITICAL = 50;
const P95_WARN_MS = 1000;

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

const daily = computed(() => data.value?.dailyTrend ?? []);
const effectiveSpark = computed(() => daily.value.map(i => i.effective));

const findingRules = `整体失败率 > ${FAIL_WARN}%（> ${FAIL_CRITICAL}% 为严重）；单接口失败率 > ${API_FAIL_CRITICAL}%；接口 P95 > ${P95_WARN_MS}ms；疑似批量脚本`;

const findings = computed<Finding[]>(() => {
  const d = data.value;
  if (!d) return [];
  const list: Finding[] = [];

  if (d.failRate > FAIL_WARN) {
    list.push({
      level: d.failRate > FAIL_CRITICAL ? "critical" : "warning",
      module: "访问",
      title: "整体请求失败率偏高",
      evidence: `${scope.value}失败 ${formatNumber(d.failCount)} 次，失败率 ${formatPercent(d.failRate)}（阈值 ${FAIL_WARN}% / ${FAIL_CRITICAL}%）`,
      actionLabel: "查看失败日志",
      onAction: () => goSystemLog({ success: "false" })
    });
  }

  const worst = [...(d.failApis ?? [])].sort(
    (a, b) => b.failRate - a.failRate
  )[0];
  if (worst && worst.failRate > API_FAIL_CRITICAL) {
    list.push({
      level: "critical",
      module: "访问",
      title: `接口 ${worst.uri} 失败率超过一半`,
      evidence: `${formatNumber(worst.failCount)} / ${formatNumber(worst.total)} 次失败，失败率 ${formatPercent(worst.failRate)}（阈值 ${API_FAIL_CRITICAL}%）`,
      actionLabel: "查看该接口日志",
      onAction: () => goSystemLog({ uri: worst.uri, success: "false" })
    });
  }

  const slow = [...(d.apiLatency ?? [])].filter(a => a.p95 > P95_WARN_MS);
  if (slow.length) {
    list.push({
      level: "warning",
      module: "访问",
      title: `${slow.length} 个接口 P95 耗时超过 1 秒`,
      evidence: `最慢：${slow[0].uri}，P95 ${formatDuration(slow[0].p95)}（仅统计请求量 ≥ 20 的接口，阈值 ${P95_WARN_MS}ms）`
    });
  }

  const scripts = d.batchScripts?.length ?? 0;
  if (scripts > 0) {
    list.push({
      level: "info",
      module: "访问",
      title: `检测到 ${scripts} 个疑似批量脚本`,
      evidence:
        "同一 IP + 接口请求 ≥ 50 次且 80% 以上耗时 0ms，详见「异常来源」章节"
    });
  }
  return list;
});

const hourTotals = computed(() => {
  const totals = Array.from({ length: 24 }, () => 0);
  (data.value?.heatmap ?? []).forEach(p => (totals[p.hour] += p.count));
  return totals;
});

const weekdayTotals = computed(() => {
  const totals = Array.from({ length: 7 }, () => 0);
  (data.value?.heatmap ?? []).forEach(p => (totals[p.weekday - 1] += p.count));
  return totals;
});

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const hours = Array.from({ length: 24 }, (_, i) => `${i} 时`);

const trafficFacts = computed<Fact[]>(() => {
  const d = data.value;
  const t = daily.value;
  const facts: Fact[] = [];
  if (!d || !t.length) return facts;

  const pk = peakIndex(t.map(i => i.effective));
  if (pk >= 0)
    facts.push({
      label: "请求最多的一天",
      value: t[pk].date,
      hint: `${formatNumber(t[pk].effective)} 次有效请求`
    });

  const cmp = compareHalves(t.map(i => i.effective));
  if (cmp?.relative != null)
    facts.push({
      label: "后半段 vs 前半段",
      value: `${cmp.relative >= 0 ? "+" : ""}${formatPercent(cmp.relative)}`,
      hint: `日均 ${formatNumber(Math.round(cmp.first))} → ${formatNumber(Math.round(cmp.second))} 次`
    });

  const hourPeak = peakIndex(hourTotals.value);
  if ((data.value?.heatmap?.length ?? 0) > 0 && hourPeak >= 0)
    facts.push({
      label: "最繁忙的小时",
      value: hours[hourPeak],
      hint: `${scope.value}累计 ${formatNumber(hourTotals.value[hourPeak])} 次`
    });

  const dayPeak = peakIndex(weekdayTotals.value);
  if ((data.value?.heatmap?.length ?? 0) > 0 && dayPeak >= 0)
    facts.push({
      label: "最繁忙的星期",
      value: weekdays[dayPeak],
      hint: `${scope.value}累计 ${formatNumber(weekdayTotals.value[dayPeak])} 次`
    });

  const all = d.effectiveRequests + d.pollingRequests;
  if (all > 0)
    facts.push({
      label: "轮询请求占比",
      value: formatPercent((d.pollingRequests / all) * 100),
      hint: `${formatNumber(d.pollingRequests)} 次系统通知轮询，已从业务指标中排除`
    });
  return facts;
});

const performanceFacts = computed<Fact[]>(() => {
  const d = data.value;
  const facts: Fact[] = [];
  if (!d) return facts;
  const slowest = [...(d.apiLatency ?? [])].sort((a, b) => b.p95 - a.p95)[0];
  if (slowest)
    facts.push({
      label: "P95 最慢的接口",
      value: formatDuration(slowest.p95),
      hint: slowest.uri
    });
  const worst = [...(d.failApis ?? [])].sort(
    (a, b) => b.failRate - a.failRate
  )[0];
  if (worst)
    facts.push({
      label: "失败率最高的接口",
      value: formatPercent(worst.failRate),
      hint: `${worst.uri}（${formatNumber(worst.failCount)} / ${formatNumber(worst.total)}）`
    });
  return facts;
});

const sourceFacts = computed<Fact[]>(() => {
  const d = data.value;
  const facts: Fact[] = [];
  if (!d) return facts;
  const top = d.topIps?.[0];
  if (top && d.effectiveRequests > 0)
    facts.push({
      label: "请求最多的 IP",
      value: formatPercent((top.requestCount / d.effectiveRequests) * 100),
      hint: `${top.ip}（${top.ipLocation || "未知归属地"}）占全部有效请求，共 ${formatNumber(top.requestCount)} 次`
    });
  facts.push({
    label: "疑似批量脚本",
    value: `${d.batchScripts?.length ?? 0} 个`,
    hint: "同一 IP + 接口请求 ≥ 50 次且 80% 以上耗时 0ms"
  });
  return facts;
});

const dailyOption = computed(() => {
  const t = daily.value;
  const option = cartesianOption({
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
  const pk = peakIndex(t.map(i => i.effective));
  if (pk >= 0) {
    option.series[0] = {
      ...option.series[0],
      markPoint: {
        symbolSize: 44,
        data: [
          {
            name: "峰值",
            coord: [t[pk].date, t[pk].effective],
            value: formatNumber(t[pk].effective)
          }
        ],
        label: { fontSize: 10 }
      }
    };
  }
  return option;
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
      description="流量如何变化、接口是否又快又稳、有没有异常访问来源（已排除通知轮询）"
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
      <LeadStrip>
        <Readout
          size="lead"
          label="有效请求"
          :value="data.effectiveRequests"
          :spark="effectiveSpark"
          :caption="`${scope} · 另有 ${formatNumber(data.pollingRequests)} 次轮询`"
          hint="排除系统通知轮询后的业务请求"
        />
        <Readout
          size="lead"
          label="独立公网 IP"
          :value="data.uniqueIps"
          :caption="scope"
        />
        <Readout
          size="lead"
          label="平均耗时"
          kind="duration"
          :value="data.avgCostMs"
        />
        <Readout
          size="lead"
          label="失败率"
          kind="percent"
          :value="data.failRate"
          :tone="failRateTone(data.failRate)"
          :caption="`失败 ${formatNumber(data.failCount)} 次`"
        />
      </LeadStrip>

      <FindingsSection :items="findings" :rules="findingRules" />

      <Chapter index="01" question="访问量在如何变化，什么时候最忙？">
        <template #facts>
          <FactList :items="trafficFacts" />
        </template>
        <div class="pair pair--wide">
          <div>
            <h3 class="pair__title">每日请求趋势</h3>
            <AnalyticsChart
              :option="dailyOption"
              :height="300"
              label="每日有效请求与轮询请求趋势"
            />
          </div>
          <div>
            <h3 class="pair__title">客户端类型</h3>
            <AnalyticsChart
              :option="clientOption"
              :height="300"
              label="客户端类型分布"
            />
          </div>
        </div>
        <h3 class="pair__title pair__title--spaced">
          访问时间规律（星期 × 小时，颜色越深请求越多）
        </h3>
        <AnalyticsChart
          v-if="data.heatmap?.length"
          :option="heatmapOption"
          :height="300"
          label="按星期和小时统计的访问热力图"
        />
        <p v-else class="pair__empty">当前周期没有可用于热力图的访问数据。</p>
      </Chapter>

      <Chapter index="02" question="接口是否又快又稳？">
        <template #facts>
          <FactList
            :items="performanceFacts"
            note="耗时表按 P95 降序，仅含请求量 ≥ 20 的接口；P50 > 500ms 或 P95 > 1000ms 会标色。"
          />
        </template>
        <h3 class="pair__title">API 耗时分位数</h3>
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
              <span :class="latencyClass(row.p95, 500, P95_WARN_MS)">
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

        <div class="pair pair--spaced">
          <div>
            <h3 class="pair__title">耗时分段分布（全量业务请求）</h3>
            <AnalyticsChart
              v-if="data.latencyBuckets?.length"
              :option="bucketOption"
              :height="280"
              label="请求耗时分段分布"
            />
            <p v-else class="pair__empty">当前周期没有耗时分段数据。</p>
          </div>
          <div>
            <h3 class="pair__title">失败率 TOP10 接口（点击查看失败日志）</h3>
            <AnalyticsChart
              v-if="data.failApis?.length"
              :option="failOption"
              :height="Math.max(240, data.failApis.length * 36)"
              clickable
              label="接口失败率排行"
              @chart-click="
                p => p?.name && goSystemLog({ uri: p.name, success: 'false' })
              "
            />
            <p v-else class="pair__empty">当前周期没有出现失败的接口。</p>
          </div>
        </div>
      </Chapter>

      <Chapter index="03" question="有没有异常的访问来源？">
        <template #facts>
          <FactList :items="sourceFacts" />
        </template>
        <div class="pair">
          <div>
            <h3 class="pair__title">
              高频 IP 排行 TOP15（点击行查看访问日志）
            </h3>
            <DataTable :data="data.topIps" clickable @row-click="onIpClick">
              <el-table-column prop="ip" label="IP" width="130" />
              <el-table-column
                prop="ipLocation"
                label="归属地"
                min-width="140"
                show-overflow-tooltip
              />
              <el-table-column label="请求数" width="90" align="right">
                <template #default="{ row }">{{
                  formatNumber(row.requestCount)
                }}</template>
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
          </div>
          <div>
            <h3 class="pair__title">疑似批量脚本</h3>
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
                <template #default="{ row }">{{
                  formatNumber(row.requestCount)
                }}</template>
              </el-table-column>
              <el-table-column label="0ms 占比" width="90" align="right">
                <template #default="{ row }">{{
                  formatPercent(row.zeroCostRate)
                }}</template>
              </el-table-column>
            </DataTable>
          </div>
        </div>
      </Chapter>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ra-space-xl);

  &--wide {
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  }

  &--spaced {
    margin-top: var(--ra-space-xl);
  }
}

.pair__title {
  margin: 0 0 var(--ra-space-sm);
  font-size: var(--ra-font-base);
  font-weight: 600;
  color: var(--el-text-color-primary);

  &--spaced {
    margin-top: var(--ra-space-xl);
  }
}

.pair__empty {
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.text-negative {
  color: var(--el-color-danger);
}

.text-warning {
  color: var(--el-color-warning);
}

@media (width <= 1100px) {
  .pair,
  .pair--wide {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
