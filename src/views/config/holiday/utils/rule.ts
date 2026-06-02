import { reactive } from "vue";
import type { FormRules } from "element-plus";

export const formRules = reactive<FormRules>({
  holidayName: [
    {
      required: true,
      message: "节假日名称为必填项",
      trigger: "blur"
    },
    {
      validator: (_rule, value, callback) => {
        const name = String(value ?? "").trim();

        if (!name) {
          callback(new Error("节假日名称为必填项"));
          return;
        }

        if (name.length > 64) {
          callback(new Error("节假日名称长度不能超过 64 个字符"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  holidayType: [
    {
      required: true,
      message: "节假日类型为必选项",
      trigger: "change"
    }
  ],
  lunarMonth: [
    {
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === "") {
          callback();
          return;
        }

        const month = Number(value);

        if (isNaN(month) || month < 1 || month > 12) {
          callback(new Error("农历月份范围为 1-12"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  lunarDay: [
    {
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === "") {
          callback();
          return;
        }

        const day = Number(value);

        if (isNaN(day) || day < 1 || day > 30) {
          callback(new Error("农历日期范围为 1-30"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  sortOrder: [
    {
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === "") {
          callback();
          return;
        }

        const order = Number(value);

        if (isNaN(order) || order < 0 || !Number.isInteger(order)) {
          callback(new Error("排序必须为非负整数"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ],
  description: [
    {
      validator: (_rule, value, callback) => {
        if (value && String(value).length > 255) {
          callback(new Error("描述长度不能超过 255 个字符"));
          return;
        }

        callback();
      },
      trigger: "blur"
    }
  ]
});
