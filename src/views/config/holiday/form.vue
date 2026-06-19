<script setup lang="ts">
import { ref } from "vue";
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
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });
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
  </el-form>
</template>
