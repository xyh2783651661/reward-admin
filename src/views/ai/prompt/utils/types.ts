// 提示词分类（与 schema 注释保持一致，可扩展）
export const PROMPT_CATEGORIES = [
  { value: "email", label: "邮件" },
  { value: "reward", label: "奖励/成绩" },
  { value: "content", label: "内容生成" },
  { value: "system", label: "系统" },
  { value: "test", label: "测试" }
] as const;

// 输出格式
export const CONTENT_FORMATS = [
  { value: "text", label: "纯文本" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" }
] as const;

// 语言
export const LANGUAGES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "bilingual", label: "中英双语" }
] as const;

// 状态：1启用 0禁用
export const STATUS_OPTIONS = [
  { value: 1, label: "启用" },
  { value: 0, label: "禁用" }
] as const;

// 内置标识：1内置 0用户自建
export const BUILTIN_OPTIONS = [
  { value: 1, label: "内置" },
  { value: 0, label: "用户自建" }
] as const;

export const STATUS_MAP: Record<number, { label: string; tag: string }> = {
  1: { label: "启用", tag: "success" },
  0: { label: "禁用", tag: "info" }
};
