<script setup lang="ts">
import { ref, onMounted } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import { getRewardUserList } from "@/api/system";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    targetUserId: "",
    sendDate: "",
    enabled: 1,
    remark: ""
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const userOptions = ref<{ id: number; nickName: string }[]>([]);

onMounted(async () => {
  try {
    const { data } = await getRewardUserList({});
    userOptions.value = (data ?? []) as { id: number; nickName: string }[];
  } catch {
    userOptions.value = [];
  }
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
    label-width="92px"
  >
    <el-form-item label="目标用户" prop="targetUserId">
      <el-select
        v-model="newFormInline.targetUserId"
        filterable
        clearable
        placeholder="请选择目标用户"
        class="w-full!"
      >
        <el-option
          v-for="u in userOptions"
          :key="u.id"
          :label="u.nickName"
          :value="u.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="发送日期" prop="sendDate">
      <el-date-picker
        v-model="newFormInline.sendDate"
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY-MM-DD"
        clearable
        placeholder="留空表示每天发送"
        class="w-full!"
      />
    </el-form-item>

    <el-form-item label="状态" prop="enabled">
      <el-switch
        v-model="newFormInline.enabled"
        :active-value="1"
        :inactive-value="0"
        active-text="已启用"
        inactive-text="已禁用"
        class="ml-2"
        inline-prompt
        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="newFormInline.remark"
        type="textarea"
        :rows="3"
        placeholder="请输入备注信息"
      />
    </el-form-item>
  </el-form>
</template>
