<script setup lang="ts">
import { computed, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";
import { promptCodeOf } from "./types";
import type { PublishPlatformFormData } from "./types";

const props = defineProps<{
  formInline: PublishPlatformFormData;
  isEdit: boolean;
}>();

const ruleFormRef = ref<FormInstance>();
const form = ref(props.formInline);

const promptCode = computed(() => promptCodeOf(form.value.code));

const { update } = useCopyToClipboard();

function copyPromptCode() {
  update(promptCode.value);
  message("提示词编码已复制", { type: "success" });
}

/** 正文/标签上下限必须有序，否则提示词里的约束会自相矛盾 */
function validateContentRange(_rule: unknown, _value: unknown, callback) {
  if (
    form.value.contentMin == null ||
    form.value.contentMax == null ||
    form.value.contentMax >= form.value.contentMin
  ) {
    callback();
    return;
  }
  callback(new Error("正文上限不能小于下限"));
}

function validateTagRange(_rule: unknown, _value: unknown, callback) {
  if (
    form.value.tagMin == null ||
    form.value.tagMax == null ||
    form.value.tagMax >= form.value.tagMin
  ) {
    callback();
    return;
  }
  callback(new Error("标签上限不能小于下限"));
}

const rules: FormRules = {
  code: [
    { required: true, message: "请输入平台代码", trigger: "blur" },
    {
      pattern: /^[a-z0-9][a-z0-9_-]*$/,
      message: "仅支持小写字母、数字、下划线和短横线，且需以字母或数字开头",
      trigger: "blur"
    },
    { max: 32, message: "最多 32 个字符", trigger: "blur" }
  ],
  name: [
    { required: true, message: "请输入平台名称", trigger: "blur" },
    { max: 64, message: "最多 64 个字符", trigger: "blur" }
  ],
  assetType: [{ required: true, message: "请选择素材类型", trigger: "change" }],
  titleMax: [{ required: true, message: "请输入标题上限", trigger: "change" }],
  contentMin: [
    { required: true, message: "请输入正文下限", trigger: "change" }
  ],
  contentMax: [
    { required: true, message: "请输入正文上限", trigger: "change" },
    { validator: validateContentRange, trigger: "change" }
  ],
  tagMin: [{ required: true, message: "请输入标签下限", trigger: "change" }],
  tagMax: [
    { required: true, message: "请输入标签上限", trigger: "change" },
    { validator: validateTagRange, trigger: "change" }
  ],
  sortOrder: [{ required: true, message: "请输入排序号", trigger: "change" }]
};

async function validate() {
  if (!ruleFormRef.value) return false;
  try {
    await ruleFormRef.value.validate();
    return true;
  } catch {
    return false;
  }
}

defineExpose({ validate });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="form"
    :rules="rules"
    label-width="108px"
    class="platform-form"
  >
    <el-alert
      v-if="!isEdit"
      type="info"
      :closable="false"
      show-icon
      class="mb-4!"
      title="新增平台后还需要配置提示词"
    >
      <template #default>
        请到「AI 提示词」确认存在
        <code class="prompt-code">{{ promptCode }}</code>
        模板，否则该平台生成文案时会失败。
      </template>
    </el-alert>
    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      class="mb-4!"
      title="平台配置会直接影响文案生成"
    >
      <template #default>
        字数和标签约束会注入到该平台的提示词里；修改后建议重新生成一次文案验证效果。
      </template>
    </el-alert>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="平台代码" prop="code">
          <el-input
            v-model.trim="form.code"
            :disabled="isEdit"
            maxlength="32"
            placeholder="如 douyin"
          />
          <div class="field-tip">
            同时用于提示词模板
            <code>{{ promptCode }}</code>
            <el-button link type="primary" size="small" @click="copyPromptCode">
              复制编码
            </el-button>
          </div>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="平台名称" prop="name">
          <el-input
            v-model.trim="form.name"
            maxlength="64"
            placeholder="如 抖音"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="素材类型" prop="assetType">
          <el-radio-group v-model="form.assetType">
            <el-radio-button value="image">图文</el-radio-button>
            <el-radio-button value="video">视频</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="启用状态" prop="enabled">
          <div class="flex items-center gap-2">
            <el-switch
              v-model="form.enabled"
              :active-value="1"
              :inactive-value="0"
            />
            <el-text type="info" size="small">
              {{ form.enabled === 1 ? "启用后参与生成" : "停用后不参与生成" }}
            </el-text>
          </div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">文案约束</el-divider>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="标题上限" prop="titleMax">
          <el-input-number
            v-model="form.titleMax"
            :min="0"
            :max="200"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">单位：字</div>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="正文下限" prop="contentMin">
          <el-input-number
            v-model="form.contentMin"
            :min="0"
            :max="10000"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">单位：字</div>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="正文上限" prop="contentMax">
          <el-input-number
            v-model="form.contentMax"
            :min="0"
            :max="10000"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">单位：字</div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="标签下限" prop="tagMin">
          <el-input-number
            v-model="form.tagMin"
            :min="0"
            :max="100"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">单位：个</div>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="标签上限" prop="tagMax">
          <el-input-number
            v-model="form.tagMax"
            :min="0"
            :max="100"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">单位：个</div>
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="排序号" prop="sortOrder">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="9999"
            controls-position="right"
            class="w-full!"
          />
          <div class="field-tip">升序，数字越小越靠前</div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="语气提示" prop="toneHint">
      <el-input
        v-model="form.toneHint"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        placeholder="会注入到平台提示词，例如：口语化、有画面感，避免营销腔"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="form.remark"
        type="textarea"
        :rows="2"
        maxlength="500"
        show-word-limit
        placeholder="可选：记录该平台的发布限制、账号说明等"
      />
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.platform-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-divider) {
    margin: 4px 0 18px;
  }

  :deep(.el-divider__text) {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.field-tip {
  width: 100%;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);

  code {
    padding: 0 4px;
    font-family: var(--el-font-family-mono, monospace);
    color: var(--el-color-primary);
    background: var(--el-fill-color-light);
    border-radius: 3px;
  }
}

.prompt-code {
  padding: 1px 4px;
  font-family: var(--el-font-family-mono, monospace);
  background: var(--el-fill-color-light);
  border-radius: 3px;
}
</style>
