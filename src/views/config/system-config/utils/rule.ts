import { reactive } from "vue";
import type { FormRules } from "element-plus";
import type { SystemConfigValueType } from "./types";

/** 与后端 ValueType 枚举保持一致（后端含 long，这里漏了会导致选 long 时被判为非法） */
const valueTypes: SystemConfigValueType[] = [
  "string",
  "int",
  "long",
  "double",
  "boolean",
  "json"
];

/** 后端 boolean 接受的真值写法（ValueType#validate） */
const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);
/** 后端 boolean 接受的假值写法 */
const FALSE_VALUES = new Set(["false", "0", "no", "n", "off"]);

/**
 * 把任意合法布尔写法归一化为 "true" / "false"，无法识别时返回空串。
 * <p>
 * 库里存量值可能是 1 / 0 / yes / on（后端都当布尔认），
 * 表单用单选控件展示前必须先归一化，否则会被误显示成未选中。
 */
export function normalizeBooleanValue(value: string): "true" | "false" | "" {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (TRUE_VALUES.has(normalized)) return "true";
  if (FALSE_VALUES.has(normalized)) return "false";
  return "";
}

/**
 * 判断某个配置值能否被指定值类型接收（只看格式，不看业务取值）。
 * <p>
 * 用户切换「值类型」时用它决定原值还能不能留：
 * 留着不兼容的值，控件会显示为空而底层仍有脏数据，用户以为已经清空、保存时却被拦。
 */
export function isConfigValueCompatible(
  valueType: SystemConfigValueType | "",
  value: string
): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return true;

  switch (valueType) {
    case "int":
    case "long":
      return /^-?\d+$/.test(raw);
    case "double":
      return Number.isFinite(Number(raw));
    case "boolean":
      return normalizeBooleanValue(raw) !== "";
    case "json":
      return raw.startsWith("{") || raw.startsWith("[");
    default:
      return true;
  }
}

/**
 * 按值类型生成「配置值」的校验规则。
 * <p>
 * 后端保存时会用 ValueType 再校验一次，这里对齐它的判定口径，
 * 目的是让不匹配的值在点确定之前就被拦住，而不是等接口报错。
 * 空值一律放行——后端对空配置值同样放行（表示未设置）。
 */
export function buildConfigValueRules(
  valueType: SystemConfigValueType | ""
): FormRules[string] {
  return [
    {
      validator: (_rule, value, callback) => {
        const raw = String(value ?? "").trim();
        if (!raw) {
          callback();
          return;
        }

        switch (valueType) {
          case "int": {
            // 后端用 Integer.parseInt，只认十进制整数串；"1e3" 这类必须拦下
            if (!/^-?\d+$/.test(raw)) {
              callback(new Error("值类型为整数，请填写整数（如 10、-3）"));
              return;
            }
            const num = Number(raw);
            if (num > 2147483647 || num < -2147483648) {
              callback(
                new Error(
                  "超出 int 范围（-2147483648 ~ 2147483647），需要更大范围请改用 long"
                )
              );
              return;
            }
            break;
          }
          case "long": {
            if (!/^-?\d+$/.test(raw)) {
              callback(new Error("值类型为长整数，请填写不带小数的整数"));
              return;
            }
            break;
          }
          case "double": {
            // 后端用 Double.parseDouble，支持 1e3 / .5 这类写法
            if (!Number.isFinite(Number(raw))) {
              callback(new Error("值类型为小数，请填写数字（如 0.75）"));
              return;
            }
            break;
          }
          case "boolean": {
            if (!normalizeBooleanValue(raw)) {
              callback(new Error("值类型为布尔，请选择 true 或 false"));
              return;
            }
            break;
          }
          default:
            break;
        }

        callback();
      },
      trigger: ["blur", "change"]
    }
  ];
}

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
