<script setup lang="ts">
import FindingList, { type Finding } from "./FindingList.vue";

withDefaults(
  defineProps<{
    items: Finding[];
    rules?: string;
    title?: string;
    /** 无发现时是否仍显示区块（显示「未触发」的明确结论） */
    showWhenEmpty?: boolean;
  }>(),
  { rules: "", title: "本期发现", showWhenEmpty: false }
);
</script>

<template>
  <section
    v-if="items.length || showWhenEmpty"
    class="findings-section"
    :aria-label="title"
  >
    <h2>{{ title }}</h2>
    <FindingList :items="items" :rules="rules" />
  </section>
</template>

<style scoped lang="scss">
.findings-section {
  padding: var(--ra-space-lg);
  background: var(--el-fill-color-lighter);
  border-radius: var(--ra-radius-lg);

  h2 {
    margin: 0 0 var(--ra-space-sm);
    font-size: var(--ra-font-md);
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}
</style>
