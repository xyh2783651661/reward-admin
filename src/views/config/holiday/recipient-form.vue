<script setup lang="ts">
import { ref, computed } from "vue";
import type { RecipientOption } from "./utils/types";

interface Props {
  holidayId: number;
  holidayName: string;
  recipientOptions: RecipientOption[];
  selectedRecipientIds: number[];
}

const props = withDefaults(defineProps<Props>(), {
  recipientOptions: () => [],
  selectedRecipientIds: () => []
});

const recipientIds = ref<number[]>([...props.selectedRecipientIds]);

const transferData = computed(() => {
  return props.recipientOptions.map(item => ({
    key: item.id,
    label: `${item.name} (${item.email})`,
    disabled: false
  }));
});

function getRecipientIds() {
  return recipientIds.value;
}

defineExpose({ getRecipientIds });
</script>

<template>
  <div class="recipient-form">
    <div class="mb-4 text-sm text-gray-600">
      为 <strong class="text-primary">{{ holidayName }}</strong> 指定收件人
    </div>
    <el-transfer
      v-model="recipientIds"
      :data="transferData"
      :titles="['可选收件人', '已选收件人']"
      :button-texts="['移到左边', '移到右边']"
      filterable
      filter-placeholder="请输入姓名或邮箱"
      class="recipient-transfer"
    />
    <div class="mt-3 text-sm text-gray-500">
      <template v-if="recipientIds.length === 0">
        未指定收件人，将发送给所有用户
      </template>
      <template v-else>
        仅发送给 {{ recipientIds.length }} 位指定收件人
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recipient-transfer {
  display: flex;
  justify-content: center;

  :deep(.el-transfer-panel) {
    flex: 1;
    max-width: 340px;
  }

  :deep(.el-transfer-panel__body) {
    height: 320px;
  }

  :deep(.el-transfer-panel__list) {
    height: 270px;
  }
}
</style>
