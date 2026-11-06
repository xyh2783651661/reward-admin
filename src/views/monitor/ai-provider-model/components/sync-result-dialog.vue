<script setup lang="ts">
import { computed } from "vue";
import { getProviderLabel } from "@/constants/ai-provider";
import type { ModelSyncResult, ModelSyncStatus } from "../types";

defineOptions({ name: "AiProviderModelSyncResult" });

const props = withDefaults(
  defineProps<{
    results?: ModelSyncResult[];
  }>(),
  {
    results: () => []
  }
);

const STATUS_META: Record<
  ModelSyncStatus,
  { label: string; tagType: "success" | "info" | "danger" }
> = {
  SUCCESS: { label: "同步成功", tagType: "success" },
  SKIPPED: { label: "已跳过", tagType: "info" },
  FAILED: { label: "同步失败", tagType: "danger" }
};

const summary = computed(() => {
  const counter = { SUCCESS: 0, SKIPPED: 0, FAILED: 0 };
  props.results.forEach(item => {
    if (item.status in counter) counter[item.status] += 1;
  });
  return counter;
});

function statusMeta(status: ModelSyncStatus) {
  return STATUS_META[status] ?? { label: status, tagType: "info" as const };
}
</script>

<template>
  <div class="sync-result">
    <el-alert
      v-if="results.length"
      :closable="false"
      show-icon
      :type="summary.FAILED ? 'warning' : 'success'"
      :title="`本次同步 ${results.length} 家供应商：成功 ${summary.SUCCESS} 家，跳过 ${summary.SKIPPED} 家，失败 ${summary.FAILED} 家`"
      description="跳过多见于未配置 API Key 或供应商没有标准 /models 接口，可改用「手工补录」。"
    />

    <el-table :data="results" size="small" border max-height="420" class="mt-2">
      <el-table-column label="供应商" min-width="130">
        <template #default="{ row }">
          <div class="font-medium">{{ getProviderLabel(row.provider) }}</div>
          <div class="sync-result__sub">{{ row.provider }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="statusMeta(row.status).tagType" effect="plain">
            {{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="拉取" prop="fetched" width="72" align="center" />
      <el-table-column label="新增" prop="inserted" width="72" align="center" />
      <el-table-column label="更新" prop="updated" width="72" align="center" />
      <el-table-column
        label="下线"
        prop="unavailable"
        width="72"
        align="center"
      />
      <el-table-column label="耗时" width="88" align="center">
        <template #default="{ row }">{{ row.costTimeMs ?? 0 }} ms</template>
      </el-table-column>
      <el-table-column label="说明" min-width="220">
        <template #default="{ row }">
          <span v-if="row.errorMessage" class="sync-result__error">
            {{ row.errorMessage }}
          </span>
          <span v-else class="sync-result__sub">
            {{ row.modelsUrl || "已按默认约定推导 /models 地址" }}
          </span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style lang="scss" scoped>
.sync-result__sub {
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
  word-break: break-all;
}

.sync-result__error {
  font-size: var(--ra-font-xs);
  color: var(--el-color-danger);
}

.mt-2 {
  margin-top: 8px;
}
</style>
