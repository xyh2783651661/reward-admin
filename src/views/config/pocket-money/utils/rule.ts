import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  ruleKey: [
    { required: true, message: "规则标识为必填项", trigger: "blur" },
    {
      pattern: /^[A-Z0-9_]+$/,
      message: "规则标识只能包含大写字母、数字和下划线",
      trigger: "blur"
    }
  ],
  ruleType: [{ required: true, message: "规则类型为必填项", trigger: "blur" }],
  ruleValue: [{ required: true, message: "金额数值为必填项", trigger: "blur" }],
  description: [
    { required: true, message: "规则描述为必填项", trigger: "blur" }
  ]
});
