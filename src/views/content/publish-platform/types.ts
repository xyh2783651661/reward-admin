import type { PublishPlatform } from "@/api/publish-package";

/**
 * 平台表单模型。
 *
 * 列表/详情返回的实体带 id；新增时还没有 id，因此这里把 id 放宽为可选。
 * 其余字段与 `PublishPlatform` 保持一致，避免表单和接口契约各写一份。
 */
export type PublishPlatformFormData = Omit<PublishPlatform, "id"> & {
  id?: number;
};

/** 素材类型：决定平台消费图文包还是视频包 */
export const ASSET_TYPE_LABELS: Record<string, string> = {
  image: "图文",
  video: "视频"
};

export const ASSET_TYPE_OPTIONS = [
  { label: "图文", value: "image" },
  { label: "视频", value: "video" }
];

export const ENABLED_OPTIONS = [
  { label: "启用", value: "1" },
  { label: "停用", value: "0" }
];

/** 平台代码对应的文案生成提示词模板 code */
export function promptCodeOf(platformCode?: string | null) {
  return `content.publish.copy.${platformCode || "{code}"}`;
}
