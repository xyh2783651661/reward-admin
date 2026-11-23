import type {
  AnalyticsAccessOverview,
  AnalyticsAiOverview,
  AnalyticsMailOverview,
  AnalyticsPublishOverview,
  AnalyticsTaskOverview
} from "@/api/analytics";
import type { Finding } from "../components/types";
import { formatNumber, formatPercent } from "./format";

/**
 * 关注规则：统一使用「比率阈值 + 最小样本」两个条件，避免小样本制造假警报。
 * 单纯的"失败数 > 0"不构成异常。
 */
export const FAIL_RATE_WARN = 15;
export const FAIL_RATE_CRITICAL = 30;
export const MIN_SAMPLE_AI = 20;
export const MIN_SAMPLE_DEFAULT = 10;

export const FINDING_RULES = {
  ai: `模型失败率 > ${FAIL_RATE_WARN}%（样本 ≥ ${MIN_SAMPLE_AI}，> ${FAIL_RATE_CRITICAL}% 为严重）；供应商健康状态与实际不符；Fallback 触发率 > 20%`,
  access: `接口失败率 > ${FAIL_RATE_WARN}%（样本 ≥ 50）；命中批量脚本规则的来源`,
  task: `任务失败率 > ${FAIL_RATE_WARN}%（样本 ≥ ${MIN_SAMPLE_DEFAULT}）`,
  publish: `整体发布失败率 > ${FAIL_RATE_WARN}% 或平台上传失败率 > ${FAIL_RATE_WARN}%（样本 ≥ ${MIN_SAMPLE_DEFAULT}）`,
  mail: `邮件失败率 > ${FAIL_RATE_WARN}%（样本 ≥ ${MIN_SAMPLE_DEFAULT}）`
} as const;

type Open = (() => void) | undefined;

function level(rate: number): Finding["level"] {
  return rate > FAIL_RATE_CRITICAL ? "critical" : "warning";
}

export interface AiFindingActions {
  onModel?: (model: string) => void;
  onModule?: Open;
}

export function aiFindings(
  d: AnalyticsAiOverview,
  scope: string,
  actions: AiFindingActions = {},
  moduleLabel = "AI 调用"
): Finding[] {
  const list: Finding[] = [];

  for (const m of d.modelStats ?? []) {
    if (m.total < MIN_SAMPLE_AI || m.failRate <= FAIL_RATE_WARN) continue;
    list.push({
      level: level(m.failRate),
      module: moduleLabel,
      title: `模型 ${m.model} 失败率偏高`,
      evidence: `${scope}调用 ${formatNumber(m.total)} 次，失败 ${formatNumber(m.fail)} 次，失败率 ${formatPercent(m.failRate)}`,
      actionLabel: actions.onModel ? "查看调用记录" : "查看专题",
      onAction: actions.onModel
        ? () => actions.onModel?.(m.model)
        : actions.onModule
    });
  }

  for (const p of (d.providerHealthCompare ?? []).filter(i => i.mismatch)) {
    list.push({
      level: "warning",
      module: moduleLabel,
      title: `供应商 ${p.provider} 健康状态与实际不符`,
      evidence: `健康状态 ${p.healthStatus}，实际失败率 ${formatPercent(p.actualFailRate)}（失败 ${formatNumber(p.actualFail)} / 成功 ${formatNumber(p.actualSuccess)}）`,
      actionLabel: "查看专题",
      onAction: actions.onModule
    });
  }

  if (d.fallbackRate > 20) {
    list.push({
      level: "info",
      module: moduleLabel,
      title: "Fallback 触发较频繁",
      evidence: `触发率 ${formatPercent(d.fallbackRate)}（阈值 20%），回退会放大耗时与成本`,
      actionLabel: "查看专题",
      onAction: actions.onModule
    });
  }
  return list;
}

export function accessFindings(
  d: AnalyticsAccessOverview,
  scope: string,
  onModule: Open
): Finding[] {
  const list: Finding[] = [];
  for (const a of d.failApis ?? []) {
    if (a.total < 50 || a.failRate <= FAIL_RATE_WARN) continue;
    list.push({
      level: level(a.failRate),
      module: "访问行为",
      title: `接口 ${a.uri} 失败率偏高`,
      evidence: `${scope}请求 ${formatNumber(a.total)} 次，失败 ${formatNumber(a.failCount)} 次，失败率 ${formatPercent(a.failRate)}`,
      actionLabel: "查看专题",
      onAction: onModule
    });
  }
  const scripts = (d.batchScripts ?? []).filter(s => s.matched);
  if (scripts.length) {
    const top = [...scripts].sort((a, b) => b.requestCount - a.requestCount)[0];
    list.push({
      level: "info",
      module: "访问行为",
      title: `${scripts.length} 个来源命中批量脚本规则`,
      evidence: `请求最多的是 ${top.ip}（${top.uri}，${formatNumber(top.requestCount)} 次）；命中依据：${top.reason}`,
      actionLabel: "查看专题",
      onAction: onModule
    });
  }
  return list;
}

export function taskFindings(
  d: AnalyticsTaskOverview,
  scope: string,
  onModule: Open
): Finding[] {
  const list: Finding[] = [];
  for (const t of d.taskStats ?? []) {
    if (t.total < MIN_SAMPLE_DEFAULT) continue;
    const failRate = (t.fail / t.total) * 100;
    if (failRate <= FAIL_RATE_WARN) continue;
    list.push({
      level: level(failRate),
      module: "任务执行",
      title: `任务 ${t.taskName} 失败率偏高`,
      evidence: `${scope}执行 ${formatNumber(t.total)} 次，失败 ${formatNumber(t.fail)} 次，失败率 ${formatPercent(failRate)}`,
      actionLabel: "查看专题",
      onAction: onModule
    });
  }
  return list;
}

export function publishFindings(
  d: AnalyticsPublishOverview,
  scope: string,
  onModule: Open
): Finding[] {
  const list: Finding[] = [];
  const failRate = 100 - d.publishSuccessRate;
  if (d.totalPackages >= MIN_SAMPLE_DEFAULT && failRate > FAIL_RATE_WARN) {
    const top = [...(d.failReasons ?? [])].sort((a, b) => b.count - a.count)[0];
    list.push({
      level: level(failRate),
      module: "发布链路",
      title: "整体发布失败率偏高",
      evidence: `${scope}共 ${formatNumber(d.totalPackages)} 个内容包，失败率 ${formatPercent(failRate)}${top ? `；最主要原因 ${top.errorType}（${formatNumber(top.count)} 次）` : ""}`,
      actionLabel: "查看专题",
      onAction: onModule
    });
  }
  for (const u of d.uploadStats ?? []) {
    if (u.total < MIN_SAMPLE_DEFAULT) continue;
    const rate = 100 - u.successRate;
    if (rate <= FAIL_RATE_WARN) continue;
    list.push({
      level: level(rate),
      module: "发布链路",
      title: `平台 ${u.platformCode} 上传失败率偏高`,
      evidence: `${scope}上传 ${formatNumber(u.total)} 次，失败 ${formatNumber(u.failed)} 次，失败率 ${formatPercent(rate)}`,
      actionLabel: "查看专题",
      onAction: onModule
    });
  }
  return list;
}

export function mailFindings(
  d: AnalyticsMailOverview,
  scope: string,
  onModule: Open
): Finding[] {
  if (d.totalSent < MIN_SAMPLE_DEFAULT) return [];
  const failRate = 100 - d.successRate;
  if (failRate <= FAIL_RATE_WARN) return [];
  const top = [...(d.failReasons ?? [])].sort((a, b) => b.count - a.count)[0];
  return [
    {
      level: level(failRate),
      module: "邮件运营",
      title: "邮件发送失败率偏高",
      evidence: `${scope}发送 ${formatNumber(d.totalSent)} 封，失败率 ${formatPercent(failRate)}${top ? `；最主要原因 ${top.reason}（${formatNumber(top.count)} 次）` : ""}`,
      actionLabel: "查看专题",
      onAction: onModule
    }
  ];
}
