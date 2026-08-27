import type { FormRules } from "element-plus";
import { reactive } from "vue";

export const formRules = reactive<FormRules>({
  targetUserId: [
    {
      required: true,
      validator: (_rule, value, callback) => {
        if (value === "" || value === null || value === undefined) {
          callback(new Error("请选择目标用户"));
        } else {
          callback();
        }
      },
      trigger: "change"
    }
  ],
  enabled: [{ required: true, message: "请选择状态", trigger: "change" }]
});
