<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "ReStatusTag" });

type Preset = "enable" | "result";
type TagSize = "large" | "default" | "small";

const PRESET_LABELS: Record<Preset, [string, string]> = {
  enable: ["启用", "禁用"],
  result: ["成功", "失败"]
};

const props = withDefaults(
  defineProps<{
    /** 正向状态（启用 / 成功）为 true */
    active: boolean;
    preset?: Preset;
    size?: TagSize;
    effect?: "plain" | "light" | "dark";
  }>(),
  { preset: "enable", size: undefined, effect: "plain" }
);

const label = computed(() => {
  const [on, off] = PRESET_LABELS[props.preset];
  return props.active ? on : off;
});
</script>

<template>
  <el-tag
    :type="active ? 'success' : 'danger'"
    :size="size"
    :effect="effect"
    disable-transitions
  >
    {{ label }}
  </el-tag>
</template>
