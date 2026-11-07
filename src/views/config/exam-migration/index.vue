<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getRewardUserPage } from "@/api/reward";
import {
  migrateExamData,
  type ExamMigrationMode,
  type ExamMigrationReport
} from "@/api/reward-exam-migration";
import { getErrorMessage } from "@/utils/error";

defineOptions({
  name: "ConfigExamMigration"
});

const userOptions = ref<Array<{ label: string; value: number }>>([]);
const userLoading = ref(false);
const targetUserId = ref<number | null>(null);
const batchSize = ref(200);
const limit = ref<number | null>(null);

const loading = ref(false);
const running = ref(false);
const report = ref<ExamMigrationReport | null>(null);

/** 试运行与正式执行展示不同的字段：一个看「会做多少」，一个看「已做多少」 */
const isDryRun = computed(() => report.value?.mode === "DRY_RUN");

async function loadUsers() {
  userLoading.value = true;
  try {
    const res = await getRewardUserPage({ current: 1, size: 200 });
    const records = res?.data?.records ?? [];
    userOptions.value = records.map(u => ({
      value: u.id,
      label: `${u.nickName || "未命名用户"}（ID ${u.id}）`
    }));
    // 历史数据默认归属：与小程序单用户兼容模式一致，默到 1 号用户，避免手填错
    const first = records.find(u => u.id === 1) ?? records[0];
    if (first && targetUserId.value === null) targetUserId.value = first.id;
  } catch (e) {
    userOptions.value = [];
    ElMessage.error(getErrorMessage(e, "加载用户列表失败"));
  } finally {
    userLoading.value = false;
  }
}

async function submit(mode: ExamMigrationMode) {
  if (!targetUserId.value) {
    ElMessage.warning("请先选择历史数据归属用户");
    return;
  }
  const res = await migrateExamData({
    mode,
    targetUserId: targetUserId.value,
    batchSize: batchSize.value || undefined,
    limit: limit.value ?? undefined
  });
  report.value = res.data;
  return res.data;
}

/** 试运行：只算不写，用来在执行前确认「会动多少」 */
async function dryRun() {
  loading.value = true;
  try {
    const data = await submit("DRY_RUN");
    if (data?.errors?.length) {
      ElMessage.warning("试运行完成，但有错误项需要先处理");
    } else {
      ElMessage.success("试运行完成，未写入任何数据");
    }
  } catch (e) {
    ElMessage.error(getErrorMessage(e, "试运行失败"));
  } finally {
    loading.value = false;
  }
}

/** 校验：迁移后核对数量与映射一致性 */
async function verify() {
  loading.value = true;
  try {
    const data = await submit("VERIFY");
    if (data?.errors?.length) {
      ElMessage.warning("校验发现不一致项，请查看下方错误列表");
    } else {
      ElMessage.success("校验通过");
    }
  } catch (e) {
    ElMessage.error(getErrorMessage(e, "校验失败"));
  } finally {
    loading.value = false;
  }
}

/** 正式执行：迁移只增不删，但归属用户选错会把历史挂到别人名下，必须确认 */
async function execute() {
  const planned =
    report.value && isDryRun.value
      ? `\n本次试运行结果：将新建 ${report.value.plannedExams} 场考试、` +
        `${report.value.plannedScores} 条成绩、${report.value.plannedRewards} 条奖励。`
      : "";
  try {
    await ElMessageBox.confirm(
      `将把旧 reward_result / reward_score_record 中【未删除】的数据迁移到新模型，` +
        `归属用户 userId=${targetUserId.value}。\n` +
        `只新增、不删除旧数据；已迁移过的会被跳过，可重复执行。` +
        planned +
        `\n\n建议先点「试运行」确认数量再执行。`,
      "确认执行迁移",
      { type: "warning", confirmButtonText: "执行迁移" }
    );
  } catch {
    return;
  }
  running.value = true;
  try {
    await submit("APPLY");
    ElMessage.success("迁移完成");
  } catch (e) {
    ElMessage.error(getErrorMessage(e, "迁移失败"));
  } finally {
    running.value = false;
  }
}

onMounted(loadUsers);
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="把旧版考试数据迁移到新的考试模型"
      description="数据来源是旧表 reward_result / reward_score_record 中「未删除」的记录，目标是 exam / exam_score / exam_reward / exam_rank / exam_summary。只新增不删除，已迁移的自动跳过，可重复执行。"
    />

    <el-card shadow="never" class="panel">
      <el-form inline class="form" @submit.prevent>
        <el-form-item label="归属用户">
          <el-select
            v-model="targetUserId"
            filterable
            :loading="userLoading"
            placeholder="选择 Reward 用户"
            style="width: 260px"
          >
            <el-option
              v-for="item in userOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="每批条数">
          <el-input-number
            v-model="batchSize"
            :min="1"
            :max="1000"
            :step="100"
            controls-position="right"
            style="width: 130px"
          />
        </el-form-item>
        <el-form-item label="最多处理">
          <el-input-number
            v-model="limit"
            :min="1"
            placeholder="不限"
            controls-position="right"
            style="width: 130px"
          />
        </el-form-item>
        <el-form-item>
          <el-button :loading="loading" :disabled="running" @click="dryRun">
            试运行（不写库）
          </el-button>
          <el-button
            v-perms="'config:exam-migration:run'"
            type="primary"
            :loading="running"
            :disabled="loading"
            @click="execute"
          >
            执行迁移
          </el-button>
          <el-button :loading="loading" :disabled="running" @click="verify">
            校验结果
          </el-button>
        </el-form-item>
      </el-form>
      <div class="hint">
        归属用户即旧数据没有记录「属于谁」，迁移时必须指定一个；线上历史数据一般归属
        userId=1。
      </div>
    </el-card>

    <el-card v-if="report" shadow="never" class="panel">
      <div class="report-head">
        <span class="report-title">
          {{ isDryRun ? "试运行报告（未写库）" : "迁移报告" }}
        </span>
        <el-tag
          :type="report.errors?.length ? 'danger' : 'success'"
          effect="plain"
        >
          {{
            report.errors?.length ? `${report.errors.length} 项错误` : "无错误"
          }}
        </el-tag>
      </div>

      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="旧考试记录">
          {{ report.oldResultRows }}
        </el-descriptions-item>
        <el-descriptions-item label="旧成绩记录">
          {{ report.oldScoreRows }}
        </el-descriptions-item>
        <el-descriptions-item label="已映射考试">
          {{ report.mappedExams }}
        </el-descriptions-item>
        <el-descriptions-item label="已迁移成绩">
          {{ report.migratedScoreRows }}
        </el-descriptions-item>

        <template v-if="isDryRun">
          <el-descriptions-item label="将新建考试">
            {{ report.plannedExams }}
          </el-descriptions-item>
          <el-descriptions-item label="将写入成绩">
            {{ report.plannedScores }}
          </el-descriptions-item>
          <el-descriptions-item label="将写入奖励">
            {{ report.plannedRewards }}
          </el-descriptions-item>
          <el-descriptions-item label="将跳过（已迁）">
            {{ report.plannedSkipped }}
          </el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="本次新建考试">
            {{ report.migratedExams }}
          </el-descriptions-item>
          <el-descriptions-item label="写入成绩">
            {{ report.insertedScores }}
          </el-descriptions-item>
          <el-descriptions-item label="写入奖励">
            {{ report.insertedRewards }}
          </el-descriptions-item>
          <el-descriptions-item label="跳过（已迁）">
            {{ report.skippedExams }}
          </el-descriptions-item>
        </template>

        <el-descriptions-item label="写入排名">
          {{ isDryRun ? report.plannedRanks : report.insertedRanks }}
        </el-descriptions-item>
        <el-descriptions-item label="写入 AI 总结">
          {{ isDryRun ? report.plannedSummaries : report.insertedSummaries }}
        </el-descriptions-item>
        <el-descriptions-item label="学段兜底为初中">
          {{ report.stageDefaulted }}
        </el-descriptions-item>
        <el-descriptions-item label="目标分推定">
          {{ report.targetInferred }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="report.warnings?.length" class="list-block">
        <div class="list-title">提示（需人工核对，不影响迁移）</div>
        <ul>
          <li v-for="(line, i) in report.warnings" :key="`w-${i}`">
            {{ line }}
          </li>
        </ul>
      </div>

      <div v-if="report.errors?.length" class="list-block">
        <div class="list-title danger">错误（迁移未完成的部分）</div>
        <ul>
          <li v-for="(line, i) in report.errors" :key="`e-${i}`">
            {{ line }}
          </li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  border-radius: 6px;
}

.form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 8px;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.report-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.report-title {
  font-weight: 600;
}

.list-block {
  margin-top: 12px;
}

.list-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.list-title.danger {
  color: var(--el-color-danger);
}

.list-block ul {
  max-height: 240px;
  padding-left: 18px;
  margin: 0;
  overflow: auto;
  font-size: 13px;
  line-height: 1.8;
}
</style>
