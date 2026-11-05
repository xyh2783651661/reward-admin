<script setup lang="ts">
import PanelCard from "@/components/PanelCard/index.vue";

defineProps<{
  items: { label: string; value: string | null | undefined; icon: string }[];
  loading: boolean;
}>();
</script>

<template>
  <PanelCard
    title="Redis 运行信息"
    description="连接、容量与 Keyspace 指标"
    :loading="loading"
    :empty="!items.length"
    empty-text="暂无 Redis 信息"
    :min-height="96"
  >
    <dl class="redis-grid">
      <div v-for="item in items" :key="item.label" class="redis-item">
        <dt>
          <IconifyIconOnline :icon="item.icon" />
          {{ item.label }}
        </dt>
        <dd>{{ item.value ?? "-" }}</dd>
      </div>
    </dl>
  </PanelCard>
</template>

<style scoped lang="scss">
.redis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
}

.redis-item {
  min-width: 0;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-lg);

  dt {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: var(--ra-font-xs);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 4px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--ra-font-md);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }
}
</style>
