<script setup lang="ts">
import { computed, ref } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import { message } from "@/utils/message";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    rewardKey: "",
    rewardType: "",
    rewardValue: "",
    description: "",
    condition: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

/** 尝试解析 condition，判断是否为 JSON 参数格式 */
const conditionParsed = computed<{
  isJson: boolean;
  invalid: boolean;
  hint: string;
}>(() => {
  const raw = (newFormInline.value.condition ?? "").trim();
  if (!raw) return { isJson: false, invalid: false, hint: "" };
  if (!raw.startsWith("{")) {
    return { isJson: false, invalid: false, hint: "纯文本条件描述" };
  }
  try {
    const obj = JSON.parse(raw);
    const keys = Object.keys(obj).filter(k => k !== "description");
    return {
      isJson: true,
      invalid: false,
      hint: `已识别为 JSON 参数（${keys.length} 项：${keys.join(", ") || "无"}）`
    };
  } catch (e: any) {
    return {
      isJson: true,
      invalid: true,
      hint: `JSON 解析失败：${e?.message ?? "格式错误"}`
    };
  }
});

/** 手动格式化 JSON */
function formatJson() {
  const raw = (newFormInline.value.condition ?? "").trim();
  if (!raw.startsWith("{")) {
    message("非 JSON 内容，无需格式化", { type: "info" });
    return;
  }
  try {
    const obj = JSON.parse(raw);
    newFormInline.value.condition = JSON.stringify(obj, null, 2);
    message("已格式化", { type: "success" });
  } catch (e: any) {
    message(`格式化失败：${e?.message ?? "非法 JSON"}`, { type: "error" });
  }
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
    label-width="82px"
  >
    <el-form-item label="KEY" prop="rewardKey">
      <el-input
        v-model="newFormInline.rewardKey"
        clearable
        placeholder="请输入KEY"
      />
    </el-form-item>

    <el-form-item label="类型" prop="rewardType">
      <el-select
        v-model="newFormInline.rewardType"
        placeholder="请选择类型"
        clearable
      >
        <el-option label="BASE" value="BASE" />
        <el-option label="EXTRA" value="EXTRA" />
        <el-option label="SPECIAL" value="SPECIAL" />
      </el-select>
    </el-form-item>

    <el-form-item label="数值" prop="rewardValue">
      <el-input-number
        v-model="newFormInline.rewardValue"
        :min="0"
        :step="1"
        controls-position="right"
        placeholder="请输入数值"
      />
    </el-form-item>

    <el-form-item label="标签" prop="description">
      <el-input
        v-model="newFormInline.description"
        clearable
        placeholder="请输入标签"
      />
    </el-form-item>

    <el-form-item label="条件" prop="condition">
      <div class="w-full">
        <el-input
          v-model="newFormInline.condition"
          placeholder='纯文本描述，或 JSON 参数（如 {"rankDiff": 20, "fallbackTopN": 5}）'
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 10 }"
        />
        <div class="flex items-center justify-between mt-1">
          <span
            class="text-xs"
            :class="{
              'text-red-500': conditionParsed.invalid,
              'text-green-600':
                conditionParsed.isJson && !conditionParsed.invalid,
              'text-gray-500':
                !conditionParsed.isJson && !conditionParsed.invalid
            }"
          >
            {{ conditionParsed.hint }}
          </span>
          <el-button
            v-if="conditionParsed.isJson"
            link
            type="primary"
            size="small"
            :disabled="conditionParsed.invalid"
            @click="formatJson"
          >
            格式化 JSON
          </el-button>
        </div>
      </div>
    </el-form-item>
  </el-form>
</template>
