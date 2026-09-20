<script setup lang="ts">
import { onMounted, ref } from "vue";
import dayjs from "dayjs";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import {
  getAiPromptVersions,
  rollbackAiPrompt,
  type AiPromptVersion
} from "@/api/prompt";

defineOptions({
  name: "AiPromptVersionHistory"
});

const props = defineProps<{
  /** 列表行（至少含 id / code / name / version） */
  record: any;
  /** 回滚成功后的回调（用于刷新列表） */
  onReverted?: () => void;
}>();

const loading = ref(false);
const rolling = ref(false);
const versions = ref<AiPromptVersion[]>([]);

/** 当前版本号（回滚成功后同步更新，保证禁用逻辑准确） */
const currentVersion = ref<number>(props.record?.version ?? 0);

const CHANGE_TYPE_MAP: Record<string, { label: string; tag: string }> = {
  create: { label: "新建", tag: "success" },
  update: { label: "修改", tag: "primary" },
  rollback: { label: "回滚", tag: "warning" }
};

function formatTime(t?: string | null) {
  return t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "-";
}

async function load() {
  loading.value = true;
  try {
    const { data } = await getAiPromptVersions(props.record.id);
    versions.value = data ?? [];
  } catch (e) {
    message(getErrorMessage(e, "加载版本历史失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function handleRollback(row: AiPromptVersion) {
  const label = props.record.name || props.record.code || props.record.id;
  try {
    await ElMessageBox.confirm(
      `确认将「${label}」回滚到 v${row.version}？当前版本会先被保存为快照，历史可追溯。`,
      "回滚提示词",
      {
        confirmButtonText: "确认回滚",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }
  rolling.value = true;
  try {
    const r: any = await rollbackAiPrompt({
      id: props.record.id,
      version: row.version
    });
    if (r.code === 200) {
      message(`已回滚到 v${row.version}`, { type: "success" });
      currentVersion.value = r.data?.version ?? currentVersion.value;
      await load();
      props.onReverted?.();
    } else {
      message(r.msg || "回滚失败", { type: "error" });
    }
  } catch (e) {
    message(getErrorMessage(e, "回滚失败"), { type: "error" });
  } finally {
    rolling.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="ai-prompt-version">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="历史版本只追加、不覆盖。回滚不会删除当前版本，而是先存快照再生成一条新版本。"
      class="mb-3"
    />

    <el-table
      v-loading="loading"
      :data="versions"
      row-key="id"
      border
      size="small"
      max-height="520"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <pre class="version-content">{{ row.content || "(空)" }}</pre>
        </template>
      </el-table-column>
      <el-table-column label="版本" width="80" align="center">
        <template #default="{ row }">v{{ row.version }}</template>
      </el-table-column>
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag
            :type="(CHANGE_TYPE_MAP[row.changeType]?.tag ?? 'info') as any"
            size="small"
          >
            {{ CHANGE_TYPE_MAP[row.changeType]?.label ?? row.changeType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="changeSummary"
        label="变更原因"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="操作人" width="90" align="center">
        <template #default="{ row }">{{ row.createdBy ?? "-" }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{
          formatTime(row.createdTime)
        }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            v-perms="'config:aiPrompt:edit'"
            link
            type="primary"
            :loading="rolling"
            :disabled="row.version >= currentVersion"
            @click="handleRollback(row)"
          >
            回滚
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="暂无历史版本" :image-size="80" />
      </template>
    </el-table>
  </div>
</template>

<style scoped>
.version-content {
  max-height: 320px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.mb-3 {
  margin-bottom: 12px;
}
</style>
