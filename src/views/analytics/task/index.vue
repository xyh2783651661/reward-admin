<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import PanelCard from "@/components/PanelCard/index.vue";
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
import { useChartMount } from "../useChartMount";

defineOptions({ name: "AnalyticsTask" });

const router = useRouter();
const { setChartRef, mountChart, resizeAll } = useChartMount();

/** 下钻：点击失败任务 → 任务日志（携带 taskName + status） */
function onFailTaskClick(row: { taskName?: string; status?: string }) {
  router.push({
    path: "/log/operation",
    query: { taskName: row?.taskName ?? "", status: row?.status ?? "FAILED" }
  });
}

const activeTab = ref("execution");
const loading = ref(true);
const taskData = ref<AnalyticsTaskOverview | null>(null);
const publishData = ref<AnalyticsPublishOverview | null>(null);
const contentData = ref<AnalyticsContentOverview | null>(null);
const imageUsageData = ref<AnalyticsImageConsumption | null>(null);
const range = ref(30);

interface ParsedStep {
  stepName?: string;
  success?: boolean;
  status?: string;
  costMs?: number;
  errorMessage?: string | null;
  message?: string | null;
}

/** 将后端返回的 detail JSON 解析成步骤数组，解析失败时降级为空数组 */
const partialRows = computed(() =>
  (taskData.value?.partialTasks ?? []).map(t => {
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

/** 渠道 × 来源 透视：行=渠道，列=来源 */
const matrixPivot = computed(() => {
  const cells = imageUsageData.value?.channelSourceMatrix ?? [];
  const sources = [...new Set(cells.map(c => c.source))];
  const channels = [...new Set(cells.map(c => c.channel))];
  const rows = channels.map(ch => {
    const row: Record<string, any> = { channel: ch, total: 0 };
    sources.forEach(s => (row[s] = 0));
    cells
      .filter(c => c.channel === ch)
      .forEach(c => {
        row[c.source] = c.count;
        row.total += c.count;
      });
    return row;
  });
  rows.sort((a, b) => b.total - a.total);
  return { sources, rows };
});

async function loadData() {
  loading.value = true;
  try {
    const [taskRes, publishRes, contentRes] = await Promise.all([
      getAnalyticsTaskExecution(range.value),
      getAnalyticsPublishOverview(range.value),
      getAnalyticsContentProduction(range.value)
    ]);
    taskData.value = taskRes.data?.data ?? null;
    publishData.value = publishRes.data?.data ?? null;
    contentData.value = contentRes.data?.data ?? null;
    // 图片消费默认看 90 天，与内容生产口径独立
    const imageRes = await getAnalyticsImageUsage(90);
    imageUsageData.value = imageRes.data?.data ?? null;
  } catch (e) {
    console.error("加载任务分析数据失败", e);
  }
  loading.value = false;
  await nextTick();
  // 等待容器渲染完成后再挂载，避免 0 尺寸初始化
  setTimeout(renderCharts, 60);
}

function renderCharts() {
  renderTaskTrend();
  renderPublishChart();
  renderPackageTrend();
  renderImageCharts();
  resizeAll();
}

function renderImageCharts() {
  const d = imageUsageData.value;
  if (!d) return;

  // 渠道分布
  mountChart("imgChannel", {
    color: CHART_COLORS,
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.name}: ${p.value} 次（${p.percent}%）`
    },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        data: (d.channelStats ?? []).map(c => ({
          name: c.channel,
          value: c.count
        })),
        label: { formatter: "{b}\n{d}%" }
      }
    ]
  });

  // 每日消费趋势（按渠道堆叠）
  const channels = d.channelNames ?? [];
  mountChart("imgDaily", {
    color: CHART_COLORS,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: channels, top: 0 },
    grid: { left: 16, right: 16, bottom: 8, top: 40, containLabel: true },
    xAxis: { type: "category", data: (d.dailyTrend ?? []).map(t => t.date) },
    yAxis: { type: "value", name: "消费次数" },
    series: channels.map((ch, idx) => ({
      name: ch,
      type: "bar",
      stack: "usage",
      barMaxWidth: 26,
      data: (d.dailyTrend ?? []).map(t => t.counts?.[idx] ?? 0)
    }))
  });

  // 复用次数分布
  const reuse = d.reuseDistribution ?? [];
  mountChart("imgReuse", {
    color: ["#94a3b8", "#2563eb", "#f59e0b", "#10b981"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        const item = reuse[p.dataIndex];
        return `${item.label}<br/>${item.imageCount} 张（${item.percentage}%）`;
      }
    },
    grid: { left: 16, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: { type: "category", data: reuse.map(r => r.label) },
    yAxis: { type: "value", name: "图片数" },
    series: [
      {
        type: "bar",
        barMaxWidth: 56,
        data: reuse.map((r, i) => ({
          value: r.imageCount,
          itemStyle: {
            color: ["#94a3b8", "#2563eb", "#f59e0b", "#10b981"][i],
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => `${reuse[p.dataIndex].percentage}%`
        }
      }
    ]
  });

  // 来源：库存 vs 消费次数（双柱）
  const src = d.sourceStats ?? [];
  mountChart("imgSource", {
    color: ["#cbd5e1", "#2563eb"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["库存图片", "消费次数"], top: 0 },
    grid: { left: 16, right: 16, bottom: 8, top: 40, containLabel: true },
    xAxis: { type: "category", data: src.map(s => s.source) },
    yAxis: { type: "value" },
    series: [
      {
        name: "库存图片",
        type: "bar",
        barMaxWidth: 34,
        data: src.map(s => s.stock)
      },
      {
        name: "消费次数",
        type: "bar",
        barMaxWidth: 34,
        data: src.map(s => s.useCount)
      }
    ]
  });

  // 视觉描述状态 vs 覆盖率（关键洞察）
  const vision = d.visionImpact ?? [];
  mountChart("imgVision", {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        const item = vision[p.dataIndex];
        return `${item.statusLabel}<br/>库存 ${item.stock} 张<br/>被消费 ${item.usedImages} 张<br/>覆盖率 ${item.coverageRate}%`;
      }
    },
    grid: { left: 16, right: 48, bottom: 8, top: 16, containLabel: true },
    xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
    yAxis: { type: "category", data: vision.map(v => v.statusLabel) },
    series: [
      {
        type: "bar",
        barMaxWidth: 26,
        data: vision.map(v => ({
          value: v.coverageRate,
          itemStyle: {
            color:
              v.coverageRate >= 80
                ? "#10b981"
                : v.coverageRate > 0
                  ? "#f59e0b"
                  : "#ef4444",
            borderRadius: [0, 4, 4, 0]
          }
        })),
        label: { show: true, position: "right", formatter: "{c}%" }
      }
    ]
  });

  // 消费新鲜度
  const fresh = d.freshnessDistribution ?? [];
  mountChart("imgFreshness", {
    color: ["#2563eb"],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        const item = fresh[p.dataIndex];
        return `${item.label}<br/>${item.count} 次（${item.percentage}%）`;
      }
    },
    grid: { left: 16, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: fresh.map(f => f.label),
      axisLabel: { rotate: 20, fontSize: 11 }
    },
    yAxis: { type: "value", name: "消费次数" },
    series: [
      {
        type: "bar",
        barMaxWidth: 40,
        data: fresh.map((f, i) => ({
          value: f.count,
          itemStyle: {
            color: f.label.startsWith("异常")
              ? "#ef4444"
              : (["#2563eb", "#10b981", "#f59e0b", "#f97316", "#94a3b8"][i] ??
                "#94a3b8"),
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => `${fresh[p.dataIndex].percentage}%`,
          fontSize: 11
        }
      }
    ]
  });

  // 星期分布
  const wd = d.weekdayDistribution ?? [];
  mountChart("imgWeekday", {
    color: ["#6366f1"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 16, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: { type: "category", data: wd.map(w => w.label) },
    yAxis: { type: "value", name: "消费次数" },
    series: [
      {
        type: "bar",
        barMaxWidth: 40,
        data: wd.map(w => w.count),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", fontSize: 11 }
      }
    ]
  });
}

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#14b8a6"
];

function renderTaskTrend() {
  if (!taskData.value) return;
  const t = taskData.value.monthlyTrend ?? [];
  mountChart("taskTrend", {
    color: CHART_COLORS,
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["总执行", "成功"], top: 0 },
    grid: { left: 16, right: 16, bottom: 8, top: 40, containLabel: true },
    xAxis: { type: "category", data: t.map(i => i.month) },
    yAxis: { type: "value" },
    series: [
      {
        name: "总执行",
        type: "bar",
        barMaxWidth: 22,
        data: t.map(i => i.total)
      },
      {
        name: "成功",
        type: "line",
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 6,
        data: t.map(i => i.success)
      }
    ]
  });
}

function renderPublishChart() {
  if (!publishData.value) return;
  const s = publishData.value;
  mountChart("publish", {
    color: ["#10b981", "#ef4444"],
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}\n{c}" },
        data: [
          { name: "发布成功", value: s.publishedCount },
          { name: "发布失败", value: s.failedCount }
        ]
      }
    ]
  });
}

function renderPackageTrend() {
  const trend = publishData.value?.packageDailyTrend ?? [];
  if (!trend.length) return;
  mountChart("packageTrend", {
    color: ["#10b981", "#ef4444"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["发布成功", "发布失败"], top: 0 },
    grid: { left: 16, right: 16, bottom: 8, top: 40, containLabel: true },
    xAxis: { type: "category", data: trend.map(t => t.date) },
    yAxis: { type: "value", name: "内容包数" },
    series: [
      {
        name: "发布成功",
        type: "bar",
        stack: "pkg",
        barMaxWidth: 26,
        data: trend.map(t => t.published)
      },
      {
        name: "发布失败",
        type: "bar",
        stack: "pkg",
        barMaxWidth: 26,
        data: trend.map(t => t.failed)
      }
    ]
  });
}

// Tab 切换后容器才可见，需要重新挂载并重算尺寸
watch(activeTab, async () => {
  await nextTick();
  setTimeout(renderCharts, 60);
});

onMounted(() => loadData());
</script>

<template>
  <div style="padding: 20px">
    <el-radio-group
      v-model="range"
      style="margin-bottom: 16px"
      @change="loadData"
    >
      <el-radio-button :value="7">近7天</el-radio-button>
      <el-radio-button :value="30">近30天</el-radio-button>
      <el-radio-button :value="90">近90天</el-radio-button>
    </el-radio-group>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="任务执行" name="execution">
        <template v-if="taskData">
          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="总执行"
                  :value="taskData.totalTasks" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="成功率"
                  :value="taskData.successRate"
                  suffix="%"
                  :value-style="{ color: '#67c23a' }" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="部分成功"
                  :value="taskData.partialCount"
                  :value-style="{ color: '#e6a23c' }" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="平均耗时"
                  :value="taskData.avgCostMs"
                  suffix="ms" /></el-card
            ></el-col>
          </el-row>
          <PanelCard title="月度趋势">
            <div
              :ref="el => setChartRef('taskTrend', el)"
              style=" width: 100%;height: 300px"
            />
          </PanelCard>
          <PanelCard title="任务执行明细" style="margin-top: 16px">
            <el-table :data="taskData.taskStats" stripe size="small">
              <el-table-column
                prop="taskName"
                label="任务名称"
                min-width="180"
              />
              <el-table-column prop="total" label="总数" width="80" />
              <el-table-column prop="success" label="成功" width="80" />
              <el-table-column prop="fail" label="失败" width="80" />
              <el-table-column prop="partial" label="部分成功" width="90" />
              <el-table-column prop="successRate" label="成功率" width="100"
                ><template #default="{ row }"
                  >{{ row.successRate }}%</template
                ></el-table-column
              >
              <el-table-column prop="avgCostMs" label="平均耗时" width="100"
                ><template #default="{ row }"
                  >{{ row.avgCostMs }}ms</template
                ></el-table-column
              >
            </el-table>
          </PanelCard>
          <PanelCard
            v-if="partialRows.length"
            title="部分成功任务（步骤明细）"
            description="展开可查看每个步骤的执行结果，红色为失败步骤"
            style="margin-top: 16px"
          >
            <el-table
              :data="partialRows"
              stripe
              size="small"
              row-key="startTime"
            >
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div style="padding: 8px 16px">
                    <el-table :data="row.steps" size="small" border>
                      <el-table-column
                        prop="stepName"
                        label="步骤"
                        min-width="220"
                        show-overflow-tooltip
                      />
                      <el-table-column prop="status" label="状态" width="110">
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
                      <el-table-column
                        prop="costMs"
                        label="耗时(ms)"
                        width="110"
                      />
                      <el-table-column
                        label="错误信息"
                        min-width="260"
                        show-overflow-tooltip
                      >
                        <template #default="{ row: step }">
                          {{ step.errorMessage ?? step.message ?? "-" }}
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
              <el-table-column prop="timeCost" label="耗时(ms)" width="110" />
              <el-table-column label="步骤（失败/总数）" width="150">
                <template #default="{ row }">
                  <span
                    :style="{
                      color: row.failedStepCount > 0 ? '#f56c6c' : '#67c23a'
                    }"
                  >
                    {{ row.failedStepCount }} / {{ row.totalStepCount }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </PanelCard>

          <PanelCard
            v-if="taskData.failTasks?.length"
            title="失败任务"
            style="margin-top: 16px"
          >
            <el-table
              :data="taskData.failTasks"
              stripe
              size="small"
              style="cursor: pointer"
              @row-click="onFailTaskClick"
            >
              <el-table-column prop="taskName" label="任务" min-width="180" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column prop="timeCost" label="耗时(ms)" width="100" />
              <el-table-column prop="startTime" label="开始时间" />
              <el-table-column
                prop="exception"
                label="异常"
                min-width="200"
                show-overflow-tooltip
              />
            </el-table>
          </PanelCard>
        </template>
        <el-empty v-else-if="!loading" description="暂无数据" />
      </el-tab-pane>

      <el-tab-pane label="内容生产" name="production">
        <template v-if="contentData">
          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="抓取总次数"
                  :value="contentData.fetchTotal" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="抓取成功率"
                  :value="contentData.fetchSuccessRate"
                  suffix="%"
                  :value-style="{
                    color:
                      contentData.fetchSuccessRate >= 80 ? '#67c23a' : '#e6a23c'
                  }" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="图片归档数"
                  :value="contentData.imageTotal" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="视觉覆盖率"
                  :value="contentData.visionCoverage"
                  suffix="%"
                  :value-style="{ color: '#409eff' }" /></el-card
            ></el-col>
          </el-row>
          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="8"
              ><el-card shadow="hover"
                ><el-statistic
                  title="抓取成功"
                  :value="contentData.fetchSuccess"
                  :value-style="{ color: '#67c23a' }" /></el-card
            ></el-col>
            <el-col :span="8"
              ><el-card shadow="hover"
                ><el-statistic
                  title="抓取空结果"
                  :value="contentData.fetchEmpty"
                  :value-style="{ color: '#e6a23c' }" /></el-card
            ></el-col>
            <el-col :span="8"
              ><el-card shadow="hover"
                ><el-statistic
                  title="抓取失败"
                  :value="contentData.fetchFailed"
                  :value-style="{ color: '#f56c6c' }" /></el-card
            ></el-col>
          </el-row>
          <PanelCard title="各信源抓取可用性" description="按抓取次数降序">
            <el-table :data="contentData.sourceStats" stripe size="small">
              <el-table-column prop="sourceKey" label="信源" min-width="180" />
              <el-table-column prop="total" label="总数" width="80" />
              <el-table-column prop="success" label="成功" width="80" />
              <el-table-column prop="empty" label="空结果" width="90" />
              <el-table-column prop="failed" label="失败" width="80" />
              <el-table-column prop="successRate" label="成功率" width="100"
                ><template #default="{ row }"
                  >{{ row.successRate }}%</template
                ></el-table-column
              >
              <el-table-column
                prop="avgCostMs"
                label="平均耗时(ms)"
                width="130"
              />
            </el-table>
          </PanelCard>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-top: 16px"
            title="数据覆盖说明"
            description="抓取条目（daily_content_fetch_item）与图片（daily_image）之间没有可靠的直接关联 ID，因此本页分别统计抓取可用性与图片视觉分析覆盖率，不做强行关联。"
          />
        </template>
        <el-empty v-else-if="!loading" description="暂无内容生产数据" />
      </el-tab-pane>

      <el-tab-pane label="图片消费" name="imageUsage">
        <template v-if="imageUsageData">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
            :title="`口径说明：覆盖率 = 有效被消费图片 ${imageUsageData.distinctImagesUsed} / 活跃图片 ${imageUsageData.activeImageTotal}；复用率基于全部被引用图片 ${imageUsageData.distinctImagesReferenced} 计算，平均每图 ${imageUsageData.avgUsesPerImage} 次。统计窗口：近 90 天。`"
          />

          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="消费次数"
                  :value="imageUsageData.totalUsageRecords" /></el-card
            ></el-col>
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="覆盖率"
                  :value="imageUsageData.coverageRate"
                  suffix="%"
                  :value-style="{
                    color:
                      imageUsageData.coverageRate >= 80 ? '#67c23a' : '#e6a23c'
                  }" /></el-card
            ></el-col>
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="复用率"
                  :value="imageUsageData.reuseRate"
                  suffix="%"
                  :value-style="{ color: '#409eff' }" /></el-card
            ></el-col>
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="活跃图片"
                  :value="imageUsageData.activeImageTotal" /></el-card
            ></el-col>
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="沉睡图片"
                  :value="imageUsageData.unusedImageCount"
                  :value-style="{
                    color:
                      imageUsageData.unusedImageCount > 0
                        ? '#e6a23c'
                        : '#67c23a'
                  }" /></el-card
            ></el-col>
            <el-col :span="4"
              ><el-card shadow="hover"
                ><el-statistic
                  title="单图最高复用"
                  :value="imageUsageData.maxUses"
                  suffix="次" /></el-card
            ></el-col>
          </el-row>

          <el-alert
            v-if="
              imageUsageData.dataQuality &&
              (imageUsageData.dataQuality.orphanRefs > 0 ||
                imageUsageData.dataQuality.deletedImageRefs > 0)
            "
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
            title="数据质量提示"
            :description="
              imageUsageData.dataQuality.message +
              `（有效引用 ${imageUsageData.dataQuality.validRefs} 张）`
            "
          />

          <el-row :gutter="16">
            <el-col :span="8">
              <PanelCard title="消费渠道分布" description="谁在消费这些图片">
                <div
                  :ref="el => setChartRef('imgChannel', el)"
                  style=" width: 100%;height: 320px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="16">
              <PanelCard
                title="每日消费趋势"
                description="按渠道堆叠，反映推送节奏"
              >
                <div
                  :ref="el => setChartRef('imgDaily', el)"
                  style=" width: 100%;height: 320px"
                />
              </PanelCard>
            </el-col>
          </el-row>

          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="8">
              <PanelCard title="复用次数分布" description="一张图被用了几次">
                <div
                  :ref="el => setChartRef('imgReuse', el)"
                  style=" width: 100%;height: 300px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="8">
              <PanelCard title="渠道消费明细">
                <el-table
                  :data="imageUsageData.channelStats"
                  stripe
                  size="small"
                >
                  <el-table-column prop="channel" label="渠道" width="90" />
                  <el-table-column prop="count" label="次数" width="70" />
                  <el-table-column
                    prop="distinctImages"
                    label="图片数"
                    width="80"
                  />
                  <el-table-column prop="percentage" label="占比" width="75">
                    <template #default="{ row }"
                      >{{ row.percentage }}%</template
                    >
                  </el-table-column>
                  <el-table-column prop="avgDaily" label="日均" width="70" />
                </el-table>
              </PanelCard>
            </el-col>
            <el-col :span="8">
              <PanelCard title="业务类型分布">
                <el-table
                  :data="imageUsageData.bizTypeStats"
                  stripe
                  size="small"
                >
                  <el-table-column
                    prop="bizType"
                    label="业务类型"
                    min-width="140"
                  />
                  <el-table-column prop="count" label="次数" width="80" />
                  <el-table-column prop="percentage" label="占比" width="90">
                    <template #default="{ row }"
                      >{{ row.percentage }}%</template
                    >
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>

          <!-- 关键洞察：视觉描述与消费率 -->
          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="10">
              <PanelCard
                title="视觉描述 × 被消费率"
                description="AI 描述是否生成，直接影响图片是否被选用"
              >
                <div
                  :ref="el => setChartRef('imgVision', el)"
                  style=" width: 100%;height: 260px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="14">
              <PanelCard title="视觉描述状态明细">
                <el-table
                  :data="imageUsageData.visionImpact"
                  stripe
                  size="small"
                >
                  <el-table-column
                    prop="statusLabel"
                    label="状态"
                    width="130"
                  />
                  <el-table-column prop="stock" label="库存" width="90" />
                  <el-table-column
                    prop="usedImages"
                    label="被消费"
                    width="90"
                  />
                  <el-table-column
                    prop="coverageRate"
                    label="覆盖率"
                    width="100"
                  >
                    <template #default="{ row }">
                      <span
                        :style="{
                          color:
                            row.coverageRate >= 80
                              ? '#67c23a'
                              : row.coverageRate > 0
                                ? '#e6a23c'
                                : '#f56c6c',
                          fontWeight: 600
                        }"
                      >
                        {{ row.coverageRate }}%
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="解读" min-width="220">
                    <template #default="{ row }">
                      <span v-if="row.statusCode === '0'"
                        >未生成描述，几乎不会被选中</span
                      >
                      <span v-else-if="row.statusCode === '2'"
                        >描述生成失败，可用性大幅下降</span
                      >
                      <span v-else>正常可用</span>
                    </template>
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>

          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="12">
              <PanelCard
                title="来源效率"
                description="库存 vs 消费次数，覆盖率低的来源需评估"
              >
                <div
                  :ref="el => setChartRef('imgSource', el)"
                  style=" width: 100%;height: 280px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="12">
              <PanelCard title="来源明细">
                <el-table
                  :data="imageUsageData.sourceStats"
                  stripe
                  size="small"
                >
                  <el-table-column prop="source" label="来源" width="100" />
                  <el-table-column prop="stock" label="库存" width="75" />
                  <el-table-column prop="usedImages" label="被用" width="75" />
                  <el-table-column
                    prop="coverageRate"
                    label="覆盖率"
                    width="90"
                  >
                    <template #default="{ row }">
                      <span
                        :style="{
                          color:
                            row.coverageRate >= 90
                              ? '#67c23a'
                              : row.coverageRate >= 70
                                ? '#e6a23c'
                                : '#f56c6c'
                        }"
                      >
                        {{ row.coverageRate }}%
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="avgUses" label="平均复用" width="90" />
                  <el-table-column
                    prop="avgDownloadCostMs"
                    label="下载耗时"
                    width="100"
                  >
                    <template #default="{ row }"
                      >{{ row.avgDownloadCostMs || "-" }}ms</template
                    >
                  </el-table-column>
                  <el-table-column prop="useShare" label="消费份额" width="90">
                    <template #default="{ row }">{{ row.useShare }}%</template>
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>

          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="10">
              <PanelCard
                title="消费新鲜度"
                description="图片日期 → 实际使用日期的滞后"
              >
                <div
                  :ref="el => setChartRef('imgFreshness', el)"
                  style=" width: 100%;height: 280px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="7">
              <PanelCard title="星期分布" description="消费发生在星期几">
                <div
                  :ref="el => setChartRef('imgWeekday', el)"
                  style=" width: 100%;height: 280px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="7">
              <PanelCard
                title="构图供需"
                description="需求指数 = 消费占比 / 库存占比"
              >
                <el-table
                  :data="imageUsageData.orientationStats"
                  stripe
                  size="small"
                >
                  <el-table-column prop="orientation" label="构图" width="85" />
                  <el-table-column prop="stock" label="库存" width="65" />
                  <el-table-column
                    prop="stockShare"
                    label="库存占比"
                    width="90"
                  >
                    <template #default="{ row }"
                      >{{ row.stockShare }}%</template
                    >
                  </el-table-column>
                  <el-table-column prop="useShare" label="消费占比" width="90">
                    <template #default="{ row }">{{ row.useShare }}%</template>
                  </el-table-column>
                  <el-table-column
                    prop="demandIndex"
                    label="需求指数"
                    width="90"
                  >
                    <template #default="{ row }">
                      <el-tag
                        :type="
                          row.demandIndex > 1.05
                            ? 'danger'
                            : row.demandIndex < 0.95
                              ? 'info'
                              : 'success'
                        "
                        size="small"
                      >
                        {{ row.demandIndex }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>

          <el-row :gutter="16" style="margin-top: 16px">
            <el-col :span="10">
              <PanelCard
                title="作者集中度 TOP10"
                description="单一作者占比过高存在版权与断供风险"
              >
                <el-table
                  :data="imageUsageData.authorStats"
                  stripe
                  size="small"
                  max-height="300"
                >
                  <el-table-column type="index" label="#" width="48" />
                  <el-table-column
                    prop="author"
                    label="作者"
                    min-width="150"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    prop="useCount"
                    label="消费次数"
                    width="95"
                  />
                  <el-table-column
                    prop="imageCount"
                    label="图片数"
                    width="85"
                  />
                  <el-table-column prop="share" label="占比" width="80">
                    <template #default="{ row }">{{ row.share }}%</template>
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
            <el-col :span="14">
              <PanelCard
                title="渠道 × 来源 交叉"
                description="哪个渠道偏好哪个图库"
              >
                <el-table :data="matrixPivot.rows" stripe size="small">
                  <el-table-column prop="channel" label="渠道" width="110" />
                  <el-table-column
                    v-for="s in matrixPivot.sources"
                    :key="s"
                    :prop="s"
                    :label="s"
                    width="110"
                  />
                  <el-table-column prop="total" label="合计" width="90">
                    <template #default="{ row }"
                      ><b>{{ row.total }}</b></template
                    >
                  </el-table-column>
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>

          <!-- 选图利用率 -->
          <PanelCard
            v-if="imageUsageData.selectionEfficiency"
            title="选图利用率"
            description="内容包选中的图片，最终有多少随包成功发布（全量）"
            style="margin-top: 16px"
          >
            <el-row :gutter="16">
              <el-col :span="4"
                ><el-statistic
                  title="选图总数"
                  :value="imageUsageData.selectionEfficiency.totalSelected"
              /></el-col>
              <el-col :span="4"
                ><el-statistic
                  title="已发布"
                  :value="imageUsageData.selectionEfficiency.publishedImages"
                  :value-style="{ color: '#67c23a' }"
              /></el-col>
              <el-col :span="4"
                ><el-statistic
                  title="随失败包沉没"
                  :value="imageUsageData.selectionEfficiency.failedImages"
                  :value-style="{ color: '#f56c6c' }"
              /></el-col>
              <el-col :span="4"
                ><el-statistic
                  title="待发布"
                  :value="imageUsageData.selectionEfficiency.otherImages"
                  :value-style="{ color: '#e6a23c' }"
              /></el-col>
              <el-col :span="4"
                ><el-statistic
                  title="去重图片数"
                  :value="imageUsageData.selectionEfficiency.distinctImages"
              /></el-col>
              <el-col :span="4">
                <el-statistic
                  title="利用率"
                  :value="imageUsageData.selectionEfficiency.utilizationRate"
                  suffix="%"
                  :value-style="{
                    color:
                      imageUsageData.selectionEfficiency.utilizationRate >= 70
                        ? '#67c23a'
                        : '#e6a23c'
                  }"
                />
              </el-col>
            </el-row>
          </PanelCard>

          <PanelCard
            v-if="imageUsageData.topImages?.length"
            title="消费次数 TOP10 图片"
            description="用于判断选题与配图偏好"
            style="margin-top: 16px"
          >
            <el-table :data="imageUsageData.topImages" stripe size="small">
              <el-table-column prop="dailyImageId" label="图片ID" width="90" />
              <el-table-column prop="imageDate" label="图片日期" width="110" />
              <el-table-column
                prop="source"
                label="来源"
                width="130"
                show-overflow-tooltip
              />
              <el-table-column
                prop="authorName"
                label="作者"
                width="130"
                show-overflow-tooltip
              />
              <el-table-column prop="useCount" label="消费次数" width="95">
                <template #default="{ row }">
                  <el-tag type="primary" size="small">{{
                    row.useCount
                  }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="channels" label="消费渠道" width="130" />
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
            </el-table>
          </PanelCard>
        </template>
        <el-empty v-else-if="!loading" description="暂无图片消费数据" />
      </el-tab-pane>

      <el-tab-pane label="发布链路" name="publishing">
        <template v-if="publishData">
          <el-row :gutter="16" style="margin-bottom: 16px">
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="内容包总数"
                  :value="publishData.totalPackages" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="发布成功"
                  :value="publishData.publishedCount"
                  :value-style="{ color: '#67c23a' }" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="发布失败"
                  :value="publishData.failedCount"
                  :value-style="{ color: '#f56c6c' }" /></el-card
            ></el-col>
            <el-col :span="6"
              ><el-card shadow="hover"
                ><el-statistic
                  title="成功率"
                  :value="publishData.publishSuccessRate"
                  suffix="%" /></el-card
            ></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <PanelCard title="发布成功率">
                <div
                  :ref="el => setChartRef('publish', el)"
                  style=" width: 100%;height: 300px"
                />
              </PanelCard>
            </el-col>
            <el-col :span="12">
              <PanelCard title="失败原因分类">
                <el-table :data="publishData.failReasons" stripe size="small">
                  <el-table-column
                    prop="errorType"
                    label="错误类型"
                    width="120"
                  />
                  <el-table-column prop="count" label="次数" width="80" />
                  <el-table-column prop="avgDurationMs" label="平均耗时(ms)" />
                </el-table>
              </PanelCard>
            </el-col>
          </el-row>
          <PanelCard
            title="内容包生成日趋势"
            description="按日堆叠：发布成功 vs 失败"
            style="margin-top: 16px"
          >
            <div
              :ref="el => setChartRef('packageTrend', el)"
              style=" width: 100%;height: 280px"
            />
          </PanelCard>

          <PanelCard
            v-if="publishData.platformAiCost?.length"
            title="平台 AI 文案成本"
            description="按 publish_package_content.ai_call_record_id 关联 AI 调用，统计 Token 与耗时"
            style="margin-top: 16px"
          >
            <el-table :data="publishData.platformAiCost" stripe size="small">
              <el-table-column prop="platformCode" label="平台" width="130" />
              <el-table-column prop="contentCount" label="内容数" width="90" />
              <el-table-column
                prop="totalTokens"
                label="Token 总量"
                width="130"
              />
              <el-table-column
                prop="avgTokens"
                label="平均 Token"
                width="120"
              />
              <el-table-column
                prop="avgCostMs"
                label="平均耗时(ms)"
                width="130"
              />
              <el-table-column prop="failCount" label="失败数" width="90" />
              <el-table-column prop="failRate" label="失败率" width="100">
                <template #default="{ row }">{{ row.failRate }}%</template>
              </el-table-column>
            </el-table>
          </PanelCard>

          <PanelCard title="平台上传统计" style="margin-top: 16px">
            <el-table :data="publishData.uploadStats" stripe size="small">
              <el-table-column prop="platformCode" label="平台" width="120" />
              <el-table-column prop="total" label="总数" width="80" />
              <el-table-column prop="success" label="成功" width="80" />
              <el-table-column prop="failed" label="失败" width="80" />
              <el-table-column prop="successRate" label="成功率" width="100"
                ><template #default="{ row }"
                  >{{ row.successRate }}%</template
                ></el-table-column
              >
              <el-table-column prop="avgDurationMs" label="平均耗时(ms)" />
            </el-table>
          </PanelCard>
        </template>
        <el-empty v-else-if="!loading" description="暂无发布数据" />
      </el-tab-pane>
    </el-tabs>

    <el-skeleton v-if="loading" :rows="6" animated />
  </div>
</template>
