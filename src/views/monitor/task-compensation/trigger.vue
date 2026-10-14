<script setup lang="ts">
import { computed } from "vue";
import type { TaskMetadata, TaskCompensationTriggerReq } from "@/api/task";

const props = defineProps<{
  task: TaskMetadata;
  payload: TaskCompensationTriggerReq;
}>();

/**
 * 父组件通过 addDialog 的 props 传入 payload 对象，
 * 这里不能直接改（会触发 vue/no-mutating-props），统一 emit 回父组件合并。
 */
const emit = defineEmits<{
  update: [patch: Partial<TaskCompensationTriggerReq>];
}>();

function useField<K extends keyof TaskCompensationTriggerReq>(key: K) {
  return computed({
    get: () => props.payload[key],
    set: value => emit("update", { [key]: value })
  });
}

const reason = useField("reason");
const asyncMode = useField("async");
const autoFix = useField("autoFix");
const skipDeps = useField("skipDeps");
const force = useField("force");

const hasDeps = computed(() => (props.task?.dependsOn?.length ?? 0) > 0);
const hasLock = computed(() => Boolean(props.task?.lockKey));
</script>

<template>
  <div class="trigger-form">
    <el-descriptions :column="1" border size="small" class="mb-4">
      <el-descriptions-item label="任务码">
        <el-text type="primary">{{ task.code }}</el-text>
      </el-descriptions-item>
      <el-descriptions-item label="任务名称">
        {{ task.name }}
      </el-descriptions-item>
      <el-descriptions-item label="描述">
        {{ task.description || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="分布式锁">
        {{ task.lockKey || "未启用" }}
      </el-descriptions-item>
      <el-descriptions-item v-if="hasDeps" label="前置依赖">
        {{ task.dependsOn.join("、") }}
      </el-descriptions-item>
    </el-descriptions>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      class="mb-4"
      title="该任务会产生真实的外部副作用（发送邮件 / 群发推送 / 上传视频），误触发不可撤销。"
    />

    <el-form label-position="top">
      <el-form-item label="触发原因">
        <el-input
          v-model="reason"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          placeholder="建议说明原因，例如「2026-10-14 早报邮件未发出，手动补跑」，该内容会写入审计日志"
        />
      </el-form-item>

      <el-form-item>
        <template #label>
          <span class="inline-flex items-center gap-1">
            异步执行
            <el-tag size="small" type="success" effect="plain">推荐</el-tag>
          </span>
        </template>
        <div class="flex flex-col gap-1 w-full">
          <el-switch v-model="asyncMode" />
          <el-text type="info" size="small">
            关闭后请求会一直阻塞到任务跑完，大任务极易触发网关超时；开启则立即返回，需到任务日志查看结果。
          </el-text>
        </div>
      </el-form-item>

      <template v-if="hasDeps">
        <el-form-item label="自动修复依赖">
          <div class="flex flex-col gap-1 w-full">
            <el-switch v-model="autoFix" />
            <el-text type="info" size="small">
              依赖不满足时，先调用依赖的 tryFix 自动补救再重跑。
            </el-text>
          </div>
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="inline-flex items-center gap-1">
              跳过依赖检查
              <el-tag size="small" type="danger" effect="plain">高危</el-tag>
            </span>
          </template>
          <div class="flex flex-col gap-1 w-full">
            <el-switch v-model="skipDeps" />
            <el-text type="danger" size="small">
              完全跳过前置校验。仅在确认依赖其实已满足、只是检查器误报时使用。
            </el-text>
          </div>
        </el-form-item>
      </template>

      <el-form-item v-if="hasLock">
        <template #label>
          <span class="inline-flex items-center gap-1">
            强制释放锁
            <el-tag size="small" type="danger" effect="plain">高危</el-tag>
          </span>
        </template>
        <div class="flex flex-col gap-1 w-full">
          <el-switch v-model="force" />
          <el-text type="danger" size="small">
            触发前先删除分布式锁（{{
              task.lockKey
            }}）。仅在任务卡死、锁未释放时使用，正常情况开启可能造成并发重复执行。
          </el-text>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.trigger-form {
  padding: 4px 2px;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__label) {
    padding-bottom: 4px;
  }
}
</style>
