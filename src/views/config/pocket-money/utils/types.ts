export type RuleType = "BASE" | "BIRTHDAY";

interface FormItemProps {
  id?: string | number;
  ruleKey: string;
  ruleType: RuleType | string;
  ruleValue: number | string;
  description: string;
}

interface FormProps {
  formInline: FormItemProps;
  ruleKeyOptions?: string[];
  ruleTypeOptions?: { label: string; value: string }[];
}

export type { FormItemProps, FormProps };
