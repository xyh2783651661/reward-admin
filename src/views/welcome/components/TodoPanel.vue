<script setup lang="ts">
import { computed } from "vue";
import type { WorkbenchTodoItem } from "@/api/workbench";
import PanelCard from "@/components/PanelCard/index.vue";

const props = defineProps<{
  todos: WorkbenchTodoItem[];
  loading: boolean;
  error: string;
}>();

defineEmits<{ navigate: [path?: string]; retry: [] }>();

const rank = { danger: 0, warning: 1, primary: 2, info: 3, success: 4 };
const sorted = computed(() =>
  props.todos
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) => rank[a.item.status] - rank[b.item.status] || a.index - b.index
    )
    .map(({ item }) => item)
);
</script>

<template>
  <PanelCard
    title="行动中心"
    description="按紧急程度排序的待办事项"
    :loading="loading"
    :error="error"
    :empty="!loading && !todos.length"
    empty-text="当前没有待办，所有事项均已处理"
    empty-icon="ri:checkbox-circle-line"
    @retry="$emit('retry')"
  >
    <template #extra>
      <span v-if="todos.length" class="count">{{ todos.length }}</span>
    </template>

    <ul class="todos">
      <li
        v-for="item in sorted"
        :key="item.id"
        class="todo"
        :class="`is-${item.status}`"
      >
        <div class="todo__head">
          <strong>{{ item.title }}</strong>
          <el-tag :type="item.status" size="small" effect="light">
            {{ item.tag }}
          </el-tag>
        </div>
        <p v-if="item.description">{{ item.description }}</p>
        <div class="todo__foot">
          <span>
            <IconifyIconOnline icon="ri:time-line" />
            {{ item.dueTime }}
          </span>
          <button @click="$emit('navigate', item.path)">
            {{ item.actionText }}
            <IconifyIconOnline icon="ri:arrow-right-line" />
          </button>
        </div>
      </li>
    </ul>
  </PanelCard>
</template>

<style scoped lang="scss">
.count {
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  font-size: var(--ra-font-xs);
  font-weight: 700;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: var(--ra-radius-pill);
}

.todos {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.todo {
  padding: 12px 14px;
  background: var(--el-fill-color-extra-light);
  border-left: 3px solid var(--el-color-info-light-5);
  border-radius: 4px 10px 10px 4px;

  &.is-danger {
    border-left-color: var(--el-color-danger);
  }

  &.is-warning {
    border-left-color: var(--el-color-warning);
  }

  &.is-primary {
    border-left-color: var(--el-color-primary);
  }

  &.is-success {
    border-left-color: var(--el-color-success);
  }
}

.todo__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;

  strong {
    min-width: 0;
    font-size: var(--ra-font-base);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.todo p {
  margin: 6px 0 0;
  font-size: var(--ra-font-xs);
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.todo__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);

  span {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }

  button {
    display: inline-flex;
    gap: 2px;
    align-items: center;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: var(--el-color-primary);
    cursor: pointer;
    background: none;
    border: 0;

    &:hover {
      color: var(--el-color-primary-light-3);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}
</style>
