<script setup lang="ts">
import { computed, ref } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    title: "",
    content: "",
    noticeType: 2,
    priority: 5,
    platformMask: [1] as number[],
    minVersion: "",
    publishTime: "",
    offlineTime: "",
    operator: "",
    status: 0
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);

const platformMaskArray = computed({
  get: () => {
    const value = newFormInline.value.platformMask;

    if (Array.isArray(value)) return value.map(Number);
    if (typeof value === "number" || typeof value === "string") {
      const numericValue = Number(value);
      const result: number[] = [];

      if (numericValue & 1) result.push(1);
      if (numericValue & 2) result.push(2);
      if (numericValue & 4) result.push(4);

      return result;
    }

    return [];
  },
  set: (value: number[]) => {
    newFormInline.value.platformMask = value;
  }
});

const priorityTip = computed(() => {
  const priority = Number(newFormInline.value.priority);
  if (priority >= 9)
    return "紧急公告会以最高视觉优先级出现在通知中心，请谨慎使用。";
  if (priority >= 7) return "警告公告适合维护、异常、风险类通知。";
  return "普通/信息公告适合版本更新、配置同步等常规内容。";
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
    label-width="96px"
    class="notice-form"
  >
    <section class="notice-form-section">
      <div class="notice-section-title">
        <span>基础信息</span>
        <small>决定用户在通知中心看到的标题与摘要</small>
      </div>

      <el-form-item label="公告标题" prop="title">
        <el-input
          v-model="newFormInline.title"
          maxlength="60"
          show-word-limit
          clearable
          placeholder="例如：系统升级维护通知"
        />
      </el-form-item>

      <el-form-item label="公告内容" prop="content">
        <el-input
          v-model="newFormInline.content"
          type="textarea"
          maxlength="500"
          show-word-limit
          :rows="5"
          placeholder="请说明公告背景、影响范围、用户需要关注或执行的动作"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="公告类型" prop="noticeType">
            <el-radio-group v-model="newFormInline.noticeType">
              <el-radio-button :value="1">功能更新</el-radio-button>
              <el-radio-button :value="2">系统公告</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级" prop="priority">
            <el-select
              v-model="newFormInline.priority"
              placeholder="请选择优先级"
              class="w-full!"
            >
              <el-option label="信息" :value="4" />
              <el-option label="普通" :value="5" />
              <el-option label="警告" :value="7" />
              <el-option label="紧急" :value="9" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-alert :title="priorityTip" type="info" show-icon :closable="false" />
    </section>

    <section class="notice-form-section">
      <div class="notice-section-title">
        <span>投放策略</span>
        <small>按平台和最低版本控制公告可见范围</small>
      </div>

      <el-form-item label="目标平台" prop="platformMask">
        <el-checkbox-group
          v-model="platformMaskArray"
          class="platform-checkboxes"
        >
          <el-checkbox-button :value="1">Web</el-checkbox-button>
          <el-checkbox-button :value="2">Android</el-checkbox-button>
          <el-checkbox-button :value="4">iOS</el-checkbox-button>
        </el-checkbox-group>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最低版本" prop="minVersion">
            <el-input
              v-model="newFormInline.minVersion"
              clearable
              placeholder="留空表示全版本可见，例如 1.0.0"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="操作人" prop="operator">
            <el-input
              v-model="newFormInline.operator"
              clearable
              placeholder="留空则由后端记录当前用户"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </section>

    <section class="notice-form-section">
      <div class="notice-section-title">
        <span>生命周期</span>
        <small>发布时间与下线时间会影响顶部通知中心展示</small>
      </div>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="发布时间" prop="publishTime">
            <el-date-picker
              v-model="newFormInline.publishTime"
              type="datetime"
              placeholder="不填则由发布动作决定"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="下线时间" prop="offlineTime">
            <el-date-picker
              v-model="newFormInline.offlineTime"
              type="datetime"
              placeholder="不填表示长期有效"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </section>
  </el-form>
</template>

<style lang="scss" scoped>
.notice-form {
  .notice-form-section {
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;

    & + .notice-form-section {
      margin-top: 14px;
    }
  }

  .notice-section-title {
    display: flex;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 14px;

    span {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    small {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .platform-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.el-checkbox-button__inner) {
    border-left: var(--el-border);
    border-radius: 8px;
  }

  :deep(.el-checkbox-button:first-child .el-checkbox-button__inner),
  :deep(.el-checkbox-button:last-child .el-checkbox-button__inner) {
    border-radius: 8px;
  }
}
</style>
