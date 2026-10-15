<script setup lang="ts">
import { ReSelect } from "@/components/ReSelect";
import { ref, watch } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
// 农历格式真源：解析 / 拼装 / 下拉选项都在 utils/lunar，列表列展示也复用它
import {
  LUNAR_DAY_OPTIONS,
  LUNAR_MONTH_OPTIONS,
  parseLunarBirthday,
  stringifyLunarBirthday
} from "./utils/lunar";

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
// 表单上拆成「闰月开关 + 月 + 日」三个控件。
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

// 控件变化 → 写回 formInline.lunarBirthday（未填完整则空串=未维护）
// 父组件（useCrudDialog）直接读 formInline 提交，无需改动通用 dialog 链路。
watch([lunarMonth, lunarDay, isLeapMonth], () => {
  newFormInline.value.lunarBirthday = stringifyLunarBirthday(
    lunarMonth.value,
    lunarDay.value,
    isLeapMonth.value
  );
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
      <div class="flex flex-wrap items-center gap-2">
        <el-checkbox v-model="isLeapMonth" label="闰月" />
        <!--
          宽度必须改写 EP 自己的宽度变量，不能用 Tailwind 的 w-40 / w-32：
          EP 的 `.el-select { width: var(--el-select-width) }`（默认 100%）与
          Tailwind 宽度类同特异性且在 element-plus/dist/index.css 中后加载，会覆盖它；
          覆盖后 width 变 100%，在 flex 容器里两个 select 的 basis 各自撑满并触发
          flex-shrink 收缩，最终塌成 min-content 窄条、选中值被压不可见。
        -->
        <ReSelect
          v-model="lunarMonth"
          placeholder="月份"
          style="

--el-select-width: 160px"
          :options="LUNAR_MONTH_OPTIONS"
        />
        <ReSelect
          v-model="lunarDay"
          placeholder="日期"
          style="

--el-select-width: 128px"
          :options="LUNAR_DAY_OPTIONS"
        />
      </div>
      <div class="text-xs text-gray-400 mt-1">
        可选。不填则由公历生日自动推断；填写后生日邮件按农历日期（含闰月）精确匹配
      </div>
    </el-form-item>
  </el-form>
</template>
