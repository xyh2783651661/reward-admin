<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PanelCard from "@/components/PanelCard/index.vue";
import ReJsonField from "@/components/ReJsonField/index.vue";
import { copyText } from "../format";

export interface PayloadTab {
  name: string;
  label: string;
  value: string;
}

const props = defineProps<{ tabs: PayloadTab[] }>();

const active = ref("");

watch(
  () => props.tabs,
  tabs => {
    if (!tabs.some(tab => tab.name === active.value)) {
      active.value = tabs[0]?.name ?? "";
    }
  },
  { immediate: true }
);

const current = computed(() =>
  props.tabs.find(tab => tab.name === active.value)
);
</script>

<template>
  <PanelCard
    title="配置与结果"
    description="参数已脱敏；JSON 可展开查看"
    :min-height="0"
  >
    <template #extra>
      <el-radio-group v-model="active" size="small">
        <el-radio-button v-for="tab in tabs" :key="tab.name" :value="tab.name">
          {{ tab.label }}
        </el-radio-button>
      </el-radio-group>
      <el-button
        v-if="current"
        link
        type="primary"
        size="small"
        @click="copyText(current.value, current.label)"
      >
        复制
      </el-button>
    </template>

    <ReJsonField
      v-if="current"
      :key="current.name"
      :model-value="current.value"
      readonly
      :deep="2"
      max-height="420px"
    />
  </PanelCard>
</template>
