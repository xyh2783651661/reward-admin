import { reactive } from "vue";
import type { FormRules } from "element-plus";

/** 自定义表单规则校验 */
export const formRules = reactive(<FormRules>{
  name: [{ required: true, message: "科目为必填项", trigger: "blur" }],
  type: [{ required: true, message: "类型为必填项", trigger: "blur" }],
  base: [{ required: true, message: "基础数值为必填项", trigger: "blur" }],
  excellence: [
    { required: true, message: "卓越数值为必填项", trigger: "blur" }
  ],
  full: [{ required: true, message: "满分数值为必填项", trigger: "blur" }]
});
