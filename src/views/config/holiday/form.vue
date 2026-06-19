<script setup lang="ts">
import { ref, computed } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: undefined,
    holidayName: "",
    holidayDate: "",
    lunarMonth: null,
    lunarDay: null,
    holidayType: "",
    status: 1,
    sortOrder: 0,
    description: ""
  }),
  formOptions: () => ({
    holidayTypes: [],
    statusOptions: []
  }),
  recipientOptions: () => [],
  selectedRecipientIds: () => []
});

const emit = defineEmits<{
  (e: "update:selectedRecipientIds", value: number[]): void;
}>();

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const recipientIds = ref<number[]>([...props.selectedRecipientIds]);

const transferData = computed(() => {
  return props.recipientOptions.map(item => ({
    key: item.id,
    label: `${item.name} (${item.email})`,
    disabled: false
  }));
});

function handleRecipientChange(value: number[]) {
  recipientIds.value = value;
  emit("update:selectedRecipientIds", value);
}

function getRef() {
  return ruleFormRef.value;
}

function getRecipientIds() {
  return recipientIds.value;
}

defineExpose({ getRef, getRecipientIds });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="96px"
  >
    <el-form-item label="节假日名称" prop="holidayName">
      <el-input
        v-model.trim="newFormInline.holidayName"
        clearable
        maxlength="64"
        placeholder="请输入节假日名称"
      />
    </el-form-item>

    <el-form-item label="公历日期" prop="holidayDate">
      <el-date-picker
        v-model="newFormInline.holidayDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="请选择公历日期"
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="农历月份" prop="lunarMonth">
      <el-input-number
        v-model="newFormInline.lunarMonth"
        :min="1"
        :max="12"
        placeholder="请输入农历月份"
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="农历日期" prop="lunarDay">
      <el-input-number
        v-model="newFormInline.lunarDay"
        :min="1"
        :max="30"
        placeholder="请输入农历日期"
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="节假日类型" prop="holidayType">
      <el-select
        v-model="newFormInline.holidayType"
        clearable
        placeholder="请选择节假日类型"
        class="w-full!"
      >
        <el-option
          v-for="item in formOptions.holidayTypes"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="状态" prop="status">
      <el-radio-group v-model="newFormInline.status">
        <el-radio
          v-for="item in formOptions.statusOptions"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="排序" prop="sortOrder">
      <el-input-number
        v-model="newFormInline.sortOrder"
        :min="0"
        placeholder="请输入排序值"
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="描述" prop="description">
      <el-input
        v-model="newFormInline.description"
        :rows="3"
        maxlength="255"
        placeholder="请输入描述"
        show-word-limit
        type="textarea"
      />
    </el-form-item>

    <el-form-item label="指定收件人" class="transfer-form-item">
      <div class="w-full">
        <el-transfer
          v-model="recipientIds"
          :data="transferData"
          :titles="['可选收件人', '已选收件人']"
          :button-texts="['移到左边', '移到右边']"
          filterable
          filter-placeholder="请输入姓名或邮箱"
          class="recipient-transfer"
          @change="handleRecipientChange"
        />
        <div class="mt-2 text-sm text-gray-500">
          <template v-if="recipientIds.length === 0">
            未指定收件人，将发送给所有用户
          </template>
          <template v-else>
            仅发送给 {{ recipientIds.length }} 位指定收件人
          </template>
        </div>
      </div>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.transfer-form-item {
  :deep(.el-form-item__content) {
    flex: 1;
    min-width: 0;
  }
}

.recipient-transfer {
  :deep(.el-transfer-panel) {
    width: 280px;
  }

  :deep(.el-transfer-panel__body) {
    height: 260px;
  }

  :deep(.el-transfer-panel__list) {
    height: 210px;
  }
}
</style>
