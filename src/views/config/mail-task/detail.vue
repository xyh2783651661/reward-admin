<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
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

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detail = ref<any>({});

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

async function loadDetail() {
  loading.value = true;
  try {
    const { data } = await getMailSendTaskDetail(route.params.id as string);
    detail.value = data;
  } finally {
    loading.value = false;
  }
}

async function loadRecipients() {
  recipientLoading.value = true;
  try {
    const { data } = await getMailSendTaskRecipients(
      route.params.id as string,
      {
        status: filterStatus.value === "" ? undefined : filterStatus.value,
        current: pagination.currentPage,
        size: pagination.pageSize
      }
    );
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
        const r: any = await retryMailSendTask(route.params.id as string);
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

function goBack() {
  router.push("/config/mail-task");
}

onMounted(() => {
  loadDetail();
  loadRecipients();
});
</script>

<template>
  <div v-loading="loading" class="main p-6">
    <el-descriptions :column="3" border title="任务信息">
      <el-descriptions-item label="任务编号">{{
        detail.taskNo || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="任务名称">{{
        detail.taskName || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag
          :type="(taskStatusMap[detail.status]?.tag ?? 'info') as any"
          size="small"
        >
          {{ taskStatusMap[detail.status]?.label ?? detail.status }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="邮件主题" :span="3">{{
        detail.subject || "-"
      }}</el-descriptions-item>
      <el-descriptions-item label="收件人数">{{
        detail.validCount ?? 0
      }}</el-descriptions-item>
      <el-descriptions-item label="成功数">{{
        detail.successCount ?? 0
      }}</el-descriptions-item>
      <el-descriptions-item label="失败数">{{
        detail.failedCount ?? 0
      }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{
          detail.createdTime
            ? dayjs(detail.createdTime).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="开始时间">
        {{
          detail.startedAt
            ? dayjs(detail.startedAt).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">
        {{
          detail.finishedAt
            ? dayjs(detail.finishedAt).format("YYYY-MM-DD HH:mm:ss")
            : "-"
        }}
      </el-descriptions-item>
      <el-descriptions-item v-if="detail.remark" label="备注" :span="3">{{
        detail.remark
      }}</el-descriptions-item>
    </el-descriptions>

    <div class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <span class="font-bold">收件人明细</span>
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

      <el-table v-loading="recipientLoading" :data="recipients" border>
        <el-table-column label="姓名" prop="recipientName" min-width="100">
          <template #default="{ row }">{{ row.recipientName || "-" }}</template>
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
          <template #default="{ row }">{{ row.errorMessage || "-" }}</template>
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
    </div>

    <div class="mt-6">
      <el-button @click="goBack">返回列表</el-button>
    </div>
  </div>
</template>
