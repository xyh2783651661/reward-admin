<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { migrateSharedMode, type MigrationReport } from "@/api/reward-wechat";
import { getErrorMessage } from "@/utils/error";

const props = defineProps<{ targetUserId: number }>();

const loading = ref(false);
const running = ref(false);
const report = ref<MigrationReport | null>(null);

/** 试运行：只算不写，用来在执行前确认「会动多少」 */
async function dryRun() {
  loading.value = true;
  try {
    const res = await migrateSharedMode({
      targetUserId: props.targetUserId,
      dryRun: true
    });
    report.value = res.data;
  } catch (e) {
    ElMessage.error(getErrorMessage(e, "试运行失败"));
  } finally {
    loading.value = false;
  }
}

/** 真正执行：一律先确认，因为会改归属 */
async function execute() {
  try {
    await ElMessageBox.confirm(
      `将把「没有业务数据的」微信身份统一挂到 userId=${props.targetUserId}，` +
        `并清理没有身份、也没有数据的空壳用户。\n` +
        `原用户名下有考试或目标分的身份会被跳过，不会搬走数据。\n\n` +
        `可以重复执行，第二次不会再产生变化。`,
      "确认执行迁移",
      { type: "warning", confirmButtonText: "执行迁移" }
    );
  } catch {
    return;
  }
  running.value = true;
  try {
    const res = await migrateSharedMode({
      targetUserId: props.targetUserId,
      dryRun: false
    });
    report.value = res.data;
    ElMessage.success("迁移完成");
  } catch (e) {
    ElMessage.error(getErrorMessage(e, "迁移失败"));
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="migrate">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="这一步会把微信身份统一挂到目标用户"
      description="只调整「哪个微信算哪个用户」，并清理没有数据的空壳账号；不搬移任何考试数据。原用户名下有数据的身份会被跳过并在下方列出。可重复执行。"
    />

    <div class="actions">
      <span class="target">目标用户：userId={{ props.targetUserId }}</span>
      <el-button :loading="loading" :disabled="running" @click="dryRun">
        试运行（不写库）
      </el-button>
      <el-button
        type="primary"
        :loading="running"
        :disabled="loading"
        @click="execute"
      >
        执行迁移
      </el-button>
    </div>

    <div v-if="report" class="report">
      <div class="summary">{{ report.summary }}</div>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="扫描身份">
          {{ report.identitiesScanned }}
        </el-descriptions-item>
        <el-descriptions-item label="已就位">
          {{ report.identitiesAlreadyOk }}
        </el-descriptions-item>
        <el-descriptions-item label="本次改挂">
          {{ report.identitiesMoved }}
        </el-descriptions-item>
        <el-descriptions-item label="跳过（有数据）">
          {{ report.identitiesSkipped }}
        </el-descriptions-item>
        <el-descriptions-item label="清理空壳用户">
          {{ report.shellUsersRemoved }}
        </el-descriptions-item>
        <el-descriptions-item label="模式">
          {{ report.dryRun ? "试运行" : "已执行" }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="report.details?.length" class="details">
        <div class="details-title">明细</div>
        <ul>
          <li v-for="(line, i) in report.details" :key="i">{{ line }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.migrate {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.target {
  margin-right: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.report {
  padding-top: 12px;
  border-top: 1px dashed var(--el-border-color);
}

.summary {
  margin-bottom: 10px;
  font-weight: 600;
}

.details {
  margin-top: 12px;
}

.details-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.details ul {
  max-height: 200px;
  padding-left: 18px;
  margin: 0;
  overflow: auto;
  font-size: 13px;
  line-height: 1.8;
}
</style>
