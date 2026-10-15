<script setup lang="ts">
defineOptions({ name: "AssignPanel" });

defineProps<{
  /** 被操作对象的类型，如「用户」「角色」 */
  subjectLabel: string;
  /** 被操作对象的名称 */
  subjectName?: string;
  /** 被操作对象的辅助信息（账号、编码等） */
  subjectMeta?: string;
  /** 正在分配的内容类型，如「角色」「菜单权限」 */
  targetLabel: string;
  /** 已选数量 */
  selectedCount?: number;
  /** 可选总数 */
  totalCount?: number;
}>();
</script>

<template>
  <div class="assign-panel">
    <div class="assign-panel__subject">
      <div class="assign-panel__subject-main">
        <span class="assign-panel__eyebrow">{{ subjectLabel }}</span>
        <strong class="assign-panel__name" :title="subjectName">
          {{ subjectName || "-" }}
        </strong>
        <span v-if="subjectMeta" class="assign-panel__meta">
          {{ subjectMeta }}
        </span>
      </div>
      <div v-if="selectedCount !== undefined" class="assign-panel__count">
        <span class="assign-panel__count-label">已分配{{ targetLabel }}</span>
        <strong class="assign-panel__count-value">
          {{ selectedCount }}
          <small v-if="totalCount !== undefined">/ {{ totalCount }}</small>
        </strong>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.assign-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.assign-panel__subject {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 8px;
}

.assign-panel__subject-main {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  min-width: 0;
}

.assign-panel__eyebrow {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.assign-panel__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.assign-panel__meta {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.assign-panel__count {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
}

.assign-panel__count-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.assign-panel__count-value {
  font-size: 20px;
  line-height: 1.3;
  color: var(--el-color-primary);
}

.assign-panel__count-value small {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
</style>
