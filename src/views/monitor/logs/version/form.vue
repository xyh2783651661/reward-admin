<script setup lang="ts">
import { ref } from "vue";

interface ReleaseFormProps {
  formInline?: {
    id?: number;
    versionName?: string;
    rolloutPercentage?: number;
    forceUpdate?: string;
    minClientVersionCode?: number;
    releaseNotes?: string;
  };
}

const props = withDefaults(defineProps<ReleaseFormProps>(), {
  formInline: () => ({
    rolloutPercentage: 0,
    forceUpdate: "OPTIONAL",
    minClientVersionCode: undefined,
    releaseNotes: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef, getFormData: () => newFormInline.value });
</script>

<template>
  <el-form ref="ruleFormRef" :model="newFormInline" label-width="110px">
    <el-form-item label="版本">
      <span>{{ newFormInline.versionName || "-" }}</span>
    </el-form-item>
    <el-form-item label="灰度放量">
      <div class="w-full">
        <el-slider
          v-model="newFormInline.rolloutPercentage"
          :min="0"
          :max="100"
          :step="5"
          show-input
        />
        <div class="tip">
          0 未放量，100 全量。仅 BETA 状态按此比例灰度命中。
        </div>
      </div>
    </el-form-item>
    <el-form-item label="强制策略">
      <el-radio-group v-model="newFormInline.forceUpdate">
        <el-radio value="OPTIONAL">可选</el-radio>
        <el-radio value="RECOMMENDED">推荐</el-radio>
        <el-radio value="FORCE">强制</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="最低兼容版本">
      <el-input-number
        v-model="newFormInline.minClientVersionCode"
        :min="0"
        :controls="false"
        placeholder="低于此 versionCode 必须升级"
        class="w-full!"
      />
    </el-form-item>
    <el-form-item label="更新日志">
      <el-input
        v-model="newFormInline.releaseNotes"
        type="textarea"
        :rows="4"
        placeholder="更新日志（Markdown，可留空不修改）"
      />
    </el-form-item>
  </el-form>
</template>

<style scoped>
.tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
