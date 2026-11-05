<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormRules } from "element-plus";
import { ReSelect } from "@/components/ReSelect";
import { ASSET_TYPE_OPTIONS } from "./types";
import type { PublishPlatformFormData } from "./types";

const props = defineProps<{
  formInline: PublishPlatformFormData;
}>();

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

const isEdit = computed(() => newFormInline.value.id != null);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });

/** 正文/标签上下限必须有序，否则提示词里的约束会自相矛盾 */
function validateContentRange(_rule: unknown, _value: unknown, callback) {
  const { contentMin, contentMax } = newFormInline.value;
  if (contentMin == null || contentMax == null || contentMax >= contentMin) {
    callback();
    return;
  }
  callback(new Error("正文上限不能小于下限"));
}

function validateTagRange(_rule: unknown, _value: unknown, callback) {
  const { tagMin, tagMax } = newFormInline.value;
  if (tagMin == null || tagMax == null || tagMax >= tagMin) {
    callback();
    return;
  }
  callback(new Error("标签上限不能小于下限"));
}

const formRules: FormRules = {
  code: [
    { required: true, message: "平台代码为必填项", trigger: "blur" },
    {
      pattern: /^[a-z0-9][a-z0-9_-]*$/,
      message: "仅支持小写字母、数字、下划线和短横线，且需以字母或数字开头",
      trigger: "blur"
    },
    { max: 32, message: "最多 32 个字符", trigger: "blur" }
  ],
  name: [
    { required: true, message: "平台名称为必填项", trigger: "blur" },
    { max: 64, message: "最多 64 个字符", trigger: "blur" }
  ],
  assetType: [{ required: true, message: "素材类型为必选项", trigger: "blur" }],
  titleMax: [{ required: true, message: "标题上限为必填项", trigger: "blur" }],
  contentMin: [
    { required: true, message: "正文下限为必填项", trigger: "blur" }
  ],
  contentMax: [
    { required: true, message: "正文上限为必填项", trigger: "blur" },
    { validator: validateContentRange, trigger: "blur" }
  ],
  tagMin: [{ required: true, message: "标签下限为必填项", trigger: "blur" }],
  tagMax: [
    { required: true, message: "标签上限为必填项", trigger: "blur" },
    { validator: validateTagRange, trigger: "blur" }
  ],
  sortOrder: [{ required: true, message: "排序为必填项", trigger: "blur" }]
};
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="82px"
  >
    <el-form-item label="平台代码" prop="code">
      <el-input
        v-model.trim="newFormInline.code"
        :disabled="isEdit"
        clearable
        maxlength="32"
        placeholder="请输入平台代码，如 douyin"
      />
    </el-form-item>

    <el-form-item label="平台名称" prop="name">
      <el-input
        v-model.trim="newFormInline.name"
        clearable
        maxlength="64"
        placeholder="请输入平台名称，如 抖音"
      />
    </el-form-item>

    <el-form-item label="素材类型" prop="assetType">
      <ReSelect
        v-model="newFormInline.assetType"
        placeholder="请选择素材类型"
        :options="ASSET_TYPE_OPTIONS"
      />
    </el-form-item>

    <el-form-item label="标题上限" prop="titleMax">
      <el-input-number
        v-model="newFormInline.titleMax"
        :min="0"
        :max="200"
        :step="1"
        controls-position="right"
        placeholder="请输入标题字数上限"
      />
    </el-form-item>

    <el-form-item label="正文下限" prop="contentMin">
      <el-input-number
        v-model="newFormInline.contentMin"
        :min="0"
        :max="10000"
        :step="1"
        controls-position="right"
        placeholder="请输入正文字数下限"
      />
    </el-form-item>

    <el-form-item label="正文上限" prop="contentMax">
      <el-input-number
        v-model="newFormInline.contentMax"
        :min="0"
        :max="10000"
        :step="1"
        controls-position="right"
        placeholder="请输入正文字数上限"
      />
    </el-form-item>

    <el-form-item label="标签下限" prop="tagMin">
      <el-input-number
        v-model="newFormInline.tagMin"
        :min="0"
        :max="100"
        :step="1"
        controls-position="right"
        placeholder="请输入标签个数下限"
      />
    </el-form-item>

    <el-form-item label="标签上限" prop="tagMax">
      <el-input-number
        v-model="newFormInline.tagMax"
        :min="0"
        :max="100"
        :step="1"
        controls-position="right"
        placeholder="请输入标签个数上限"
      />
    </el-form-item>

    <el-form-item label="语气提示" prop="toneHint">
      <el-input
        v-model="newFormInline.toneHint"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        placeholder="会注入到平台提示词，例如：口语化、有画面感，避免营销腔"
      />
    </el-form-item>

    <el-form-item label="排序" prop="sortOrder">
      <el-input-number
        v-model="newFormInline.sortOrder"
        :min="0"
        :max="9999"
        :step="1"
        controls-position="right"
        placeholder="数值越小越靠前"
      />
    </el-form-item>

    <el-form-item label="状态" prop="enabled">
      <el-switch
        v-model="newFormInline.enabled"
        :active-value="1"
        :inactive-value="0"
        inline-prompt
        active-text="启用"
        inactive-text="停用"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="newFormInline.remark"
        type="textarea"
        :rows="2"
        maxlength="500"
        show-word-limit
        placeholder="请输入备注（选填）"
      />
    </el-form-item>
  </el-form>
</template>
