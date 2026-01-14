import type { FormRules } from "element-plus";
import { reactive } from "vue";
import { isPhone } from "@pureadmin/utils";

const phoneValidator = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error("手机号为必填项"));
  } else if (!isPhone(value)) {
    callback(new Error("请输入正确的11位手机号"));
  } else {
    callback();
  }
};

export const formRules = reactive<FormRules>({
  nickName: [{ required: true, message: "昵称为必填项", trigger: "blur" }],
  phone: [{ validator: phoneValidator, trigger: "blur" }],
  birthday: [{ required: true, message: "生日为必填项", trigger: "blur" }]
});
