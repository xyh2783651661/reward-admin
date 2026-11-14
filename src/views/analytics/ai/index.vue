<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAnalyticsAiOverview,
  type AnalyticsAiOverview
} from "@/api/analytics";
import AnalyticsPage from "../components/AnalyticsPage.vue";
import AnalyticsPageHeader from "../components/AnalyticsPageHeader.vue";
import AnalyticsState from "../components/AnalyticsState.vue";
import AnalyticsSection from "../components/AnalyticsSection.vue";
import StatsMetaLine from "../components/StatsMetaLine.vue";
import MetricCard from "../components/MetricCard.vue";
import ChartCard from "../components/ChartCard.vue";
import DataTable from "../components/DataTable.vue";
import RateBar from "../components/RateBar.vue";
import InsightPanel, { type Insight } from "../components/InsightPanel.vue";
import { useAnalyticsQuery } from "../composables/useAnalyticsQuery";
import {
  SEMANTIC,
  cartesianOption,
  rankingOption,
  toneColor
} from "../utils/chartTheme";
import {
  durationParts,
  failRateTone,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTokens,
  successRateTone,
  tokenParts
} from "../utils/format";

defineOptions({ name: "AnalyticsAi" });

const router = useRouter();
const range = ref(30);
const scope = computed(() => `近 ${range.value} 天`);

const { data, meta, loading, error, load } =
  useAnalyticsQuery<AnalyticsAiOverview>(days => getAnalyticsAiOverview(days), {
    range,
    errorLabel: "加载 AI 分析数据失败"
  });

function goCallRecords(query: Record<string, string>) {
  router.push({ path: "/monitor/ai-call-records", query });
}

const insights = computed<Insight[]>(() => {
  const d = data.value;
  if (!d) return [];
  const list: Insight[] = [];

  for (const m of d.modelStats ?? []) {
    if (m.total < 20 || m.failRate <= 15) continue;
    list.push({
      level: m.failRate > 30 ? "critical" : "warning",
      title: `模型 ${m.model} 失败率偏高`,
      evidence: `${scope.value}调用 ${formatNumber(m.total)} 次，失败 ${formatNumber(m.fail)} 次，失败率 ${formatPercent(m.failRate)}（阈值 15% / 30%，样本 ≥ 20）`,
      actionLabel: "查看调用记录",
      onAction: () => goCallRecords({ model: m.model })
    });
  }

  const mismatches = (d.providerHealthCompare ?? []).filter(p => p.mismatch);
  for (const p of mismatches) {
    list.push({
      level: "warning",
      title: `供应商 ${p.provider} 健康状态与实际不符`,
      evidence: `健康状态 ${p.healthStatus}，但实际失败率 ${formatPercent(p.actualFailRate)}（失败 ${formatNumber(p.actualFail)} / 成功 ${formatNumber(p.actualSuccess)}，阈值 20%）`
    });
  }

  if (d.fallbackRate > 20) {
    list.push({
      level: "info",
      title: "Fallback 触发较频繁",
      evidence: `触发率 ${formatPercent(d.fallbackRate)}（阈值 20%），主模型稳定性可能不足，会放大耗时与成本`
    });
  }

  const slow = d.slowCalls?.length ?? 0;
  if (slow > 0) {
    list.push({
      level: "info",
      title: `存在 ${slow} 条耗时 > 30 秒的慢调用`,
      evidence: "详见页面底部「慢调用 TOP10」，可按模型和业务类型定位"
    });
  }
  return list;
});

const modelOption = computed(() =>
  rankingOption({
    items: (data.value?.modelStats ?? []).map(s => ({
      name: s.model,
      value: s.failRate,
      color: toneColor(failRateTone(s.failRate)),
      note: `调用 ${formatNumber(s.total)} 次（成功 ${formatNumber(s.success)} / 失败 ${formatNumber(s.fail)}）· 平均耗时 ${formatDuration(s.avgCostMs)} · Token ${formatTokens(s.totalTokens)} · Fallback ${formatNumber(s.fallbackUsed)} 次。点击查看调用记录`
    })),
    valueName: "失败率",
    format: v => formatPercent(v),
    max: 100
  })
);

const bizTotal = computed(() =>
  (data.value?.bizTypeStats ?? []).reduce((s, i) => s + i.count, 0)
);

const bizOption = computed(() => {
  const list = [...(data.value?.bizTypeStats ?? [])]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return rankingOption({
    items: list.map(s => ({
      name: s.bizType,
      value: s.count,
      label: `${formatNumber(s.count)} · ${formatPercent(bizTotal.value ? (s.count / bizTotal.value) * 100 : 0)}`,
      note: "点击查看该业务类型的调用记录"
    })),
    valueName: "调用次数",
    format: v => formatNumber(v)
  });
});

const trend = computed(() => data.value?.monthlyTrend ?? []);

const callTrendOption = computed(() =>
  cartesianOption({
    categories: trend.value.map(t => t.month),
    series: [
      {
        name: "成功",
        stack: "calls",
        data: trend.value.map(t => t.total - t.fail),
        color: SEMANTIC.primary
      },
      {
        name: "失败",
        stack: "calls",
        data: trend.value.map(t => t.fail),
        color: SEMANTIC.negative
      },
      {
        name: "失败率",
        type: "line",
        rightAxis: true,
        data: trend.value.map(t => t.failRate),
        color: SEMANTIC.warning
      }
    ],
    leftAxis: { name: "次" },
    rightAxis: { name: "失败率", max: 100, formatter: v => `${v}%` },
    tooltipFormatters: {
      成功: v => `${formatNumber(v)} 次`,
      失败: v => `${formatNumber(v)} 次`,
      失败率: v => formatPercent(v)
    }
  })
);

const tokenTrendOption = computed(() =>
  cartesianOption({
    categories: trend.value.map(t => t.month),
    series: [
      {
        name: "Token 消耗",
        data: trend.value.map(t => t.totalTokens ?? 0),
        color: SEMANTIC.primary
      }
    ],
    leftAxis: { name: "Token", formatter: v => formatTokens(v) },
    tooltipFormatters: { "Token 消耗": v => formatTokens(v) }
  })
);

const fallbackTrendOption = computed(() =>
  cartesianOption({
    categories: trend.value.map(t => t.month),
    series: [
      {
        name: "Fallback 次数",
        data: trend.value.map(t => t.fallbackCount ?? 0),
        color: SEMANTIC.warning
      },
      {
        name: "触发率",
        type: "line",
        rightAxis: true,
        data: trend.value.map(t => t.fallbackRate ?? 0),
        color: SEMANTIC.primary
      }
    ],
    leftAxis: { name: "次" },
    rightAxis: { name: "触发率", max: 100, formatter: v => `${v}%` },
    tooltipFormatters: {
      "Fallback 次数": v => `${formatNumber(v)} 次`,
      触发率: v => formatPercent(v)
    }
  })
);

const avgCost = computed(() => durationParts(data.value?.avgCostMs));
const tokens = computed(() => tokenParts(data.value?.totalTokens));
</script>

<template>
  <AnalyticsPage>
    <AnalyticsPageHeader
      v-model:range="range"
      title="AI 调用分析"
      description="模型稳定性、成本与 Fallback 回退情况"
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
        rules="模型失败率 > 15%（样本 ≥ 20）；供应商健康状态与实际不符；Fallback 触发率 > 20%；存在耗时 > 30s 的调用"
        :loading="loading"
      />

      <div class="ai-metrics">
        <MetricCard
          label="总调用"
          :value="data.totalCalls"
          size="hero"
          :caption="scope"
        />
        <MetricCard
          label="成功率"
          :value="data.successRate"
          kind="percent"
          size="hero"
          :tone="successRateTone(data.successRate)"
          :caption="`失败率 ${formatPercent(data.failRate)}`"
        />
        <MetricCard
          label="平均耗时"
          :value="data.avgCostMs"
          kind="duration"
          size="hero"
          hint="所有已完成调用的平均耗时"
        />
        <MetricCard
          label="Token 总量"
          :value="data.totalTokens"
          kind="tokens"
          size="hero"
          :caption="`约 ${tokens.main}${tokens.unit} Token`"
        />
        <MetricCard
          label="Fallback 触发率"
          :value="data.fallbackRate"
          kind="percent"
          size="hero"
          :tone="data.fallbackRate > 20 ? 'warning' : 'neutral'"
          hint="发生过供应商 / 模型回退的调用占总调用的比例"
        />
      </div>

      <AnalyticsSection
        title="模型与业务"
        description="按调用量与失败率定位问题来源"
      >
        <div class="ai-grid">
          <ChartCard
            title="模型失败率"
            description="颜色：绿 ≤ 15%，橙 15–30%，红 > 30%；点击查看调用记录"
            :scope="scope"
            :option="modelOption"
            :height="Math.max(240, (data.modelStats?.length ?? 0) * 40)"
            :empty="!data.modelStats?.length"
            :loading="loading"
            clickable
            @chart-click="p => p?.name && goCallRecords({ model: p.name })"
          />
          <ChartCard
            title="业务类型调用量 TOP10"
            description="点击查看对应调用记录"
            :scope="scope"
            :option="bizOption"
            :height="
              Math.max(240, Math.min(10, data.bizTypeStats?.length ?? 0) * 40)
            "
            :empty="!data.bizTypeStats?.length"
            :loading="loading"
            clickable
            @chart-click="p => p?.name && goCallRecords({ bizType: p.name })"
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="趋势" description="按月统计">
        <ChartCard
          title="调用量与失败率"
          description="成功与失败堆叠为调用总量，折线为失败率"
          :scope="scope"
          :option="callTrendOption"
          :height="300"
          :empty="!trend.length"
        />
        <div class="ai-grid">
          <ChartCard
            title="Token 消耗"
            :scope="scope"
            :option="tokenTrendOption"
            :height="260"
            :empty="!trend.length"
          />
          <ChartCard
            title="Fallback 次数与触发率"
            :scope="scope"
            :option="fallbackTrendOption"
            :height="260"
            :empty="!trend.length"
          />
        </div>
      </AnalyticsSection>

      <AnalyticsSection title="供应商与回退">
        <ChartCard
          title="供应商健康 vs 实际失败率"
          description="标记不匹配项：健康状态为 UP 但实际失败率 > 20%"
          :scope="scope"
          :empty="!data.providerHealthCompare?.length"
        >
          <DataTable :data="data.providerHealthCompare">
            <el-table-column prop="provider" label="供应商" min-width="140" />
            <el-table-column prop="healthStatus" label="健康状态" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="
                    row.healthStatus === 'UP'
                      ? 'success'
                      : row.healthStatus === 'SUSPENDED'
                        ? 'danger'
                        : 'warning'
                  "
                  size="small"
                >
                  {{ row.healthStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="healthReason"
              label="原因"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column
              prop="actualSuccess"
              label="实际成功"
              width="100"
              align="right"
            />
            <el-table-column
              prop="actualFail"
              label="实际失败"
              width="100"
              align="right"
            />
            <el-table-column label="实际失败率" width="170">
              <template #default="{ row }">
                <RateBar
                  :value="row.actualFailRate"
                  :tone="failRateTone(row.actualFailRate)"
                />
              </template>
            </el-table-column>
            <el-table-column label="状态一致性" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="row.mismatch ? 'danger' : 'success'"
                  size="small"
                >
                  {{ row.mismatch ? "不匹配" : "匹配" }}
                </el-tag>
              </template>
            </el-table-column>
          </DataTable>
        </ChartCard>

        <ChartCard
          v-if="data.fallbackPatterns?.length"
          title="Fallback 回退链路模式"
          description="按回退路径聚合；成功率 = 最终成功 / 该路径触发次数"
          :scope="scope"
        >
          <DataTable :data="data.fallbackPatterns">
            <el-table-column prop="pattern" label="回退链路" min-width="260" />
            <el-table-column
              prop="count"
              label="触发次数"
              width="110"
              align="right"
            />
            <el-table-column
              prop="successCount"
              label="最终成功"
              width="110"
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
          </DataTable>
        </ChartCard>
      </AnalyticsSection>

      <AnalyticsSection title="明细" description="最近的异常与回退样本">
        <ChartCard
          v-if="data.fallbackChains?.length"
          title="Fallback 明细（最近 20 条多供应商回退）"
          description="基于 ai_call_record.fallback_tried 原始字段，未做推断"
        >
          <DataTable :data="data.fallbackChains">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="model" label="最终模型" min-width="140" />
            <el-table-column
              prop="fallbackTried"
              label="尝试链路"
              min-width="220"
              show-overflow-tooltip
            />
            <el-table-column
              prop="attemptCount"
              label="尝试次数"
              width="100"
              align="right"
            />
            <el-table-column label="最终状态" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.status === 'SUCCESS' ? 'success' : 'danger'"
                  size="small"
                >
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="耗时" width="100" align="right">
              <template #default="{ row }">
                {{ formatDuration(row.costTimeMs) }}
              </template>
            </el-table-column>
            <el-table-column prop="bizType" label="业务类型" min-width="140" />
            <el-table-column prop="createdTime" label="时间" min-width="160" />
          </DataTable>
        </ChartCard>

        <ChartCard
          v-if="data.slowCalls?.length"
          title="慢调用 TOP10"
          description="耗时 > 30 秒"
          :scope="scope"
        >
          <DataTable :data="data.slowCalls">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="model" label="模型" min-width="140" />
            <el-table-column prop="biz_type" label="业务类型" min-width="140" />
            <el-table-column prop="STATUS" label="状态" width="100" />
            <el-table-column label="耗时" width="100" align="right">
              <template #default="{ row }">
                {{ formatDuration(row.cost_time_ms) }}
              </template>
            </el-table-column>
            <el-table-column prop="created_time" label="时间" min-width="160" />
          </DataTable>
        </ChartCard>
      </AnalyticsSection>
    </template>
  </AnalyticsPage>
</template>

<style scoped lang="scss">
.ai-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ra-space-md);
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--ra-space-md);
}
</style>
