import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  date: [{ required: true, message: "日期为必填项", trigger: "change" }],
  text: [{ required: true, message: "内容为必填项", trigger: "blur" }]
});
