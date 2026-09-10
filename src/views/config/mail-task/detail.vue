<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { ElMessageBox } from "element-plus";
import {
  getMailSendTaskDetail,
  getMailSendTaskRecipients,
  retryMailSendTask
} from "@/api/system";
import { taskStatusMap } from "./utils/hook";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import dayjs from "dayjs";

defineOptions({
  name: "MailSendTaskDetail"
});

const props = defineProps<{ record: any }>();

const loading = ref(false);
const detail = ref<any>(props.record);

const recipientLoading = ref(false);
const recipients = ref<any[]>([]);
const pagination = reactive({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});
const filterStatus = ref<number | "">("");

const recipientStatusMap: Record<number, { label: string; tag: string }> = {
  0: { label: "待发送", tag: "info" },
  1: { label: "成功", tag: "success" },
  2: { label: "失败", tag: "danger" },
  3: { label: "发送中", tag: "warning" },
  4: { label: "重试中", tag: "warning" },
  6: { label: "结果未知", tag: "info" },
  [-1]: { label: "无效收件人", tag: "info" }
};

const taskId = computed(() => detail.value?.id);

const successRate = computed(() => {
  const valid = detail.value?.validCount ?? 0;
  const success = detail.value?.successCount ?? 0;
  return valid > 0 ? ((success / valid) * 100).toFixed(1) + "%" : "-";
});

const summaryItems = computed(() => [
  {
    label: "任务状态",
    value: taskStatusMap[detail.value?.status]?.label ?? "-",
    tagType: taskStatusMap[detail.value?.status]?.tag ?? "info"
  },
  { label: "收件人数", value: `${detail.value?.validCount ?? 0}`, tagType: "" },
  { label: "成功数", value: `${detail.value?.successCount ?? 0}`, tagType: "" },
  { label: "失败数", value: `${detail.value?.failedCount ?? 0}`, tagType: "" },
  { label: "成功率", value: successRate.value, tagType: "" }
]);

const descriptionColumns = [
  { label: "任务编号", prop: "taskNo" },
  { label: "任务名称", prop: "taskName" },
  {
    label: "状态",
    prop: "status",
    formatter: ({ status }) =>
      taskStatusMap[status]?.label ?? String(status ?? "-")
  },
  { label: "邮件主题", prop: "subject" },
  {
    label: "创建时间",
    prop: "createdTime",
    formatter: ({ createdTime }) =>
      createdTime ? dayjs(createdTime).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  {
    label: "开始时间",
    prop: "startedAt",
    formatter: ({ startedAt }) =>
      startedAt ? dayjs(startedAt).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  {
    label: "完成时间",
    prop: "finishedAt",
    formatter: ({ finishedAt }) =>
      finishedAt ? dayjs(finishedAt).format("YYYY-MM-DD HH:mm:ss") : "-"
  },
  { label: "备注", prop: "remark" }
];

async function loadDetail() {
  if (!taskId.value) return;
  loading.value = true;
  try {
    const { data } = await getMailSendTaskDetail(taskId.value);
    detail.value = data;
  } finally {
    loading.value = false;
  }
}

async function loadRecipients() {
  if (!taskId.value) return;
  recipientLoading.value = true;
  try {
    const { data } = await getMailSendTaskRecipients(taskId.value, {
      status: filterStatus.value === "" ? undefined : filterStatus.value,
      current: pagination.currentPage,
      size: pagination.pageSize
    });
    recipients.value = data.records;
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;
  } finally {
    recipientLoading.value = false;
  }
}

function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  loadRecipients();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  loadRecipients();
}

function handleRetry() {
  ElMessageBox.confirm("确认重新发送失败收件人？", "失败重试", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  })
    .then(async () => {
      try {
        const r: any = await retryMailSendTask(taskId.value);
        if (r.code !== 200) throw new Error(r.msg || "重试失败");
        message("失败收件人已重新进入发送队列", { type: "success" });
        loadDetail();
        loadRecipients();
      } catch (e) {
        message(getErrorMessage(e, "重试失败"), { type: "error" });
      }
    })
    // 用户取消确认框时静默处理
    .catch(() => {});
}

onMounted(() => {
  loadRecipients();
});
</script>

<template>
  <div v-loading="loading" class="mail-task-detail">
    <div class="detail-toolbar">
      <div class="detail-toolbar__main">
        <div class="detail-toolbar__title">邮件发送任务</div>
        <div class="detail-toolbar__subtitle">
          {{ detail.taskName || "-" }}
          <span class="mx-2 text-[var(--el-border-color)]">/</span>
          {{ detail.taskNo || "-" }}
        </div>
      </div>
      <div class="detail-toolbar__actions">
        <el-button
          v-if="detail.status === 3 || detail.status === 4"
          v-perms="'config:mailTask:retry'"
          type="warning"
          :icon="useRenderIcon('ri/refresh-line')"
          @click="handleRetry"
        >
          重试失败
        </el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="item in summaryItems" :key="item.label" class="summary-card">
        <span class="summary-card__label">{{ item.label }}</span>
        <el-tag
          v-if="item.tagType"
          :type="item.tagType as any"
          effect="plain"
          class="summary-card__tag"
        >
          {{ item.value }}
        </el-tag>
        <strong v-else class="summary-card__value">{{ item.value }}</strong>
      </div>
    </div>

    <PureDescriptions
      border
      :data="[detail]"
      :columns="descriptionColumns"
      :column="3"
    />

    <el-tabs type="border-card" class="detail-tabs">
      <el-tab-pane label="收件人明细">
        <div class="tab-toolbar">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            class="w-[160px]!"
            @change="loadRecipients"
          >
            <el-option label="待发送" :value="0" />
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="2" />
            <el-option label="发送中" :value="3" />
            <el-option label="重试中" :value="4" />
            <el-option label="结果未知" :value="6" />
            <el-option label="无效收件人" :value="-1" />
          </el-select>
        </div>

        <el-table v-loading="recipientLoading" :data="recipients" border>
          <el-table-column label="姓名" prop="recipientName" min-width="100">
            <template #default="{ row }">
              {{ row.recipientName || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="邮箱" prop="recipientEmail" min-width="200">
            <template #default="{ row }">
              <span v-if="row.recipientEmail">{{ row.recipientEmail }}</span>
              <el-tag v-else type="info" size="small">未设置</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.invalidReason" type="info" size="small"
                >无效（{{ row.invalidReason }}）</el-tag
              >
              <el-tag
                v-else
                :type="(recipientStatusMap[row.status]?.tag ?? 'info') as any"
                size="small"
              >
                {{ recipientStatusMap[row.status]?.label ?? row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="失败原因"
            prop="errorMessage"
            min-width="200"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.errorMessage || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="发送时间" min-width="160">
            <template #default="{ row }">
              {{
                row.sendTime
                  ? dayjs(row.sendTime).format("YYYY-MM-DD HH:mm:ss")
                  : "-"
              }}
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="mt-3 justify-end"
          :current-page="pagination.currentPage"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.mail-task-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-toolbar {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.detail-toolbar__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.detail-toolbar__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.detail-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.summary-card__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-card__value {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.summary-card__tag {
  width: fit-content;
}

.detail-tabs {
  margin-top: 2px;
}

.tab-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px;
}

@media (width <= 1400px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
