<script setup lang="ts">
import { computed, ref } from "vue";
import type { AssignOption } from "./types";

defineOptions({ name: "AssignOptionList" });

const props = withDefaults(
  defineProps<{
    options: AssignOption[];
    searchPlaceholder?: string;
    maxHeight?: string;
    emptyText?: string;
  }>(),
  {
    searchPlaceholder: "搜索名称",
    maxHeight: "320px",
    emptyText: "暂无可选项"
  }
);

const modelValue = defineModel<Array<number | string>>({ default: () => [] });

const keyword = ref("");

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return props.options;
  return props.options.filter(
    o =>
      o.label.toLowerCase().includes(kw) ||
      o.description?.toLowerCase().includes(kw)
  );
});

const selectableIds = computed(() =>
  filtered.value.filter(o => !o.disabled).map(o => o.id)
);

const allChecked = computed(
  () =>
    selectableIds.value.length > 0 &&
    selectableIds.value.every(id => modelValue.value.includes(id))
);

function toggleAll() {
  if (allChecked.value) {
    modelValue.value = modelValue.value.filter(
      id => !selectableIds.value.includes(id)
    );
  } else {
    modelValue.value = Array.from(
      new Set([...modelValue.value, ...selectableIds.value])
    );
  }
}

function clearAll() {
  modelValue.value = [];
}
</script>

<template>
  <div class="assign-options">
    <div class="assign-options__toolbar">
      <el-input
        v-model="keyword"
        :placeholder="searchPlaceholder"
        clearable
        class="assign-options__search"
      />
      <el-button link type="primary" @click="toggleAll">
        {{ allChecked ? "取消全选" : "全选" }}
      </el-button>
      <el-button
        link
        type="info"
        :disabled="!modelValue.length"
        @click="clearAll"
      >
        清空
      </el-button>
    </div>

    <el-scrollbar :max-height="maxHeight">
      <el-checkbox-group
        v-if="filtered.length"
        v-model="modelValue"
        class="assign-options__grid"
      >
        <el-checkbox
          v-for="item in filtered"
          :key="item.id"
          :value="item.id"
          :disabled="item.disabled"
          border
          class="assign-options__item"
        >
          <span class="assign-options__label">{{ item.label }}</span>
          <span v-if="item.description" class="assign-options__desc">
            {{ item.description }}
          </span>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-else :description="emptyText" :image-size="64" />
    </el-scrollbar>
  </div>
</template>

<style scoped>
.assign-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.assign-options__toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.assign-options__search {
  flex: 1;
}

.assign-options__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.assign-options__item {
  height: auto;
  min-height: 40px;
  margin: 0;
}

.assign-options__item :deep(.el-checkbox__label) {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.4;
}

.assign-options__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.assign-options__desc {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

@media (width <= 560px) {
  .assign-options__grid {
    grid-template-columns: 1fr;
  }
}
</style>
