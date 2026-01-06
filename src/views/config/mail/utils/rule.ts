import type { FormRules } from "element-plus";
import { reactive } from "vue";

export const formRules = reactive<FormRules>({
  email: [
    { required: true, message: "邮箱为必填项", trigger: "blur" },
    {
      type: "email",
      message: "请输入正确的邮箱格式",
      trigger: ["blur", "change"]
    }
  ],
  name: [{ required: true, message: "姓名为必填项", trigger: "blur" }],
  type: [{ required: true, message: "类型为必选项", trigger: "change" }],
  priority: [{ required: true, message: "优先级为必选项", trigger: "change" }]
});
