<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsTaskExecution,
  getAnalyticsPublishOverview,
  getAnalyticsContentProduction,
  getAnalyticsImageUsage,
  type AnalyticsTaskOverview,
  type AnalyticsPublishOverview,
  type AnalyticsContentOverview,
  type AnalyticsImageConsumption
} from "@/api/analytics";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import AnalyticsSection from "../components/AnalyticsSection.vue";
import AnalyticsNote from "../components/AnalyticsNote.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import ChartCard from "../components/ChartCard.vue";
import DataTable from "../components/DataTable.vue";
import RateBar from "../components/RateBar.vue";
import Readout from "../components/Readout.vue";
import LeadStrip from "../components/LeadStrip.vue";
import FindingsSection from "../components/FindingsSection.vue";
import type { Finding } from "../components/FindingList.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import {
  PALETTE,
  SEMANTIC,
  cartesianOption,
  rankingOption,
  donutOption,
  toneColor
} from "../utils/chartTheme";
import {
  failRateTone,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTokens,
  successRateTone
} from "../utils/format";

defineOptions({ name: "AnalyticsTask" });

const router = useRouter();
const activeTab = ref("execution");
const range = ref(30);
const scope = computed(() => `近 ${range.value} 天`);

const task = useAnalyticsQuery<AnalyticsTaskOverview>(
  days => getAnalyticsTaskExecution(days),
  { range, errorLabel: "加载任务执行数据失败" }
);
const publish = useAnalyticsQuery<AnalyticsPublishOverview>(
  days => getAnalyticsPublishOverview(days),
  { range, errorLabel: "加载发布链路数据失败" }
);
const content = useAnalyticsQuery<AnalyticsContentOverview>(
  days => getAnalyticsContentProduction(days),
  { range, errorLabel: "加载内容生产数据失败" }
);
// 图片消费固定看近 90 天，与内容生产口径独立
const image = useAnalyticsQuery<AnalyticsImageConsumption>(
  () => getAnalyticsImageUsage(90),
  { errorLabel: "加载图片消费数据失败" }
);

const anyLoading = computed(
  () =>
    task.loading.value ||
    publish.loading.value ||
    content.loading.value ||
    image.loading.value
);

function refreshAll() {
  task.load();
  publish.load();
  content.load();
  image.load();
}

function onFailTaskClick(row: { taskName?: string; status?: string }) {
  router.push({
    path: "/log/operation",
    query: { taskName: row?.taskName ?? "", status: row?.status ?? "FAILED" }
  });
}

// ==================== 任务执行 ====================

interface ParsedStep {
  stepName?: string;
  success?: boolean;
  status?: string;
  costMs?: number;
  errorMessage?: string | null;
  message?: string | null;
}

const partialRows = computed(() =>
  (task.data.value?.partialTasks ?? []).map(t => {
    let steps: ParsedStep[] = [];
    try {
      const parsed = JSON.parse(t.detail ?? "[]");
      if (Array.isArray(parsed)) steps = parsed as ParsedStep[];
    } catch {
      steps = [];
    }
    return { ...t, steps };
  })
);

const taskInsights = computed<Finding[]>(() => {
  const d = task.data.value;
  if (!d) return [];
  const list: Finding[] = [];
  for (const t of d.taskStats ?? []) {
    if (t.total < 5 || t.successRate >= 90) continue;
    list.push({
      level: t.successRate < 70 ? "critical" : "warning",
      title: `任务「${t.taskName}」成功率偏低`,
      evidence: `${scope.value}执行 ${formatNumber(t.total)} 次，成功 ${formatNumber(t.success)}、失败 ${formatNumber(t.fail)}、部分成功 ${formatNumber(t.partial)}，成功率 ${formatPercent(t.successRate)}（阈值 90% / 70%，样本 ≥ 5）`,
      actionLabel: "查看任务日志",
      onAction: () =>
        onFailTaskClick({ taskName: t.taskName, status: "FAILED" })
    });
  }
  if (d.partialCount > 0) {
    list.push({
      level: "info",
      title: `${formatNumber(d.partialCount)} 次任务仅部分成功`,
      evidence: "部分步骤失败但整体未中断，详见下方「部分成功任务」的步骤明细"
    });
  }
  return list;
});

const taskTrendOption = computed(() => {
  const t = task.data.value?.monthlyTrend ?? [];
  return cartesianOption({
    categories: t.map(i => i.month),
    series: [
      {
        name: "成功",
        stack: "run",
        data: t.map(i => i.success),
        color: SEMANTIC.primary
      },
      {
        name: "未成功",
        stack: "run",
        data: t.map(i => i.total - i.success),
        color: SEMANTIC.negative
      },
      {
        name: "成功率",
        type: "line",
        rightAxis: true,
        data: t.map(i => i.successRate),
        color: SEMANTIC.warning
      }
    ],
    leftAxis: { name: "次" },
    rightAxis: { name: "成功率", max: 100, formatter: v => `${v}%` },
    tooltipFormatters: {
      成功: v => `${formatNumber(v)} 次`,
      未成功: v => `${formatNumber(v)} 次`,
      成功率: v => formatPercent(v)
    },
    tooltipNote: i => {
      const item = t[i ?? -1];
      return item ? `平均耗时 ${formatDuration(item.avgCostMs)}` : undefined;
    }
  });
});

// ==================== 内容生产 ====================

const contentInsights = computed<Finding[]>(() => {
  const d = content.data.value;
  if (!d) return [];
  const list: Finding[] = [];
  if (d.fetchSuccessRate < 80) {
    list.push({
      level: d.fetchSuccessRate < 60 ? "critical" : "warning",
      title: "整体抓取成功率偏低",
      evidence: `${scope.value}成功率 ${formatPercent(d.fetchSuccessRate)}（成功 ${formatNumber(d.fetchSuccess)} / 空结果 ${formatNumber(d.fetchEmpty)} / 失败 ${formatNumber(d.fetchFailed)}，阈值 80% / 60%）`
    });
  }
  for (const s of (d.sourceStats ?? [])
    .filter(s => s.total >= 10 && s.successRate < 60)
    .slice(0, 3)) {
    list.push({
      level: "warning",
      title: `信源 ${s.sourceKey} 可用性低`,
      evidence: `抓取 ${formatNumber(s.total)} 次，成功率 ${formatPercent(s.successRate)}，空结果 ${formatNumber(s.empty)} 次、失败 ${formatNumber(s.failed)} 次（阈值 60%，样本 ≥ 10）`
    });
  }
  if (d.visionCoverage < 80) {
    list.push({
      level: "info",
      title: "图片视觉描述覆盖率偏低",
      evidence: `覆盖率 ${formatPercent(d.visionCoverage)}（完成 ${formatNumber(d.visionDone)} / 失败 ${formatNumber(d.visionFailed)} / 待处理 ${formatNumber(d.visionPending)}）；无描述的图片几乎不会被选用`
    });
  }
  return list;
});

const sourceFetchOption = computed(() =>
  rankingOption({
    items: (content.data.value?.sourceStats ?? []).map(s => ({
      name: s.sourceKey,
      value: s.successRate,
      color: toneColor(successRateTone(s.successRate)),
      note: `抓取 ${formatNumber(s.total)} 次 · 成功 ${formatNumber(s.success)} · 空结果 ${formatNumber(s.empty)} · 失败 ${formatNumber(s.failed)} · 平均耗时 ${formatDuration(s.avgCostMs)}`
    })),
    valueName: "抓取成功率",
    format: v => formatPercent(v),
    max: 100,
    labelWidth: 160
  })
);

// ==================== 图片消费 ====================

const img = computed(() => image.data.value);

const imageInsights = computed<Finding[]>(() => {
  const d = img.value;
  if (!d) return [];
  const list: Finding[] = [];
  if (d.coverageRate < 80) {
    list.push({
      level: d.coverageRate < 50 ? "critical" : "warning",
      title: "图片库存覆盖率偏低",
      evidence: `近 90 天仅 ${formatNumber(d.distinctImagesUsed)} / ${formatNumber(d.activeImageTotal)} 张活跃图片被消费，覆盖率 ${formatPercent(d.coverageRate)}（阈值 80% / 50%），沉睡图片 ${formatNumber(d.unusedImageCount)} 张`
    });
  }
  for (const v of d.visionImpact ?? []) {
    if (v.statusCode !== "0" && v.statusCode !== "2") continue;
    if (v.stock < 10 || v.coverageRate >= 20) continue;
    list.push({
      level: "warning",
      title: `「${v.statusLabel}」图片几乎不被选用`,
      evidence: `库存 ${formatNumber(v.stock)} 张，仅 ${formatNumber(v.usedImages)} 张被消费，覆盖率 ${formatPercent(v.coverageRate)}。补全视觉描述可显著提升可用性`
    });
  }
  const topAuthor = (d.authorStats ?? [])[0];
  if (topAuthor && topAuthor.share > 30) {
    list.push({
      level: "info",
      title: `作者「${topAuthor.author}」占比过高`,
      evidence: `占全部消费的 ${formatPercent(topAuthor.share)}（阈值 30%），存在版权集中与断供风险`
    });
  }
  const eff = d.selectionEfficiency;
  if (eff && eff.utilizationRate < 70) {
    list.push({
      level: "warning",
      title: "选图利用率偏低",
      evidence: `选中 ${formatNumber(eff.totalSelected)} 张，其中 ${formatNumber(eff.failedImages)} 张随失败内容包沉没，利用率 ${formatPercent(eff.utilizationRate)}（阈值 70%）`
    });
  }
  return list;
});

const channelDonut = computed(() =>
  donutOption({
    items: (img.value?.channelStats ?? []).map(c => ({
      name: c.channel,
      value: c.count
    })),
    valueName: "消费次数",
    format: v => formatNumber(v),
    centerValue: formatNumber(img.value?.totalUsageRecords),
    centerTitle: "消费次数"
  })
);

const imgDailyOption = computed(() => {
  const d = img.value;
  const channels = d?.channelNames ?? [];
  const trend = d?.dailyTrend ?? [];
  return cartesianOption({
    categories: trend.map(t => t.date),
    series: channels.map((ch, idx) => ({
      name: ch,
      stack: "usage",
      data: trend.map(t => t.counts?.[idx] ?? 0),
      color: PALETTE[idx % PALETTE.length]
    })),
    leftAxis: { name: "次" },
    tooltipFormatters: Object.fromEntries(
      channels.map(ch => [ch, (v: number) => `${formatNumber(v)} 次`])
    )
  });
});

const reuseColors = [
  SEMANTIC.muted,
  SEMANTIC.primary,
  SEMANTIC.warning,
  SEMANTIC.positive
];

const reuseOption = computed(() => {
  const r = img.value?.reuseDistribution ?? [];
  const option = cartesianOption({
    categories: r.map(i => i.label),
    series: [{ name: "图片数", data: r.map(i => i.imageCount) }],
    barMaxWidth: 56,
    tooltipFormatters: { 图片数: v => `${formatNumber(v)} 张` },
    tooltipNote: i => {
      const item = r[i ?? -1];
      return item
        ? `占被引用图片 ${formatPercent(item.percentage)}`
        : undefined;
    }
  });
  option.series[0] = {
    ...option.series[0],
    data: r.map((i, idx) => ({
      value: i.imageCount,
      itemStyle: {
        color: reuseColors[idx % reuseColors.length],
        borderRadius: [3, 3, 0, 0]
      }
    })),
    label: {
      show: true,
      position: "top",
      fontSize: 11,
      formatter: (p: any) => formatPercent(r[p.dataIndex]?.percentage)
    }
  };
  return option;
});

const visionOption = computed(() =>
  rankingOption({
    items: (img.value?.visionImpact ?? []).map(v => ({
      name: v.statusLabel,
      value: v.coverageRate,
      color:
        v.coverageRate >= 80
          ? SEMANTIC.positive
          : v.coverageRate > 0
            ? SEMANTIC.warning
            : SEMANTIC.negative,
      note: `库存 ${formatNumber(v.stock)} 张，被消费 ${formatNumber(v.usedImages)} 张`
    })),
    valueName: "被消费率",
    format: v => formatPercent(v),
    max: 100
  })
);

const sourceOption = computed(() => {
  const s = img.value?.sourceStats ?? [];
  return cartesianOption({
    categories: s.map(i => i.source),
    series: [
      { name: "库存图片", data: s.map(i => i.stock), color: SEMANTIC.muted },
      {
        name: "消费次数",
        data: s.map(i => i.useCount),
        color: SEMANTIC.primary
      }
    ],
    barMaxWidth: 34,
    tooltipFormatters: {
      库存图片: v => `${formatNumber(v)} 张`,
      消费次数: v => `${formatNumber(v)} 次`
    }
  });
});

const freshnessOption = computed(() => {
  const f = img.value?.freshnessDistribution ?? [];
  const option = cartesianOption({
    categories: f.map(i => i.label),
    series: [{ name: "消费次数", data: f.map(i => i.count) }],
    barMaxWidth: 40,
    xLabel: { rotate: 20, fontSize: 11 },
    tooltipFormatters: { 消费次数: v => `${formatNumber(v)} 次` },
    tooltipNote: i => {
      const item = f[i ?? -1];
      return item ? `占全部消费 ${formatPercent(item.percentage)}` : undefined;
    }
  });
  option.series[0] = {
    ...option.series[0],
    data: f.map((i, idx) => ({
      value: i.count,
      itemStyle: {
        color: i.label.startsWith("异常")
          ? SEMANTIC.negative
          : PALETTE[idx % PALETTE.length],
        borderRadius: [3, 3, 0, 0]
      }
    })),
    label: {
      show: true,
      position: "top",
      fontSize: 11,
      formatter: (p: any) => formatPercent(f[p.dataIndex]?.percentage)
    }
  };
  return option;
});

const weekdayOption = computed(() => {
  const w = img.value?.weekdayDistribution ?? [];
  return cartesianOption({
    categories: w.map(i => i.label),
    series: [
      { name: "消费次数", data: w.map(i => i.count), color: SEMANTIC.primary }
    ],
    barMaxWidth: 40,
    tooltipFormatters: { 消费次数: v => `${formatNumber(v)} 次` }
  });
});

const bizTypeOption = computed(() =>
  rankingOption({
    items: (img.value?.bizTypeStats ?? []).slice(0, 10).map(b => ({
      name: b.bizType,
      value: b.count,
      label: `${formatNumber(b.count)} · ${formatPercent(b.percentage)}`
    })),
    valueName: "消费次数",
    format: v => formatNumber(v)
  })
);

/** 渠道 × 来源透视：行=渠道，列=来源 */
const matrixPivot = computed(() => {
  const cells = img.value?.channelSourceMatrix ?? [];
  const sources = [...new Set(cells.map(c => c.source))];
  const channels = [...new Set(cells.map(c => c.channel))];
  const rows = channels.map(ch => {
    const row: Record<string, any> = { channel: ch, total: 0 };
    sources.forEach(s => (row[s] = 0));
    for (const c of cells.filter(c => c.channel === ch)) {
      row[c.source] = c.count;
      row.total += c.count;
    }
    return row;
  });
  rows.sort((a, b) => b.total - a.total);
  return { sources, rows };
});

function visionHint(code: string) {
  if (code === "0") return "未生成描述，几乎不会被选中";
  if (code === "2") return "描述生成失败，可用性大幅下降";
  return "正常可用";
}

function demandTag(index: number) {
  if (index > 1.05) return "danger";
  if (index < 0.95) return "info";
  return "success";
}

// ==================== 发布链路 ====================

const publishInsights = computed<Finding[]>(() => {
  const d = publish.data.value;
  if (!d) return [];
  const list: Finding[] = [];
  if (d.totalPackages > 0 && d.publishSuccessRate < 90) {
    const top = [...(d.failReasons ?? [])].sort((a, b) => b.count - a.count)[0];
    list.push({
      level: d.publishSuccessRate < 70 ? "critical" : "warning",
      title: "内容包发布成功率偏低",
      evidence: `${scope.value}发布 ${formatNumber(d.publishedCount)} 个、失败 ${formatNumber(d.failedCount)} 个，成功率 ${formatPercent(d.publishSuccessRate)}（阈值 90% / 70%）${top ? `；最主要失败原因：${top.errorType}（${formatNumber(top.count)} 次）` : ""}`
    });
  }
  for (const p of (d.uploadStats ?? []).filter(
    p => p.total >= 10 && p.successRate < 90
  )) {
    list.push({
      level: p.successRate < 70 ? "critical" : "warning",
      title: `平台 ${p.platformCode} 上传成功率偏低`,
      evidence: `上传 ${formatNumber(p.total)} 次，失败 ${formatNumber(p.failed)} 次，成功率 ${formatPercent(p.successRate)}（阈值 90% / 70%，样本 ≥ 10）`
    });
  }
  for (const p of (d.platformAiCost ?? []).filter(
    p => p.contentCount >= 10 && p.failRate > 15
  )) {
    list.push({
      level: "info",
      title: `平台 ${p.platformCode} 的 AI 文案失败率偏高`,
      evidence: `生成 ${formatNumber(p.contentCount)} 条，失败率 ${formatPercent(p.failRate)}（阈值 15%）`
    });
  }
  return list;
});

const publishDonut = computed(() =>
  donutOption({
    items: [
      {
        name: "发布成功",
        value: publish.data.value?.publishedCount ?? 0,
        color: SEMANTIC.positive
      },
      {
        name: "发布失败",
        value: publish.data.value?.failedCount ?? 0,
        color: SEMANTIC.negative
      }
    ],
    valueName: "内容包",
    format: v => formatNumber(v),
    centerValue: formatPercent(publish.data.value?.publishSuccessRate),
    centerTitle: "成功率"
  })
);

const packageTrendOption = computed(() => {
  const t = publish.data.value?.packageDailyTrend ?? [];
  return cartesianOption({
    categories: t.map(i => i.date),
    series: [
      {
        name: "发布成功",
        stack: "pkg",
        data: t.map(i => i.published),
        color: SEMANTIC.positive
      },
      {
        name: "发布失败",
        stack: "pkg",
        data: t.map(i => i.failed),
        color: SEMANTIC.negative
      }
    ],
    leftAxis: { name: "内容包" },
    tooltipFormatters: {
      发布成功: v => `${formatNumber(v)} 个`,
      发布失败: v => `${formatNumber(v)} 个`
    }
  });
});
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="任务与内容"
      description="任务执行、内容生产、图片消费与发布链路"
      :loading="anyLoading"
      @refresh="refreshAll"
    />

    <el-tabs v-model="activeTab" class="task-tabs">
      <!-- 任务执行 -->
      <el-tab-pane label="任务执行" name="execution" lazy>
        <div class="task-pane">
          <StatsMetaLine :meta="task.meta.value" />
          <AnalyticsState
            :loading="task.loading.value"
            :error="task.error.value"
            :has-data="!!task.data.value"
            @retry="task.load"
          />
          <template v-if="task.data.value">
            <LeadStrip>
              <Readout
                size="lead"
                label="总执行"
                :value="task.data.value.totalTasks"
                :spark="task.data.value.monthlyTrend?.map(i => i.total)"
                :caption="scope"
              />
              <Readout
                size="lead"
                label="成功率"
                kind="percent"
                :value="task.data.value.successRate"
                :tone="successRateTone(task.data.value.successRate)"
                :spark="task.data.value.monthlyTrend?.map(i => i.successRate)"
                :caption="`失败 ${formatNumber(task.data.value.failCount)} 次`"
              />
              <Readout
                size="lead"
                label="部分成功"
                :value="task.data.value.partialCount"
                :tone="task.data.value.partialCount > 0 ? 'warning' : 'neutral'"
                hint="部分步骤失败但整体未中断的执行"
              />
              <Readout
                size="lead"
                label="平均耗时"
                kind="duration"
                :value="task.data.value.avgCostMs"
              />
            </LeadStrip>
            <FindingsSection
              :items="taskInsights"
              rules="任务成功率 < 90%（样本 ≥ 5）；存在部分成功任务"
            />

            <ChartCard
              title="月度执行趋势"
              description="成功与未成功堆叠为总执行量，折线为成功率"
              :scope="scope"
              :option="taskTrendOption"
              :height="300"
              :empty="!task.data.value.monthlyTrend?.length"
            />

            <ChartCard
              title="任务执行明细"
              :scope="scope"
              :empty="!task.data.value.taskStats?.length"
            >
              <DataTable :data="task.data.value.taskStats">
                <el-table-column
                  prop="taskName"
                  label="任务名称"
                  min-width="200"
                  show-overflow-tooltip
                />
                <el-table-column label="总数" width="80" align="right">
                  <template #default="{ row }">{{
                    formatNumber(row.total)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="success"
                  label="成功"
                  width="80"
                  align="right"
                />
                <el-table-column
                  prop="fail"
                  label="失败"
                  width="80"
                  align="right"
                />
                <el-table-column
                  prop="partial"
                  label="部分成功"
                  width="90"
                  align="right"
                />
                <el-table-column label="成功率" width="170">
                  <template #default="{ row }">
                    <RateBar
                      :value="row.successRate"
                      :tone="successRateTone(row.successRate)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="平均耗时" width="100" align="right">
                  <template #default="{ row }">{{
                    formatDuration(row.avgCostMs)
                  }}</template>
                </el-table-column>
              </DataTable>
            </ChartCard>

            <ChartCard
              v-if="partialRows.length"
              title="部分成功任务"
              description="展开查看每个步骤的执行结果"
              :scope="scope"
            >
              <DataTable :data="partialRows" row-key="startTime">
                <el-table-column type="expand">
                  <template #default="{ row }">
                    <div class="task-steps">
                      <el-table :data="row.steps" size="small" border>
                        <el-table-column
                          prop="stepName"
                          label="步骤"
                          min-width="220"
                          show-overflow-tooltip
                        />
                        <el-table-column label="状态" width="110">
                          <template #default="{ row: step }">
                            <el-tag
                              :type="step.success ? 'success' : 'danger'"
                              size="small"
                            >
                              {{
                                step.status ??
                                (step.success ? "SUCCESS" : "FAILED")
                              }}
                            </el-tag>
                          </template>
                        </el-table-column>
                        <el-table-column label="耗时" width="100" align="right">
                          <template #default="{ row: step }">{{
                            formatDuration(step.costMs)
                          }}</template>
                        </el-table-column>
                        <el-table-column
                          label="错误信息"
                          min-width="260"
                          show-overflow-tooltip
                        >
                          <template #default="{ row: step }">
                            {{ step.errorMessage ?? step.message ?? "—" }}
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="taskName" label="任务" min-width="180" />
                <el-table-column
                  prop="startTime"
                  label="开始时间"
                  min-width="170"
                />
                <el-table-column label="耗时" width="100" align="right">
                  <template #default="{ row }">{{
                    formatDuration(row.timeCost)
                  }}</template>
                </el-table-column>
                <el-table-column
                  label="失败 / 总步骤"
                  width="130"
                  align="right"
                >
                  <template #default="{ row }">
                    <span
                      :class="
                        row.failedStepCount > 0
                          ? 'text-negative'
                          : 'text-positive'
                      "
                    >
                      {{ row.failedStepCount }} / {{ row.totalStepCount }}
                    </span>
                  </template>
                </el-table-column>
              </DataTable>
            </ChartCard>

            <ChartCard
              v-if="task.data.value.failTasks?.length"
              title="失败任务"
              description="点击行查看对应任务日志"
              :scope="scope"
            >
              <DataTable
                :data="task.data.value.failTasks"
                clickable
                @row-click="onFailTaskClick"
              >
                <el-table-column prop="taskName" label="任务" min-width="180" />
                <el-table-column prop="status" label="状态" width="100" />
                <el-table-column label="耗时" width="100" align="right">
                  <template #default="{ row }">{{
                    formatDuration(row.timeCost)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="startTime"
                  label="开始时间"
                  min-width="170"
                />
                <el-table-column
                  prop="exception"
                  label="异常"
                  min-width="240"
                  show-overflow-tooltip
                />
              </DataTable>
            </ChartCard>
          </template>
        </div>
      </el-tab-pane>

      <!-- 内容生产 -->
      <el-tab-pane label="内容生产" name="production" lazy>
        <div class="task-pane">
          <StatsMetaLine :meta="content.meta.value" />
          <AnalyticsState
            :loading="content.loading.value"
            :error="content.error.value"
            :has-data="!!content.data.value"
            @retry="content.load"
          />
          <template v-if="content.data.value">
            <LeadStrip>
              <Readout
                size="lead"
                label="抓取总次数"
                :value="content.data.value.fetchTotal"
                :caption="scope"
              />
              <Readout
                size="lead"
                label="抓取成功率"
                kind="percent"
                :value="content.data.value.fetchSuccessRate"
                :tone="successRateTone(content.data.value.fetchSuccessRate)"
                :caption="`成功 ${formatNumber(content.data.value.fetchSuccess)} · 空结果 ${formatNumber(content.data.value.fetchEmpty)} · 失败 ${formatNumber(content.data.value.fetchFailed)}`"
              />
              <Readout
                size="lead"
                label="图片归档数"
                :value="content.data.value.imageTotal"
              />
              <Readout
                size="lead"
                label="视觉描述覆盖率"
                kind="percent"
                :value="content.data.value.visionCoverage"
                :tone="successRateTone(content.data.value.visionCoverage)"
                :caption="`完成 ${formatNumber(content.data.value.visionDone)} · 失败 ${formatNumber(content.data.value.visionFailed)} · 待处理 ${formatNumber(content.data.value.visionPending)}`"
              />
            </LeadStrip>
            <FindingsSection
              :items="contentInsights"
              rules="抓取成功率 < 80%；信源成功率 < 60%（样本 ≥ 10）；视觉描述覆盖率 < 80%"
            />

            <AnalyticsSection
              title="信源抓取可用性"
              description="按抓取成功率排序"
            >
              <ChartCard
                title="各信源抓取成功率"
                description="绿 ≥ 90%，橙 70–90%，红 < 70%"
                :scope="scope"
                :option="sourceFetchOption"
                :height="
                  Math.max(
                    220,
                    (content.data.value.sourceStats?.length ?? 0) * 36
                  )
                "
                :empty="!content.data.value.sourceStats?.length"
              />
              <ChartCard
                title="信源明细"
                :scope="scope"
                :empty="!content.data.value.sourceStats?.length"
              >
                <DataTable :data="content.data.value.sourceStats">
                  <el-table-column
                    prop="sourceKey"
                    label="信源"
                    min-width="180"
                    show-overflow-tooltip
                  />
                  <el-table-column label="总数" width="80" align="right">
                    <template #default="{ row }">{{
                      formatNumber(row.total)
                    }}</template>
                  </el-table-column>
                  <el-table-column
                    prop="success"
                    label="成功"
                    width="80"
                    align="right"
                  />
                  <el-table-column
                    prop="empty"
                    label="空结果"
                    width="80"
                    align="right"
                  />
                  <el-table-column
                    prop="failed"
                    label="失败"
                    width="80"
                    align="right"
                  />
                  <el-table-column label="成功率" width="170">
                    <template #default="{ row }">
                      <RateBar
                        :value="row.successRate"
                        :tone="successRateTone(row.successRate)"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="平均耗时" width="100" align="right">
                    <template #default="{ row }">{{
                      formatDuration(row.avgCostMs)
                    }}</template>
                  </el-table-column>
                </DataTable>
              </ChartCard>
            </AnalyticsSection>

            <AnalyticsNote title="数据覆盖说明"
              >抓取条目（daily_content_fetch_item）与图片（daily_image）之间没有可靠的直接关联
              ID，因此本页分别统计抓取可用性与图片视觉分析覆盖率，不做强行关联。</AnalyticsNote
            >
          </template>
        </div>
      </el-tab-pane>

      <!-- 图片消费 -->
      <el-tab-pane label="图片消费" name="imageUsage" lazy>
        <div class="task-pane">
          <StatsMetaLine :meta="image.meta.value" />
          <AnalyticsState
            :loading="image.loading.value"
            :error="image.error.value"
            :has-data="!!img"
            @retry="image.load"
          />
          <template v-if="img">
            <AnalyticsNote title="口径说明"
              >统计窗口固定为近 90 天，不随上方时间范围变化。覆盖率 = 被消费图片
              {{ formatNumber(img.distinctImagesUsed) }} / 活跃图片
              {{ formatNumber(img.activeImageTotal) }}；复用率基于全部被引用图片
              {{ formatNumber(img.distinctImagesReferenced) }} 张计算，平均每图
              {{ img.avgUsesPerImage }} 次。</AnalyticsNote
            >
            <LeadStrip>
              <Readout
                size="lead"
                label="消费次数"
                :value="img.totalUsageRecords"
                :spark="
                  img.dailyTrend?.map(
                    t => t.counts?.reduce((s, n) => s + n, 0) ?? 0
                  )
                "
                caption="近 90 天"
              />
              <Readout
                size="lead"
                label="覆盖率"
                kind="percent"
                :value="img.coverageRate"
                :tone="successRateTone(img.coverageRate)"
                :caption="`${formatNumber(img.distinctImagesUsed)} / ${formatNumber(img.activeImageTotal)} 张活跃图片`"
              />
              <Readout
                size="lead"
                label="复用率"
                kind="percent"
                :value="img.reuseRate"
              />
              <Readout
                size="lead"
                label="沉睡图片"
                :value="img.unusedImageCount"
                :tone="img.unusedImageCount > 0 ? 'warning' : 'positive'"
                hint="活跃但在统计窗口内从未被消费的图片"
                :caption="`单图最高复用 ${formatNumber(img.maxUses)} 次`"
              />
            </LeadStrip>
            <FindingsSection
              :items="imageInsights"
              rules="覆盖率 < 80%；无描述 / 描述失败图片被消费率 < 20%；单一作者占比 > 30%；选图利用率 < 70%"
            />

            <AnalyticsNote
              v-if="
                img.dataQuality &&
                (img.dataQuality.orphanRefs > 0 ||
                  img.dataQuality.deletedImageRefs > 0)
              "
              type="warning"
              title="数据质量提示"
              >{{ img.dataQuality.message }}（有效引用
              {{ formatNumber(img.dataQuality.validRefs) }} 张）</AnalyticsNote
            >

            <AnalyticsSection title="消费概览">
              <div class="task-grid task-grid--wide">
                <ChartCard
                  title="消费渠道分布"
                  :option="channelDonut"
                  :height="300"
                  :empty="!img.channelStats?.length"
                />
                <ChartCard
                  title="每日消费趋势"
                  description="按渠道堆叠，反映推送节奏"
                  :option="imgDailyOption"
                  :height="300"
                  :empty="!img.dailyTrend?.length"
                />
              </div>
              <div class="task-grid">
                <ChartCard
                  title="渠道消费明细"
                  :empty="!img.channelStats?.length"
                >
                  <DataTable :data="img.channelStats">
                    <el-table-column
                      prop="channel"
                      label="渠道"
                      min-width="90"
                    />
                    <el-table-column label="次数" width="80" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.count)
                      }}</template>
                    </el-table-column>
                    <el-table-column
                      prop="distinctImages"
                      label="图片数"
                      width="80"
                      align="right"
                    />
                    <el-table-column label="占比" width="80" align="right">
                      <template #default="{ row }">{{
                        formatPercent(row.percentage)
                      }}</template>
                    </el-table-column>
                    <el-table-column
                      prop="avgDaily"
                      label="日均"
                      width="70"
                      align="right"
                    />
                  </DataTable>
                </ChartCard>
                <ChartCard
                  title="业务类型 TOP10"
                  :option="bizTypeOption"
                  :height="
                    Math.max(
                      220,
                      Math.min(10, img.bizTypeStats?.length ?? 0) * 36
                    )
                  "
                  :empty="!img.bizTypeStats?.length"
                />
              </div>
            </AnalyticsSection>

            <AnalyticsSection
              title="图片可用性与来源"
              description="视觉描述是否生成，直接影响图片是否被选用"
            >
              <div class="task-grid">
                <ChartCard
                  title="视觉描述状态 × 被消费率"
                  :option="visionOption"
                  :height="Math.max(200, (img.visionImpact?.length ?? 0) * 56)"
                  :empty="!img.visionImpact?.length"
                />
                <ChartCard
                  title="视觉描述状态明细"
                  :empty="!img.visionImpact?.length"
                >
                  <DataTable :data="img.visionImpact">
                    <el-table-column
                      prop="statusLabel"
                      label="状态"
                      width="120"
                    />
                    <el-table-column label="库存" width="80" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.stock)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="被消费" width="80" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.usedImages)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="被消费率" width="160">
                      <template #default="{ row }">
                        <RateBar
                          :value="row.coverageRate"
                          :tone="
                            row.coverageRate >= 80
                              ? 'positive'
                              : row.coverageRate > 0
                                ? 'warning'
                                : 'negative'
                          "
                        />
                      </template>
                    </el-table-column>
                    <el-table-column label="解读" min-width="200">
                      <template #default="{ row }">{{
                        visionHint(row.statusCode)
                      }}</template>
                    </el-table-column>
                  </DataTable>
                </ChartCard>
              </div>
              <div class="task-grid">
                <ChartCard
                  title="来源效率"
                  description="库存 vs 消费次数，差距大的来源需评估"
                  :option="sourceOption"
                  :height="280"
                  :empty="!img.sourceStats?.length"
                />
                <ChartCard title="来源明细" :empty="!img.sourceStats?.length">
                  <DataTable :data="img.sourceStats">
                    <el-table-column
                      prop="source"
                      label="来源"
                      min-width="100"
                    />
                    <el-table-column label="库存" width="75" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.stock)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="被用" width="75" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.usedImages)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="覆盖率" width="160">
                      <template #default="{ row }">
                        <RateBar
                          :value="row.coverageRate"
                          :tone="
                            row.coverageRate >= 90
                              ? 'positive'
                              : row.coverageRate >= 70
                                ? 'warning'
                                : 'negative'
                          "
                        />
                      </template>
                    </el-table-column>
                    <el-table-column
                      prop="avgUses"
                      label="平均复用"
                      width="90"
                      align="right"
                    />
                    <el-table-column label="下载耗时" width="90" align="right">
                      <template #default="{ row }">
                        {{
                          row.avgDownloadCostMs
                            ? formatDuration(row.avgDownloadCostMs)
                            : "—"
                        }}
                      </template>
                    </el-table-column>
                    <el-table-column label="消费份额" width="90" align="right">
                      <template #default="{ row }">{{
                        formatPercent(row.useShare)
                      }}</template>
                    </el-table-column>
                  </DataTable>
                </ChartCard>
              </div>
            </AnalyticsSection>

            <AnalyticsSection title="消费行为">
              <div class="task-grid task-grid--three">
                <ChartCard
                  title="复用次数分布"
                  description="一张图被用了几次"
                  :option="reuseOption"
                  :height="260"
                  :empty="!img.reuseDistribution?.length"
                />
                <ChartCard
                  title="消费新鲜度"
                  description="图片日期到实际使用日期的滞后"
                  :option="freshnessOption"
                  :height="260"
                  :empty="!img.freshnessDistribution?.length"
                />
                <ChartCard
                  title="星期分布"
                  :option="weekdayOption"
                  :height="260"
                  :empty="!img.weekdayDistribution?.length"
                />
              </div>
              <div class="task-grid">
                <ChartCard
                  title="构图供需"
                  description="需求指数 = 消费占比 / 库存占比；> 1.05 供不应求，< 0.95 供过于求"
                  :empty="!img.orientationStats?.length"
                >
                  <DataTable :data="img.orientationStats">
                    <el-table-column
                      prop="orientation"
                      label="构图"
                      min-width="90"
                    />
                    <el-table-column label="库存" width="70" align="right">
                      <template #default="{ row }">{{
                        formatNumber(row.stock)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="库存占比" width="90" align="right">
                      <template #default="{ row }">{{
                        formatPercent(row.stockShare)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="消费占比" width="90" align="right">
                      <template #default="{ row }">{{
                        formatPercent(row.useShare)
                      }}</template>
                    </el-table-column>
                    <el-table-column label="需求指数" width="90" align="right">
                      <template #default="{ row }">
                        <el-tag
                          :type="demandTag(row.demandIndex)"
                          size="small"
                          >{{ row.demandIndex }}</el-tag
                        >
                      </template>
                    </el-table-column>
                  </DataTable>
                </ChartCard>
                <ChartCard
                  title="渠道 × 来源交叉"
                  description="哪个渠道偏好哪个图库"
                  :empty="!matrixPivot.rows.length"
                >
                  <DataTable :data="matrixPivot.rows">
                    <el-table-column
                      prop="channel"
                      label="渠道"
                      min-width="100"
                    />
                    <el-table-column
                      v-for="s in matrixPivot.sources"
                      :key="s"
                      :prop="s"
                      :label="s"
                      min-width="90"
                      align="right"
                    />
                    <el-table-column label="合计" width="90" align="right">
                      <template #default="{ row }"
                        ><b>{{ formatNumber(row.total) }}</b></template
                      >
                    </el-table-column>
                  </DataTable>
                </ChartCard>
              </div>
            </AnalyticsSection>

            <AnalyticsSection title="作者、选图与热门图片">
              <ChartCard
                title="作者集中度 TOP10"
                description="单一作者占比过高存在版权与断供风险"
                :empty="!img.authorStats?.length"
              >
                <DataTable :data="img.authorStats" max-height="320">
                  <el-table-column type="index" label="#" width="50" />
                  <el-table-column
                    prop="author"
                    label="作者"
                    min-width="180"
                    show-overflow-tooltip
                  />
                  <el-table-column label="消费次数" width="100" align="right">
                    <template #default="{ row }">{{
                      formatNumber(row.useCount)
                    }}</template>
                  </el-table-column>
                  <el-table-column
                    prop="imageCount"
                    label="图片数"
                    width="90"
                    align="right"
                  />
                  <el-table-column label="占比" width="160">
                    <template #default="{ row }">
                      <RateBar
                        :value="row.share"
                        :tone="row.share > 30 ? 'warning' : 'neutral'"
                      />
                    </template>
                  </el-table-column>
                </DataTable>
              </ChartCard>

              <LeadStrip v-if="img.selectionEfficiency">
                <Readout
                  label="选图总数"
                  :value="img.selectionEfficiency.totalSelected"
                  caption="内容包选中（全量）"
                />
                <Readout
                  label="已发布"
                  :value="img.selectionEfficiency.publishedImages"
                  tone="positive"
                />
                <Readout
                  label="随失败包沉没"
                  :value="img.selectionEfficiency.failedImages"
                  :tone="
                    img.selectionEfficiency.failedImages > 0
                      ? 'negative'
                      : 'neutral'
                  "
                />
                <Readout
                  label="待发布"
                  :value="img.selectionEfficiency.otherImages"
                  tone="warning"
                />
                <Readout
                  label="去重图片数"
                  :value="img.selectionEfficiency.distinctImages"
                />
                <Readout
                  label="选图利用率"
                  kind="percent"
                  :value="img.selectionEfficiency.utilizationRate"
                  :tone="
                    successRateTone(img.selectionEfficiency.utilizationRate)
                  "
                  hint="选中图片中最终随内容包成功发布的比例"
                />
              </LeadStrip>

              <ChartCard
                v-if="img.topImages?.length"
                title="消费次数 TOP10 图片"
                description="用于判断选题与配图偏好"
              >
                <DataTable :data="img.topImages">
                  <el-table-column
                    prop="dailyImageId"
                    label="图片 ID"
                    width="90"
                  />
                  <el-table-column
                    prop="imageDate"
                    label="图片日期"
                    width="110"
                  />
                  <el-table-column
                    prop="source"
                    label="来源"
                    width="120"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    prop="authorName"
                    label="作者"
                    width="130"
                    show-overflow-tooltip
                  />
                  <el-table-column label="消费次数" width="100" align="right">
                    <template #default="{ row }">
                      <el-tag type="primary" size="small">{{
                        row.useCount
                      }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="channels"
                    label="消费渠道"
                    width="130"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    prop="firstUsed"
                    label="首次消费"
                    min-width="160"
                  />
                  <el-table-column
                    prop="lastUsed"
                    label="最近消费"
                    min-width="160"
                  />
                </DataTable>
              </ChartCard>
            </AnalyticsSection>
          </template>
        </div>
      </el-tab-pane>

      <!-- 发布链路 -->
      <el-tab-pane label="发布链路" name="publishing" lazy>
        <div class="task-pane">
          <StatsMetaLine :meta="publish.meta.value" />
          <AnalyticsState
            :loading="publish.loading.value"
            :error="publish.error.value"
            :has-data="!!publish.data.value"
            @retry="publish.load"
          />
          <template v-if="publish.data.value">
            <LeadStrip>
              <Readout
                size="lead"
                label="内容包总数"
                :value="publish.data.value.totalPackages"
                :spark="
                  publish.data.value.packageDailyTrend?.map(
                    i => i.published + i.failed
                  )
                "
                :caption="scope"
              />
              <Readout
                size="lead"
                label="发布成功"
                :value="publish.data.value.publishedCount"
                tone="positive"
              />
              <Readout
                size="lead"
                label="发布失败"
                :value="publish.data.value.failedCount"
                :tone="
                  publish.data.value.failedCount > 0 ? 'negative' : 'neutral'
                "
              />
              <Readout
                size="lead"
                label="发布成功率"
                kind="percent"
                :value="publish.data.value.publishSuccessRate"
                :tone="successRateTone(publish.data.value.publishSuccessRate)"
              />
            </LeadStrip>
            <FindingsSection
              :items="publishInsights"
              rules="内容包发布成功率 < 90%；平台上传成功率 < 90%（样本 ≥ 10）；平台 AI 文案失败率 > 15%"
            />

            <div class="task-grid">
              <ChartCard
                title="发布结果"
                :scope="scope"
                :option="publishDonut"
                :height="280"
                :empty="!publish.data.value.totalPackages"
              />
              <ChartCard
                title="失败原因分类"
                :scope="scope"
                :empty="!publish.data.value.failReasons?.length"
              >
                <DataTable :data="publish.data.value.failReasons">
                  <el-table-column
                    prop="errorType"
                    label="错误类型"
                    min-width="140"
                    show-overflow-tooltip
                  />
                  <el-table-column label="次数" width="90" align="right">
                    <template #default="{ row }">{{
                      formatNumber(row.count)
                    }}</template>
                  </el-table-column>
                  <el-table-column label="平均耗时" width="110" align="right">
                    <template #default="{ row }">{{
                      formatDuration(row.avgDurationMs)
                    }}</template>
                  </el-table-column>
                </DataTable>
              </ChartCard>
            </div>

            <ChartCard
              title="内容包生成日趋势"
              description="按日堆叠：发布成功 vs 失败"
              :scope="scope"
              :option="packageTrendOption"
              :height="280"
              :empty="!publish.data.value.packageDailyTrend?.length"
            />

            <ChartCard
              v-if="publish.data.value.platformAiCost?.length"
              title="平台 AI 文案成本"
              description="按 publish_package_content.ai_call_record_id 关联 AI 调用，统计 Token 与耗时"
              :scope="scope"
            >
              <DataTable :data="publish.data.value.platformAiCost">
                <el-table-column
                  prop="platformCode"
                  label="平台"
                  min-width="120"
                />
                <el-table-column label="内容数" width="90" align="right">
                  <template #default="{ row }">{{
                    formatNumber(row.contentCount)
                  }}</template>
                </el-table-column>
                <el-table-column label="Token 总量" width="110" align="right">
                  <template #default="{ row }">{{
                    formatTokens(row.totalTokens)
                  }}</template>
                </el-table-column>
                <el-table-column label="平均 Token" width="110" align="right">
                  <template #default="{ row }">{{
                    formatNumber(row.avgTokens)
                  }}</template>
                </el-table-column>
                <el-table-column label="平均耗时" width="100" align="right">
                  <template #default="{ row }">{{
                    formatDuration(row.avgCostMs)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="failCount"
                  label="失败数"
                  width="90"
                  align="right"
                />
                <el-table-column label="失败率" width="160">
                  <template #default="{ row }">
                    <RateBar
                      :value="row.failRate"
                      :tone="failRateTone(row.failRate)"
                    />
                  </template>
                </el-table-column>
              </DataTable>
            </ChartCard>

            <ChartCard
              title="平台上传统计"
              :scope="scope"
              :empty="!publish.data.value.uploadStats?.length"
            >
              <DataTable :data="publish.data.value.uploadStats">
                <el-table-column
                  prop="platformCode"
                  label="平台"
                  min-width="120"
                />
                <el-table-column label="总数" width="80" align="right">
                  <template #default="{ row }">{{
                    formatNumber(row.total)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="success"
                  label="成功"
                  width="80"
                  align="right"
                />
                <el-table-column
                  prop="failed"
                  label="失败"
                  width="80"
                  align="right"
                />
                <el-table-column label="成功率" width="170">
                  <template #default="{ row }">
                    <RateBar
                      :value="row.successRate"
                      :tone="successRateTone(row.successRate)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="平均耗时" width="100" align="right">
                  <template #default="{ row }">{{
                    formatDuration(row.avgDurationMs)
                  }}</template>
                </el-table-column>
              </DataTable>
            </ChartCard>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.task-pane {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-lg);
  padding-top: var(--ra-space-sm);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--ra-space-md);

  &--wide {
    grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr);
  }

  &--three {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

.task-steps {
  padding: 8px 16px;
}

.text-positive {
  color: var(--el-color-success);
}

.text-negative {
  color: var(--el-color-danger);
}
</style>
