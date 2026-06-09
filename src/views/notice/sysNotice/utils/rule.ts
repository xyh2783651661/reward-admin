import { reactive } from "vue";
import type { FormRules } from "element-plus";

function validatePlatformMask(_rule, value, callback: (error?: Error) => void) {
  if (!Array.isArray(value) || value.length === 0) {
    callback(new Error("目标平台至少选择一项"));
    return;
  }

  callback();
}

export const formRules = reactive(<FormRules>{
  title: [
    { required: true, message: "公告标题为必填项", trigger: "blur" },
    {
      min: 2,
      max: 60,
      message: "标题长度需在 2-60 个字符之间",
      trigger: "blur"
    }
  ],
  content: [
    { required: true, message: "公告内容为必填项", trigger: "blur" },
    {
      min: 4,
      max: 500,
      message: "内容长度需在 4-500 个字符之间",
      trigger: "blur"
    }
  ],
  noticeType: [
    { required: true, message: "公告类型为必填项", trigger: "change" }
  ],
  priority: [{ required: true, message: "优先级为必填项", trigger: "change" }],
  platformMask: [{ validator: validatePlatformMask, trigger: "change" }]
});
