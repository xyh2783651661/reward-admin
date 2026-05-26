import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  title: [{ required: true, message: "标题为必填项", trigger: "blur" }],
  anniversaryDate: [
    { required: true, message: "日期为必填项", trigger: "change" }
  ]
});
