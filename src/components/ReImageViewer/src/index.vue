<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface Props {
  /** 当前图片URL */
  src: string;
  /** 预览图片列表 */
  previewSrcList?: string[];
  /** 初始索引 */
  initialIndex?: number;
  /** 是否挂载到body */
  teleported?: boolean;
  /** 图片适应方式 */
  fit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** 是否显示预览 */
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  previewSrcList: () => [],
  initialIndex: 0,
  teleported: true,
  fit: "contain",
  visible: false
});

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "close"): void;
}>();

const viewerVisible = computed({
  get: () => props.visible,
  set: val => emit("update:visible", val)
});

function handleClose() {
  viewerVisible.value = false;
  emit("close");
}
</script>

<template>
  <el-image
    :src="src"
    :preview-src-list="previewSrcList.length ? previewSrcList : [src]"
    :initial-index="initialIndex"
    :preview-teleported="teleported"
    :fit="fit"
    :hide-on-click-modal="true"
  >
    <template #error>
      <slot name="error">
        <div class="re-image-error">
          <span>加载失败</span>
        </div>
      </slot>
    </template>
    <template #placeholder>
      <slot name="placeholder">
        <div class="re-image-placeholder">
          <span>加载中...</span>
        </div>
      </slot>
    </template>
  </el-image>
</template>

<style lang="scss" scoped>
.re-image-error,
.re-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-light);
}
</style>
