import { http } from "@/utils/http";
import type { ApiResult } from "./types";

/**
 * 旧 Reward 考试数据 → 新 exam / exam_score 模型（后端 /admin/reward/migration/exam）。
 *
 * 与「微信身份迁移」是两件事：那个只改归属，这个才是真的搬历史成绩。
 * 迁移只增不删，依赖 legacy_exam_mapping 幂等，可重复执行。
 */

export type ExamMigrationMode = "DRY_RUN" | "APPLY" | "VERIFY" | "REPORT";

export type ExamMigrationReport = {
  mode: ExamMigrationMode;
  /** 旧表现状 */
  oldResultRows: number;
  oldScoreRows: number;
  mappedExams: number;
  newScoredRows: number;
  /** 本次实际写入 */
  migratedExams: number;
  insertedScores: number;
  insertedRewards: number;
  insertedRanks: number;
  insertedSummaries: number;
  skippedExams: number;
  /** 试运行预估 */
  plannedExams: number;
  plannedScores: number;
  plannedRewards: number;
  plannedRanks: number;
  plannedSummaries: number;
  plannedSkipped: number;
  /** 校验与审计 */
  migratedScoreRows: number;
  stageDefaulted: number;
  targetInferred: number;
  repairedScores: number;
  errors: string[];
  warnings: string[];
};

export type ExamMigrationParams = {
  /** 缺省 DRY_RUN：不传就是试运行 */
  mode?: ExamMigrationMode;
  targetUserId?: number;
  batchSize?: number;
  limit?: number;
};

export const migrateExamData = (data: ExamMigrationParams) => {
  return http.request<ApiResult<ExamMigrationReport>>(
    "post",
    "/api/admin/reward/migration/exam",
    { data }
  );
};
