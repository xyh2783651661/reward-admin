import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive(<FormRules>{
  title: [{ required: true, message: "标题为必填项", trigger: "blur" }],
  content: [{ required: true, message: "内容为必填项", trigger: "blur" }],
  noticeType: [
    { required: true, message: "公告类型为必填项", trigger: "change" }
  ],
  priority: [{ required: true, message: "优先级为必填项", trigger: "change" }]
});
