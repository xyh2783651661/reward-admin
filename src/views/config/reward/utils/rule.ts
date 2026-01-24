import { reactive } from "vue";
import type { FormRules } from "element-plus";

/** 自定义表单规则校验 */
export const formRules = reactive(<FormRules>{
  rewardKey: [{ required: true, message: "KEY为必填项", trigger: "blur" }],
  rewardValue: [{ required: true, message: "数值为必填项", trigger: "blur" }],
  description: [{ required: true, message: "标签为必填项", trigger: "blur" }],
  condition: [{ required: true, message: "条件为必填项", trigger: "blur" }],
  rewardType: [{ required: true, message: "类型为必填项", trigger: "blur" }]
});
