<script setup lang="ts">
import { ref, computed } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps, RepeatType } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: undefined,
    holidayName: "",
    holidayDate: null,
    lunarMonth: null,
    lunarDay: null,
    repeatType: "FIXED_DATE",
    repeatMonth: null,
    repeatWeekday: null,
    repeatOrdinal: null,
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

// 默认的 repeatType 选项（如果接口未返回）
const defaultRepeatTypes = [
  { label: "固定公历日期", value: "FIXED_DATE" },
  { label: "农历日期", value: "LUNAR" },
  { label: "某月第N个星期几", value: "WEEKDAY_OF_MONTH" },
  { label: "某月最后一天", value: "LAST_DAY_OF_MONTH" }
];

// 默认的星期选项
const defaultWeekdayOptions = [
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
  { label: "周日", value: 7 }
];

// 默认的序号选项
const defaultOrdinalOptions = [
  { label: "第一个", value: 1 },
  { label: "第二个", value: 2 },
  { label: "第三个", value: 3 },
  { label: "第四个", value: 4 },
  { label: "最后一个", value: -1 }
];

const repeatTypes = computed(
  () => props.formOptions.repeatTypes ?? defaultRepeatTypes
);
const weekdayOptions = computed(
  () => props.formOptions.weekdayOptions ?? defaultWeekdayOptions
);
const ordinalOptions = computed(
  () => props.formOptions.ordinalOptions ?? defaultOrdinalOptions
);

// 根据 repeatType 判断显示哪些字段
const showFixedDate = computed(
  () => newFormInline.value.repeatType === "FIXED_DATE"
);
const showLunar = computed(() => newFormInline.value.repeatType === "LUNAR");
const showWeekdayOfMonth = computed(
  () => newFormInline.value.repeatType === "WEEKDAY_OF_MONTH"
);
const showLastDayOfMonth = computed(
  () => newFormInline.value.repeatType === "LAST_DAY_OF_MONTH"
);

// 当 repeatType 变化时，清空无关字段
function onRepeatTypeChange(val: RepeatType) {
  // 清空所有日期相关字段
  newFormInline.value.holidayDate = null;
  newFormInline.value.lunarMonth = null;
  newFormInline.value.lunarDay = null;
  newFormInline.value.repeatMonth = null;
  newFormInline.value.repeatWeekday = null;
  newFormInline.value.repeatOrdinal = null;
}

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
    label-width="120px"
  >
    <el-form-item label="节假日名称" prop="holidayName">
      <el-input
        v-model.trim="newFormInline.holidayName"
        clearable
        maxlength="64"
        placeholder="请输入节假日名称"
      />
    </el-form-item>

    <el-form-item label="重复类型" prop="repeatType">
      <el-select
        v-model="newFormInline.repeatType"
        placeholder="请选择重复类型"
        class="w-full!"
        @change="onRepeatTypeChange"
      >
        <el-option
          v-for="item in repeatTypes"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <!-- 固定公历日期 -->
    <el-form-item v-if="showFixedDate" label="公历日期" prop="holidayDate">
      <el-date-picker
        v-model="newFormInline.holidayDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="请选择公历日期"
        class="w-full!"
      />
    </el-form-item>

    <!-- 农历日期 -->
    <el-form-item v-if="showLunar" label="农历月份" prop="lunarMonth">
      <el-input-number
        v-model="newFormInline.lunarMonth"
        :min="1"
        :max="12"
        placeholder="请输入农历月份"
        class="w-full!"
      />
    </el-form-item>
    <el-form-item v-if="showLunar" label="农历日期" prop="lunarDay">
      <el-input-number
        v-model="newFormInline.lunarDay"
        :min="1"
        :max="30"
        placeholder="请输入农历日期"
        class="w-full!"
      />
    </el-form-item>

    <!-- 某月第N个星期几 -->
    <el-form-item v-if="showWeekdayOfMonth" label="月份" prop="repeatMonth">
      <el-input-number
        v-model="newFormInline.repeatMonth"
        :min="1"
        :max="12"
        placeholder="请输入月份"
        class="w-full!"
      />
    </el-form-item>
    <el-form-item v-if="showWeekdayOfMonth" label="星期几" prop="repeatWeekday">
      <el-select
        v-model="newFormInline.repeatWeekday"
        placeholder="请选择星期几"
        class="w-full!"
      >
        <el-option
          v-for="item in weekdayOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item v-if="showWeekdayOfMonth" label="第几个" prop="repeatOrdinal">
      <el-select
        v-model="newFormInline.repeatOrdinal"
        placeholder="请选择第几个"
        class="w-full!"
      >
        <el-option
          v-for="item in ordinalOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <!-- 某月最后一天 -->
    <el-form-item v-if="showLastDayOfMonth" label="月份" prop="repeatMonth">
      <el-input-number
        v-model="newFormInline.repeatMonth"
        :min="1"
        :max="12"
        placeholder="请输入月份"
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
