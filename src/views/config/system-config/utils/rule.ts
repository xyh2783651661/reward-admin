import { reactive } from "vue";
import type { FormRules } from "element-plus";
import type { SystemConfigValueType } from "./types";

const valueTypes: SystemConfigValueType[] = [
  "string",
  "int",
  "double",
  "boolean",
  "json"
];

export const formRules = reactive<FormRules>({
  configKey: [
    {
      validator: (_rule, value, callback) => {
        const configKey = String(value ?? "").trim();

        if (!configKey) {
          callback(new Error("配置 Key 为必填项"));
          return;
        }

        if (configKey.length > 128) {
          callback(new Error("配置 Key 长度不能超过 128 个字符"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  configGroup: [
    {
      validator: (_rule, value, callback) => {
        const configGroup = String(value ?? "").trim();

        if (configGroup.length > 64) {
          callback(new Error("配置分组长度不能超过 64 个字符"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  valueType: [
    { required: true, message: "值类型为必选项", trigger: "change" },
    {
      validator: (_rule, value, callback) => {
        if (!valueTypes.includes(value as SystemConfigValueType)) {
          callback(new Error("值类型不合法"));
          return;
        }

        callback();
      },
      trigger: "change"
    }
  ]
});
