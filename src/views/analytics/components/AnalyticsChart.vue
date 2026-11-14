<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import * as echarts from "echarts/core";
import { applyTheme } from "../utils/chartTheme";

const props = withDefaults(
  defineProps<{
    option: Record<string, any>;
    height?: number;
    /** 屏幕阅读器可读的图表摘要 */
    label?: string;
    clickable?: boolean;
  }>(),
  { height: 280, label: "", clickable: false }
);

const emit = defineEmits<{ (e: "chart-click", params: any): void }>();

const el = ref<HTMLDivElement>();
const chart = shallowRef<echarts.ECharts>();
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;

function render() {
  chart.value?.setOption(applyTheme(props.option), true);
}

onMounted(() => {
  if (!el.value) return;
  chart.value = echarts.init(el.value);
  chart.value.on("click", params => emit("chart-click", params));
  render();
  // 容器从 display:none（未激活 Tab）变为可见、或窗口缩放时都会触发
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  resizeObserver.observe(el.value);
  // 亮 / 暗色切换后重新套用主题色
  themeObserver = new MutationObserver(render);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  });
});

watch(() => props.option, render);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  chart.value?.dispose();
});
</script>

<template>
  <div
    ref="el"
    role="img"
    :aria-label="label || undefined"
    :class="{ 'is-clickable': clickable }"
    :style="{ width: '100%', height: `${height}px` }"
  />
</template>

<style scoped>
.is-clickable {
  cursor: pointer;
}
</style>
