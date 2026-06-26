<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { SysMenuVo } from "@/api/rbac";

const props = withDefaults(
  defineProps<{
    menuTree: SysMenuVo[];
    checkedKeys: number[];
  }>(),
  {
    menuTree: () => [],
    checkedKeys: () => []
  }
);

const treeRef = ref();

function getCheckedKeys(): number[] {
  return treeRef.value?.getCheckedKeys() ?? [];
}

function getHalfCheckedKeys(): number[] {
  return treeRef.value?.getHalfCheckedKeys() ?? [];
}

watch(
  () => props.checkedKeys,
  async keys => {
    await nextTick();
    treeRef.value?.setCheckedKeys(keys);
  },
  { immediate: true }
);

defineExpose({ getCheckedKeys, getHalfCheckedKeys });
</script>

<template>
  <el-tree
    ref="treeRef"
    show-checkbox
    node-key="id"
    :data="menuTree"
    :props="{ label: 'menuName', children: 'children' }"
    check-strictly
    default-expand-all
  />
</template>
