<script setup lang="ts">
import { useRouter } from "vue-router";

export interface DrawerItem {
  label: string;
  value: string;
}

export interface DrawerAction {
  label: string;
  to: { path: string; query?: Record<string, string> };
}

export interface DrawerPayload {
  title: string;
  subtitle?: string;
  items: DrawerItem[];
  /** 数据来源与统计口径，解释「这些数字是怎么来的」 */
  source?: string;
  actions?: DrawerAction[];
}

defineProps<{ payload: DrawerPayload | null }>();
const open = defineModel<boolean>({ default: false });
const router = useRouter();

function go(action: DrawerAction) {
  open.value = false;
  router.push(action.to);
}
</script>

<template>
  <el-drawer
    v-model="open"
    :title="payload?.title"
    size="420px"
    destroy-on-close
  >
    <template v-if="payload">
      <p v-if="payload.subtitle" class="detail-drawer__subtitle">
        {{ payload.subtitle }}
      </p>
      <dl class="detail-drawer__list">
        <div v-for="item in payload.items" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
      <section v-if="payload.source" class="detail-drawer__source">
        <h3>数据来源与口径</h3>
        <p>{{ payload.source }}</p>
      </section>
    </template>
    <template v-if="payload?.actions?.length" #footer>
      <el-button
        v-for="action in payload.actions"
        :key="action.label"
        type="primary"
        plain
        @click="go(action)"
      >
        {{ action.label }}
      </el-button>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.detail-drawer__subtitle {
  margin: 0 0 var(--ra-space-md);
  font-size: var(--ra-font-sm);
  color: var(--el-text-color-secondary);
}

.detail-drawer__list {
  margin: 0;

  > div {
    display: flex;
    gap: var(--ra-space-md);
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  dt {
    font-size: var(--ra-font-sm);
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
    text-align: right;
    word-break: break-all;
  }
}

.detail-drawer__source {
  padding: var(--ra-space-sm) var(--ra-space-md);
  margin-top: var(--ra-space-lg);
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-md);

  h3 {
    margin: 0 0 4px;
    font-size: var(--ra-font-sm);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  p {
    margin: 0;
    font-size: var(--ra-font-xs);
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
}
</style>
