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
import {
  DetailFields,
  DetailHeader,
  DetailPage,
  DetailSection,
  DetailSummary,
  type DetailFieldItem,
  type DetailSummaryItem,
  type DetailTagType
} from "@/components/ReDetail";
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
  currentPage: 1
});
const filterStatus = ref<number | "">("");

const recipientStatusMap: Record<
  number,
  { label: string; tag: DetailTagType }
> = {
  0: { label: "待发送", tag: "info" },
  1: { label: "成功", tag: "success" },
  2: { label: "失败", tag: "danger" },
  3: { label: "发送中", tag: "warning" },
  4: { label: "重试中", tag: "warning" },
  6: { label: "结果未知", tag: "info" },
  [-1]: { label: "无效收件人", tag: "info" }
};

const recipientStatusOptions = Object.entries(recipientStatusMap).map(
  ([value, { label }]) => ({ value: Number(value), label })
);

const taskId = computed(() => detail.value?.id);
const taskStatus = computed(() => taskStatusMap[detail.value?.status]);

const successRate = computed(() => {
  const valid = detail.value?.validCount ?? 0;
  const success = detail.value?.successCount ?? 0;
  return valid > 0 ? ((success / valid) * 100).toFixed(1) + "%" : "-";
});

const summaryItems = computed<DetailSummaryItem[]>(() => [
  {
    label: "任务状态",
    value: taskStatus.value?.label ?? "-",
    tagType: (taskStatus.value?.tag ?? "info") as DetailTagType
  },
  { label: "收件人数", value: detail.value?.validCount ?? 0 },
  { label: "成功数", value: detail.value?.successCount ?? 0 },
  { label: "失败数", value: detail.value?.failedCount ?? 0 },
  { label: "成功率", value: successRate.value }
]);

const formatTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : undefined;

const infoFields = computed<DetailFieldItem[]>(() => [
  { label: "任务编号", value: detail.value?.taskNo, mono: true, copy: true },
  { label: "任务名称", value: detail.value?.taskName },
  { label: "邮件主题", value: detail.value?.subject, full: true },
  { label: "创建时间", value: formatTime(detail.value?.createdTime) },
  { label: "开始时间", value: formatTime(detail.value?.startedAt) },
  { label: "完成时间", value: formatTime(detail.value?.finishedAt) },
  { label: "备注", value: detail.value?.remark, full: true }
]);

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

function handleFilterChange() {
  pagination.currentPage = 1;
  loadRecipients();
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
  <DetailPage v-loading="loading">
    <DetailHeader :title="detail.taskName || '邮件发送任务'">
      <template #tags>
        <el-tag v-if="taskStatus" :type="taskStatus.tag as any" effect="light">
          {{ taskStatus.label }}
        </el-tag>
      </template>
      <template #subtitle>{{ detail.taskNo || "-" }}</template>
      <template #actions>
        <el-button
          v-if="detail.status === 3 || detail.status === 4"
          v-perms="'config:mailTask:retry'"
          type="warning"
          :icon="useRenderIcon('ri:refresh-line')"
          @click="handleRetry"
        >
          重试失败
        </el-button>
      </template>
    </DetailHeader>

    <DetailSummary :items="summaryItems" />

    <DetailSection title="任务信息">
      <DetailFields :items="infoFields" :min-column-width="220" />
    </DetailSection>

    <DetailSection
      title="收件人明细"
      :description="pagination.total ? `共 ${pagination.total} 人` : undefined"
      flush
    >
      <template #extra>
        <el-select
          v-model="filterStatus"
          placeholder="全部状态"
          clearable
          size="small"
          class="w-[140px]!"
          @change="handleFilterChange"
        >
          <el-option
            v-for="option in recipientStatusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>

      <el-table v-loading="recipientLoading" :data="recipients">
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
        <el-table-column label="状态" width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.invalidReason" type="info" size="small">
              无效（{{ row.invalidReason }}）
            </el-tag>
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
            {{ formatTime(row.sendTime) ?? "-" }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="recipient-pagination"
        :current-page="pagination.currentPage"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </DetailSection>
  </DetailPage>
</template>

<style scoped>
.recipient-pagination {
  justify-content: flex-end;
  padding: 12px 16px;
}
</style>
