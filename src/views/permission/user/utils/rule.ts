import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive<FormRules>({
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }]
});
