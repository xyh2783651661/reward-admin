<script setup lang="ts">
import { computed } from "vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useDetailCopy } from "./useDetailCopy";
import type { DetailFieldItem } from "./types";

defineOptions({ name: "DetailFields" });

const props = withDefaults(
  defineProps<{
    items: DetailFieldItem[];
    /** 单列最小宽度，决定自适应列数 */
    minColumnWidth?: number;
  }>(),
  { minColumnWidth: 240 }
);

const { copyText } = useDetailCopy();
const copyIcon = useRenderIcon("ri:file-copy-line");

const visibleItems = computed(() => props.items.filter(item => !item.hidden));
const isEmpty = (item: DetailFieldItem) =>
  item.value == null || item.value === "";
</script>

<template>
  <dl
    class="detail-fields"
    :style="{
      gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))`
    }"
  >
    <div
      v-for="item in visibleItems"
      :key="item.key ?? item.label"
      class="detail-field"
      :class="{ 'is-full': item.full }"
    >
      <dt class="detail-field__label">{{ item.label }}</dt>
      <dd class="detail-field__value">
        <slot :name="item.key ?? item.label" :item="item">
          <span v-if="isEmpty(item)" class="detail-field__empty">-</span>
          <el-tag v-else-if="item.tagType" :type="item.tagType" effect="light">
            {{ item.value }}
          </el-tag>
          <span v-else :class="{ 'is-mono': item.mono }">{{ item.value }}</span>
        </slot>
        <el-button
          v-if="item.copy && !isEmpty(item)"
          class="detail-field__copy"
          link
          type="primary"
          :icon="copyIcon"
          :aria-label="`复制${item.label}`"
          @click="copyText(item.value, item.label)"
        />
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.detail-fields {
  display: grid;
  gap: 16px 24px;
  margin: 0;
}

.detail-field {
  min-width: 0;
}

.detail-field.is-full {
  grid-column: 1 / -1;
}

.detail-field__label {
  margin-bottom: 4px;
  font-size: var(--ra-font-xs);
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.detail-field__value {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  min-width: 0;
  margin: 0;
  font-size: var(--ra-font-base);
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.detail-field__value .is-mono {
  font-family:
    SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: var(--ra-font-sm);
}

.detail-field__empty {
  color: var(--el-text-color-placeholder);
}

.detail-field__copy {
  flex-shrink: 0;
  height: 22px;
  padding: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.detail-field:hover .detail-field__copy,
.detail-field__copy:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .detail-field__copy {
    opacity: 1;
  }
}
</style>
