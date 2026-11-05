<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElForm, ElFormItem, ElSelect, ElOption, ElAlert } from "element-plus";
import type { FormInstance } from "element-plus";

const props = defineProps<{
  /** 当前这条身份记录 */
  row: { id: number; userId: number; nickName?: string; openidMasked?: string };
  /** 可选用户（父组件已加载好） */
  userOptions: Array<{ label: string; value: number }>;
}>();

const formRef = ref<FormInstance>();
const targetUserId = ref<number | undefined>(undefined);

/** 不能选自己当前归属，否则是无效操作 */
const options = computed(() =>
  props.userOptions.filter(o => o.value !== props.row.userId)
);

watch(
  () => props.row,
  () => {
    targetUserId.value = undefined;
  },
  { immediate: true }
);

function submit(): Promise<number> {
  return new Promise(resolve => {
    formRef.value?.validate(valid => {
      resolve(valid ? Number(targetUserId.value) : 0);
    });
  });
}

defineExpose({ submit });
</script>

<template>
  <el-form ref="formRef" :model="{ targetUserId }" label-width="96px">
    <el-form-item label="当前归属">
      <span class="cur">
        {{ row.nickName || "未命名用户" }}
        <span class="cur-id">userId={{ row.userId }}</span>
      </span>
    </el-form-item>

    <el-form-item
      label="改挂到"
      prop="targetUserId"
      :rules="[{ required: true, message: '请选择目标用户' }]"
    >
      <el-select
        v-model="targetUserId"
        filterable
        clearable
        placeholder="选择 Reward 用户"
        style="width: 100%"
      >
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="只改变「这个微信登录后是谁」"
      description="历史成绩不会跟着搬过去，仍留在原用户名下。要搬数据请单独处理。"
    />
  </el-form>
</template>

<style scoped>
.cur {
  color: var(--el-text-color-primary);
}

.cur-id {
  margin-left: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
