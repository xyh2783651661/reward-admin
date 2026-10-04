<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    nickName: "",
    avatar: "",
    phone: "",
    birthday: "",
    lunarBirthday: "",
    status: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

// ============ 农历生日（可选字段）============
// 后端存储格式统一为「月-日」，负月代表闰月（如 -8-15 = 闰八月十五）。
// 表单上拆成「闰月开关 + 月 + 日」三个控件，通过下面的 computed 代理双向写回
// formInline.lunarBirthday —— 父组件（useCrudDialog）直接读 formInline 提交，
// 无需改动通用 dialog 链路。
const LUNAR_MONTHS = [
  { label: "正月", value: 1 },
  { label: "二月", value: 2 },
  { label: "三月", value: 3 },
  { label: "四月", value: 4 },
  { label: "五月", value: 5 },
  { label: "六月", value: 6 },
  { label: "七月", value: 7 },
  { label: "八月", value: 8 },
  { label: "九月", value: 9 },
  { label: "十月", value: 10 },
  { label: "冬月(十一月)", value: 11 },
  { label: "腊月(十二月)", value: 12 }
];

const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => ({
  label: `第 ${i + 1} 天`,
  value: i + 1
}));

/** 合法格式：可选负号 + 1~12 月 + '-' + 1~30 日（与后端 LunarBirthdayUtil 保持一致）。 */
const LUNAR_PATTERN = /^(-?[1-9]|1[0-2])-([1-9]|[12]\d|30)$/;

/** 把后端返回的 "8-15" / "-8-15" 拆成三个控件的值；非法或空则全部置空。 */
function parseLunarBirthday(raw?: string) {
  if (!raw || !LUNAR_PATTERN.test(raw.trim())) {
    return { month: undefined, day: undefined, leap: false };
  }
  const [m, d] = raw.trim().split("-");
  const monthNum = Number(m);
  return {
    month: Math.abs(monthNum) as number,
    day: Number(d),
    leap: monthNum < 0
  };
}

const parsed = parseLunarBirthday(props.formInline.lunarBirthday);
const lunarMonth = ref<number | undefined>(parsed.month);
const lunarDay = ref<number | undefined>(parsed.day);
const isLeapMonth = ref(parsed.leap);

// dialog 复用同一组件实例时（如切换不同的行），同步外部传入值
watch(
  () => props.formInline.lunarBirthday,
  val => {
    const next = parseLunarBirthday(val);
    lunarMonth.value = next.month;
    lunarDay.value = next.day;
    isLeapMonth.value = next.leap;
  }
);

// 双向代理：控件变化 → 写回 formInline.lunarBirthday（未填完整则空串=未维护）
const lunarBirthdayProxy = computed<string>({
  get: () => newFormInline.value.lunarBirthday ?? "",
  set: val => {
    newFormInline.value.lunarBirthday = val;
  }
});

watch([lunarMonth, lunarDay, isLeapMonth], () => {
  const month = lunarMonth.value;
  const day = lunarDay.value;
  lunarBirthdayProxy.value =
    !month || !day ? "" : `${isLeapMonth.value ? "-" : ""}${month}-${day}`;
});

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
    label-width="82px"
  >
    <el-form-item label="昵称" prop="nickName">
      <el-input
        v-model="newFormInline.nickName"
        clearable
        placeholder="请输入昵称"
      />
    </el-form-item>

    <el-form-item label="手机号" prop="phone">
      <el-input
        v-model="newFormInline.phone"
        clearable
        placeholder="请输入手机号"
      />
    </el-form-item>

    <el-form-item label="公历生日" prop="birthday">
      <el-date-picker
        v-model="newFormInline.birthday"
        type="date"
        placeholder="请选择公历生日"
        size="default"
      />
    </el-form-item>

    <el-form-item label="农历生日">
      <div class="flex items-center gap-2">
        <el-checkbox v-model="isLeapMonth" label="闰月" />
        <el-select
          v-model="lunarMonth"
          placeholder="月份"
          clearable
          class="w-40"
        >
          <el-option
            v-for="m in LUNAR_MONTHS"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
        <el-select v-model="lunarDay" placeholder="日期" clearable class="w-32">
          <el-option
            v-for="d in LUNAR_DAYS"
            :key="d.value"
            :label="d.label"
            :value="d.value"
          />
        </el-select>
      </div>
      <div class="text-xs text-gray-400 mt-1">
        可选。不填则由公历生日自动推断；填写后生日邮件按农历日期（含闰月）精确匹配
      </div>
    </el-form-item>
  </el-form>
</template>
