import { http } from "@/utils/http";
import type { ApiResult, ApiPageResult } from "./types";

/**
 * 发布平台配置。
 *
 * 平台是配置驱动而非硬编码枚举：新增渠道只需往 `publish_platform` 插一条记录
 * 并配套一条 `content.publish.{code}` 提示词，无需改代码发版。
 */
export type PublishPlatform = {
  id: number;
  code: string;
  name: string;
  /** 素材类型：image / video —— 决定该平台消费图文还是视频包。 */
  assetType: string;
  titleMax: number;
  contentMin: number;
  contentMax: number;
  tagMin: number;
  tagMax: number;
  /** 语气/风格提示，会注入提示词渲染。 */
  toneHint: string;
  enabled: number;
  sortOrder: number;
  remark?: string;
};

/** 每日发布内容包。 */
export type PublishPackage = {
  id: number;
  bizDate: string;
  title?: string;
  theme?: string;
  /** 选图方式：manual / ai / rule。 */
  selectMode: string;
  /** draft → generated → ready → published / failed。 */
  status: string;
  imageCount: number;
  confirmedBy?: number;
  confirmedTime?: string;
  remark?: string;
};

/** 包内图片关联。 */
export type PublishPackageImage = {
  id: number;
  packageId: number;
  dailyImageId: number;
  sortOrder: number;
  /** 视觉描述快照，生成文案时作为输入，避免再次回查。 */
  visionDigest?: string;
  /** 谁选的：manual / ai / rule。 */
  selectedBy?: string;
  selectReason?: string;
};

/** 单个平台的发布文案。 */
export type PublishPackageContent = {
  id: number;
  packageId: number;
  platformCode: string;
  title?: string;
  content?: string;
  tags?: string[];
  /** 版权署名行，有则附在正文末尾，无则留空不阻断发布。 */
  creditLine?: string;
  aiCallRecordId?: number;
  status?: string;
  /** 人工改过则为 1，重新生成默认跳过，避免覆盖。 */
  edited?: number;
  /**
   * 平台级发布状态：pending=待发布 / success=已发布 / failed=发布失败。
   * 与包级 status 分开是因为三个平台分别发布，包级状态表达不了部分成功。
   */
  publishStatus?: string;
  /** 发布结果说明，失败时记录原因。 */
  publishMessage?: string;
  publishTaskId?: string;
  publishTime?: string;
  externalUrl?: string;
  remark?: string;
};

/** 内容包详情。 */
export type PublishPackageDetail = PublishPackage & {
  images: PublishPackageImage[];
  contents: PublishPackageContent[];
};

/**
 * 内容包导出清单（机器可读）。
 *
 * 这是「发布」真正交付的产物描述：图片 + 各平台文案。
 * `images[].filePath` 与 ZIP 包内路径一一对应，`downloadUrl` 为图片原图链接。
 */
export type ExportImage = {
  /** 包内序号，从 1 开始，即发布顺序 */
  seq: number;
  imageId: number;
  /** ZIP 内相对路径，如 images/01-sunset.jpg */
  filePath: string;
  originalName?: string;
  width?: number;
  height?: number;
  visionDigest?: string;
  downloadUrl?: string;
};

export type ExportContent = {
  platformCode: string;
  platformName: string;
  assetType: string;
  title?: string;
  content?: string;
  tags?: string[];
  /** 版权署名行，可能为空——有则附加、无则跳过，不阻断发布 */
  creditLine?: string;
  copyFile?: string;
  edited?: number;
  status?: string;
};

export type PublishPackageExportVO = {
  packageId: number;
  bizDate: string;
  theme?: string;
  status: string;
  selectMode: string;
  exportedAt: string;
  images: ExportImage[];
  contents: ExportContent[];
};

/**
 * 单个平台在异步任务中的进度。
 *
 * status 约定：pending 待处理 / running 生成中 / success 已生成 /
 * failed 失败 / skipped 跳过（平台未启用，或人工改过且未强制重生成）。
 * skipped 与 failed 必须分开：前者不是错误，标红会误导。
 */
export type PlatformProgress = {
  code: string;
  name: string;
  status: string;
  message?: string;
};

/**
 * 发布类异步任务状态。
 *
 * 选图与文案生成都要调 LLM，是分钟级耗时，因此后端改为「提交任务 + 推进度」。
 * 任务状态存在后端内存中（保留 10 分钟），不落库——重启即丢失，
 * 但对「每天生成一次」的场景，重新提交的成本低于维护一张任务表。
 */
export type PublishTaskState = {
  taskId: string;
  /** PREPARE 选图 / GENERATE 文案生成 */
  type: string;
  packageId?: number;
  /** PENDING / RUNNING / SUCCESS / FAILED */
  status: string;
  /** 待处理总数：生成为平台数，选图为 1 */
  total: number;
  current: number;
  /** 面向用户的描述，如「正在生成 抖音 (2/4)」 */
  message?: string;
  platforms: PlatformProgress[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  /** 完成百分比，后端算好直接给前端用 */
  percent: number;
};

// ==================== 平台配置 ====================

/** 查询平台列表 */
export const getPublishPlatformList = (onlyEnabled?: boolean) => {
  return http.request<ApiResult<PublishPlatform[]>>(
    "get",
    "/api/publish-platforms",
    { params: onlyEnabled === undefined ? {} : { onlyEnabled } }
  );
};

/** 新增平台 */
export const createPublishPlatform = (data: Partial<PublishPlatform>) => {
  return http.request<ApiResult<PublishPlatform>>(
    "post",
    "/api/publish-platforms",
    { data }
  );
};

/** 修改平台 */
export const updatePublishPlatform = (
  id: number,
  data: Partial<PublishPlatform>
) => {
  return http.request<ApiResult<PublishPlatform>>(
    "put",
    `/api/publish-platforms/${id}`,
    { data }
  );
};

/** 启停平台 */
export const setPublishPlatformEnabled = (id: number, enabled: number) => {
  return http.request<ApiResult>(
    "post",
    `/api/publish-platforms/${id}/enabled`,
    {
      params: { enabled }
    }
  );
};

/** 删除平台 */
export const deletePublishPlatform = (id: number) => {
  return http.request<ApiResult>("delete", `/api/publish-platforms/${id}`);
};

// ==================== 内容包 ====================

/** 分页查询内容包 */
export const getPublishPackagePage = (params?: object) => {
  return http.request<ApiPageResult<PublishPackage>>(
    "get",
    "/api/publish-packages/page",
    { params }
  );
};

/** 按业务日期查询内容包，不存在返回 null */
export const getPublishPackageByDate = (date?: string) => {
  return http.request<ApiResult<PublishPackage>>(
    "get",
    "/api/publish-packages/by-date",
    { params: date ? { date } : {} }
  );
};

/** 查询内容包详情 */
export const getPublishPackageDetail = (id: number) => {
  return http.request<ApiResult<PublishPackageDetail>>(
    "get",
    `/api/publish-packages/${id}`
  );
};

/**
 * 准备内容包：选图并写入关联（异步）。
 * 传 imageIds 走人工指定，不传则由 AI 从当日图片中选举。
 *
 * 返回任务而非内容包：AI 选举是一次真实 LLM 调用，同步等待会挂住请求。
 * 拿到 taskId 后用 subscribePublishTask 订阅进度。
 */
export const preparePublishPackage = (data?: {
  date?: string;
  imageIds?: number[];
}) => {
  return http.request<ApiResult<PublishTaskState>>(
    "post",
    "/api/publish-packages/prepare",
    { data: data ?? {} }
  );
};

/**
 * 生成各平台文案（异步）；platforms 为空表示全部启用平台，
 * force 为 true 时连人工改过的也重生成。
 *
 * 若该包已有进行中的生成任务，返回的是那个任务的 taskId，不会重复消耗 token。
 */
export const generatePublishPackage = (
  id: number,
  data?: { platforms?: string[]; force?: boolean }
) => {
  return http.request<ApiResult<PublishTaskState>>(
    "post",
    `/api/publish-packages/${id}/generate`,
    { data: data ?? {} }
  );
};

/**
 * 查询异步任务进度。
 *
 * SSE 的兜底通道：断线重连、或刷新页面后想接续观察时，凭 taskId 仍可取到进度。
 */
export const getPublishTask = (taskId: string) => {
  return http.request<ApiResult<PublishTaskState>>(
    "get",
    `/api/publish-packages/tasks/${taskId}`
  );
};

/** 任务进度 SSE 订阅地址。 */
export const publishTaskStreamUrl = (taskId: string) =>
  `/api/publish-packages/tasks/${taskId}/stream`;

/** 人工修改单个平台文案 */
export const updatePublishContent = (
  id: number,
  platform: string,
  data: { title?: string; content?: string; tags?: string[] }
) => {
  return http.request<ApiResult<PublishPackageContent>>(
    "put",
    `/api/publish-packages/${id}/content/${platform}`,
    { data }
  );
};

/** 确认内容包（人工闸门：确认后才建议交付发布） */
export const confirmPublishPackage = (id: number) => {
  return http.request<ApiResult>("post", `/api/publish-packages/${id}/confirm`);
};

/**
 * 下载资源包（ZIP：图片原图 + 各平台文案 + package.json 清单）。
 *
 * 走带 token 的 blob 请求而非直接跳转：鉴权在 Authorization 请求头里，
 * 用 `<a href>` 或 location 跳转不会携带，会被 401 拦掉。
 */
export const downloadPublishPackage = (id: number) => {
  return http.request<Blob>("get", `/api/publish-packages/${id}/download`, {
    responseType: "blob"
  });
};

/** 导出结构化清单（JSON），供外部程序自动读取发布 */
export const getPublishPackageExport = (id: number) => {
  return http.request<ApiResult<PublishPackageExportVO>>(
    "get",
    `/api/publish-packages/${id}/export`
  );
};
