/**
 * AI 供应商静态元数据。
 *
 * 与后端 `org.xyh.modules.ai.api.dto.AiProvider` 枚举逐项对齐，
 * `configName` 规则与后端 `AiProvider#configName()` 相同：
 * 枚举名小写 + 下划线转中划线，唯一例外是 `QIAN_WEN → qwen`（历史配置沿用 qwen 前缀）。
 *
 * 后端新增/下线供应商时，这里必须同步，否则系统配置页无法把
 * `ai.<config-name>.model` 反查回供应商。
 */
export interface AiProviderMeta {
  /** 枚举名，后端接口使用该值 */
  provider: string;
  /** 中文展示名 */
  label: string;
  /** sys_config 中 `ai.<configName>.model` 的 configName */
  configName: string;
  /** 后端枚举 enabled 标记，false 表示暂未接入 */
  enabled: boolean;
}

/** 模型能力标签，与后端 `AiModelCapability` 对齐 */
export type AiModelCapability =
  | "TEXT"
  | "VISION"
  | "REASONING"
  | "EMBEDDING"
  | "RERANK"
  | "IMAGE_GENERATION";

export interface AiCapabilityMeta {
  value: AiModelCapability;
  label: string;
  /** el-tag 类型 */
  tagType: "success" | "info" | "warning" | "danger" | "primary";
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    provider: "XING_HUO",
    label: "讯飞星火",
    configName: "xing-huo",
    enabled: true
  },
  {
    provider: "QIAN_WEN",
    label: "阿里千问",
    configName: "qwen",
    enabled: true
  },
  { provider: "ZHI_PU", label: "智谱", configName: "zhi-pu", enabled: true },
  {
    provider: "DEEP_SEEK",
    label: "DeepSeek",
    configName: "deep-seek",
    enabled: true
  },
  {
    provider: "DOU_BAO",
    label: "字节豆包",
    configName: "dou-bao",
    enabled: true
  },
  {
    provider: "HUN_YUAN",
    label: "腾讯混元",
    configName: "hun-yuan",
    enabled: true
  },
  {
    provider: "YUE_ZHI_AN_MIAN",
    label: "月之暗面",
    configName: "yue-zhi-an-mian",
    enabled: true
  },
  {
    provider: "BAI_DU",
    label: "百度文心",
    configName: "bai-du",
    enabled: true
  },
  {
    provider: "BAI_CHUAN",
    label: "百川智能",
    configName: "bai-chuan",
    enabled: false
  },
  {
    provider: "LING_YI_WAN_WU",
    label: "零一万物",
    configName: "ling-yi-wan-wu",
    enabled: false
  },
  {
    provider: "MINI_MAX",
    label: "MiniMax",
    configName: "mini-max",
    enabled: true
  },
  {
    provider: "SHANG_TANG",
    label: "商汤日日新",
    configName: "shang-tang",
    enabled: true
  },
  {
    provider: "JIE_YUE_XING_CHEN",
    label: "阶跃星辰",
    configName: "jie-yue-xing-chen",
    enabled: true
  },
  {
    provider: "SILICON_FLOW",
    label: "硅基流动",
    configName: "silicon-flow",
    enabled: true
  }
];

export const AI_CAPABILITIES: AiCapabilityMeta[] = [
  { value: "TEXT", label: "文本对话", tagType: "primary" },
  { value: "VISION", label: "图片理解", tagType: "success" },
  { value: "REASONING", label: "推理", tagType: "warning" },
  { value: "EMBEDDING", label: "向量化", tagType: "info" },
  { value: "RERANK", label: "重排", tagType: "info" },
  { value: "IMAGE_GENERATION", label: "文生图", tagType: "danger" }
];

/** 图片理解场景使用的配置 key 与能力 */
export const AI_IMAGE_PROVIDER_KEY = "ai.image-understanding.provider";
export const AI_IMAGE_MODEL_KEY = "ai.image-understanding.model";
export const AI_IMAGE_PROVIDER_MODELS_KEY =
  "ai.image-understanding.provider-models";

/** `ai.<configName>.model` 形式的配置 key */
const PROVIDER_MODEL_KEY_PATTERN = /^ai\.([a-z0-9-]+)\.model$/;

export function findProviderMeta(
  provider?: string | null
): AiProviderMeta | undefined {
  if (!provider) return undefined;
  return AI_PROVIDERS.find(item => item.provider === provider);
}

/** 枚举名 → 中文名；未知供应商原样返回 */
export function getProviderLabel(provider?: string | null): string {
  if (!provider) return "-";
  return findProviderMeta(provider)?.label ?? provider;
}

export function findProviderByConfigName(
  configName?: string | null
): AiProviderMeta | undefined {
  if (!configName) return undefined;
  return AI_PROVIDERS.find(item => item.configName === configName);
}

export function getCapabilityLabel(capability?: string | null): string {
  if (!capability) return "-";
  return (
    AI_CAPABILITIES.find(item => item.value === capability)?.label ?? capability
  );
}

export function getCapabilityMeta(
  capability?: string | null
): AiCapabilityMeta | undefined {
  if (!capability) return undefined;
  return AI_CAPABILITIES.find(item => item.value === capability);
}

/**
 * 解析 `ai.<configName>.model` 配置 key。
 *
 * 无法识别为供应商模型 key 时返回 null（调用方按普通值处理）。
 */
export function parseProviderModelKey(configKey?: string | null): {
  configName: string;
  provider: AiProviderMeta;
} | null {
  if (!configKey) return null;
  const matched = PROVIDER_MODEL_KEY_PATTERN.exec(configKey.trim());
  if (!matched) return null;
  const provider = findProviderByConfigName(matched[1]);
  return provider ? { configName: matched[1], provider } : null;
}

/** 是否为需要模型下拉的配置 key（含图片理解场景） */
export function isModelConfigKey(configKey?: string | null): boolean {
  if (!configKey) return false;
  const key = configKey.trim();
  return (
    key === AI_IMAGE_MODEL_KEY ||
    key === AI_IMAGE_PROVIDER_MODELS_KEY ||
    parseProviderModelKey(key) !== null
  );
}

/** 供应商下拉选项（模型目录页 / 手工补录共用） */
export function buildProviderOptions() {
  return AI_PROVIDERS.map(item => ({
    value: item.provider,
    label: item.enabled ? item.label : `${item.label}（未接入）`
  }));
}

/** 能力多选选项 */
export function buildCapabilityOptions() {
  return AI_CAPABILITIES.map(item => ({
    value: item.value,
    label: item.label
  }));
}
