<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { usePublicHooks } from "@/hooks/usePublicHooks";

type SwitchValue = number | boolean | string;

export interface StatusSwitchChangePayload<Row = any> {
  row: Row;
  index: number;
  /** 切换后的目标值（此时 modelValue 尚未变更） */
  value: SwitchValue;
  /**
   * 请求结束后必须调用：ok=true 才真正切换开关；
   * ok=false 时开关保持原值，若传入 error 则弹出错误提示
   */
  next: (ok: boolean, error?: unknown) => void;
}

interface Props {
  modelValue: SwitchValue;
  row?: any;
  index?: number;
  activeValue?: SwitchValue;
  inactiveValue?: SwitchValue;
  activeText?: string;
  inactiveText?: string;
  size?: "small" | "default" | "large";
  disabled?: boolean;
  /** 传了才二次确认，支持 HTML 片段 */
  confirmTitle?: string;
  onChange?: (payload: StatusSwitchChangePayload) => void | Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  index: 0,
  activeValue: 1,
  inactiveValue: 0,
  activeText: "已启用",
  inactiveText: "已停用",
  size: "default",
  disabled: false
});

const emit = defineEmits<{
  (e: "update:modelValue", value: SwitchValue): void;
}>();

const { switchStyle } = usePublicHooks();
const pending = ref(false);

const innerValue = computed({
  get: () => props.modelValue,
  set: value => emit("update:modelValue", value)
});

async function confirmToggle(): Promise<boolean> {
  if (!props.confirmTitle) return true;
  try {
    await ElMessageBox.confirm(props.confirmTitle, "系统提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
      dangerouslyUseHTMLString: true,
      draggable: true
    });
    return true;
  } catch {
    return false;
  }
}

function beforeChange(): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    void (async () => {
      if (!(await confirmToggle())) {
        resolve(false);
        return;
      }
      if (!props.onChange) {
        resolve(true);
        return;
      }

      const target =
        props.modelValue === props.activeValue
          ? props.inactiveValue
          : props.activeValue;

      pending.value = true;
      let settled = false;
      const next = (ok: boolean, error?: unknown) => {
        if (settled) return;
        settled = true;
        pending.value = false;
        if (!ok && error !== undefined) {
          message(getErrorMessage(error, "状态更新失败"), { type: "error" });
        }
        resolve(ok);
      };

      try {
        const result = props.onChange({
          row: props.row,
          index: props.index,
          value: target,
          next
        });
        // 回调返回 Promise 且未显式调用 next 时，视 resolve 为成功
        if (result && typeof (result as Promise<void>).then === "function") {
          await result;
          if (!settled) next(true);
        }
      } catch (error) {
        next(false, error);
      }
    })();
  });
}
</script>

<template>
  <el-switch
    v-model="innerValue"
    :size="size"
    :loading="pending"
    :disabled="disabled"
    :active-value="activeValue"
    :inactive-value="inactiveValue"
    :active-text="activeText"
    :inactive-text="inactiveText"
    :before-change="beforeChange"
    :style="switchStyle"
    inline-prompt
  />
</template>
