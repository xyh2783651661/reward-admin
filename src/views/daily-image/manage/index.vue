<script setup lang="ts">
import { computed, ref } from "vue";
import { useDailyImage } from "./hook";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";

import Refresh from "~icons/ep/refresh";
import Upload from "~icons/ep/upload";
import Delete from "~icons/ep/delete";
import Download from "~icons/ep/download";
import ZoomIn from "~icons/ep/zoom-in";
import Search from "~icons/ep/search";
import ArrowLeft from "~icons/ep/arrow-left";
import ArrowRight from "~icons/ep/arrow-right";
import Close from "~icons/ep/close";
import Check from "~icons/ep/check";
import CircleCheckFilled from "~icons/ep/circle-check-filled";
import CircleCloseFilled from "~icons/ep/circle-close-filled";
import LoadingIcon from "~icons/ep/loading";
import Picture from "~icons/ep/picture";

defineOptions({
  name: "DailyImageManage"
});

const {
  // 列表与查询
  form,
  keyword,
  sourceOptions,
  loading,
  dataList,
  filteredList,
  pagination,
  onSearch,
  handleSourceChange,
  handleSizeChange,
  handleCurrentChange,
  // 密度
  density,
  setDensity,
  // 选中
  selectedCount,
  hasSelection,
  isAllSelected,
  isIndeterminate,
  isSelected,
  toggleSelect,
  toggleSelectAll,
  selectAllOnPage,
  invertSelection,
  clearSelection,
  handleGridKeydown,
  // 抽屉
  drawerVisible,
  drawerLoading,
  drawerItem,
  drawerDetail,
  hasPrev,
  hasNext,
  openDrawer,
  closeDrawer,
  goPrev,
  goNext,
  // 全屏预览
  openFullPreviewById,
  // 备注
  remarkDraft,
  remarkSaving,
  saveRemark,
  // 视觉描述重跑
  visionRegenerating,
  regenerateVision,
  // 上传
  fileInputRef,
  uploadTasks,
  uploading,
  uploadDoneCount,
  uploadDialogVisible,
  openUploadDialog,
  closeUploadDialog,
  isDraggingOver,
  triggerUpload,
  handleFileChange,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  clearUploadTasks,
  // 删除/下载
  batchDeleteLoading,
  batchDownloadLoading,
  isDownloading,
  handleDelete,
  handleBatchDelete,
  handleDownload,
  handleBatchDownload,
  handleBatchDownloadLinks,
  // URL helpers
  getDailyImageThumbnailUrl
} = useDailyImage();

const densityOptions = [
  { label: "大", value: "large" as const },
  { label: "中", value: "medium" as const },
  { label: "小", value: "small" as const }
];

const downloadActionLoading = computed(
  () => batchDownloadLoading.value || isDownloading.value
);

const gridStyle = computed(() => {
  const map = { large: "240px", medium: "180px", small: "140px" };
  return { "--card-min": map[density.value] };
});

/** 详情展示数据源：优先用详情接口数据，加载中/失败时回退到列表项（列表接口同样返回完整实体） */
const detail = computed(() => drawerDetail.value ?? drawerItem.value);

/** 非空判断（用于字段行显隐） */
function hasVal(v: unknown) {
  return v !== undefined && v !== null && v !== "";
}

/** 非空对象判断（用于 extraJson / visionDescriptions 等 Map 字段） */
function hasObj(v: unknown) {
  return (
    v !== undefined &&
    v !== null &&
    typeof v === "object" &&
    Object.keys(v as object).length > 0
  );
}

/** 各分组是否包含有效字段（整组无有效字段时隐藏标题） */
const groupFlags = computed(() => {
  const d = detail.value;
  if (!d) return { A: false, B: false, C: false, D: false, E: false, F: false };
  return {
    A: [d.id, d.originalName, d.extension, d.fileSize, d.source].some(hasVal),
    B: [
      d.width,
      d.height,
      d.orientation,
      d.mimeType,
      d.dominantColor,
      d.fileHash,
      d.storageName
    ].some(hasVal),
    C: [
      d.authorName,
      d.authorUrl,
      d.license,
      d.sourcePageUrl,
      d.sourceId,
      d.sourceUrl
    ].some(hasVal),
    D:
      hasVal(d.visionStatus) ||
      hasObj(d.visionDescriptions) ||
      hasVal(d.visionGeneratedTime),
    E: [
      d.imageDate,
      d.theme,
      d.queryKeyword,
      d.batchId,
      d.downloadedTime,
      d.downloadCostMs
    ].some(hasVal),
    F:
      [
        d.createdTime,
        d.updatedTime,
        d.createdBy,
        d.updatedBy,
        d.storagePath,
        d.thumbnailPath
      ].some(hasVal) || hasObj(d.extraJson)
  };
});

/** 折叠面板默认展开 A/B/C/D，E/F 折叠 */
const activeGroups = ref(["A", "B", "C", "D"]);

/** 视觉描述元数据 key（与语言描述区分） */
const VISION_META_KEYS = ["model", "template", "cost_ms", "errors"];

/** 从 visionDescriptions 提取语言描述列表 */
function getVisionLanguages(vd?: Record<string, any> | null) {
  if (!vd) return [];
  return Object.entries(vd)
    .filter(
      ([k, v]) => !VISION_META_KEYS.includes(k) && typeof v === "string" && v
    )
    .map(([lang, text]) => ({ lang, text }));
}

/** 从 visionDescriptions 提取元数据（model / cost_ms） */
function getVisionMeta(vd?: Record<string, any> | null) {
  if (!vd) return null;
  const meta: Record<string, any> = {};
  if (vd.model !== undefined) meta.model = vd.model;
  if (vd.cost_ms !== undefined) meta.cost_ms = vd.cost_ms;
  return Object.keys(meta).length ? meta : null;
}

/** 从 visionDescriptions 提取错误信息 */
function getVisionErrors(vd?: Record<string, any> | null) {
  if (!vd) return [];
  const errors = vd.errors;
  if (Array.isArray(errors)) return errors.map(String);
  if (typeof errors === "string" && errors) return [errors];
  return [];
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español"
};

function langLabel(lang: string) {
  return LANG_LABELS[lang] || lang.toUpperCase();
}

/** 时间格式化：后端 LocalDateTime 序列化为 ISO 字符串 */
function formatDateTime(v?: string | null) {
  if (!v) return "";
  return String(v)
    .replace("T", " ")
    .replace(/\.\d+$/, "")
    .slice(0, 19);
}

function orientationLabel(v?: string | null) {
  const map: Record<string, string> = {
    landscape: "横向",
    portrait: "竖向",
    square: "方形"
  };
  return v ? map[v] || v : "";
}

function visionStatusLabel(v?: number | null) {
  const map: Record<number, string> = { 0: "未生成", 1: "已生成", 2: "失败" };
  return v !== undefined && v !== null ? map[v] || String(v) : "未生成";
}

function visionStatusType(v?: number | null) {
  const map: Record<number, string> = { 0: "info", 1: "success", 2: "danger" };
  return v !== undefined && v !== null ? map[v] || "info" : "info";
}

/** 复制文本（用于 MD5 等） */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message("已复制", { type: "success" });
  } catch {
    message("复制失败", { type: "error" });
  }
}

function handleDownloadCommand(command: string | number | object) {
  const action = String(command);
  if (action === "zip") {
    handleBatchDownload();
  } else if (action === "links") {
    handleBatchDownloadLinks();
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getSourceType(type?: string) {
  const map: Record<string, string> = {
    unsplash: "info",
    pexels: "success",
    pixabay: "success",
    local: "warning",
    upload: "success",
    sync: "info"
  };
  return type ? map[type] || "info" : "info";
}

function getSourceLabel(type?: string) {
  const map: Record<string, string> = {
    unsplash: "Unsplash",
    pexels: "Pexels",
    pixabay: "Pixabay",
    local: "本地",
    upload: "上传",
    sync: "同步"
  };
  return type ? map[type] || type : "未知";
}

function uploadStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "等待中",
    uploading: "上传中",
    success: "成功",
    error: "失败"
  };
  return map[status] || status;
}
</script>

<template>
  <div class="daily-image-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar__left">
        <el-input
          v-model="keyword"
          class="toolbar__search"
          placeholder="搜索文件名 / 备注（仅当前页）"
          clearable
          :prefix-icon="Search"
          aria-label="搜索当前页图片"
        />
        <el-select
          v-model="form.source"
          class="toolbar__source"
          placeholder="全部来源"
          clearable
          aria-label="按来源筛选"
          @change="handleSourceChange"
        >
          <el-option
            v-for="item in sourceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
      <div class="toolbar__right">
        <el-segmented
          :model-value="density"
          :options="densityOptions"
          size="default"
          aria-label="网格密度"
          @change="setDensity($event as any)"
        />
        <el-button
          :icon="useRenderIcon(Refresh)"
          aria-label="刷新列表"
          @click="onSearch"
        />
        <el-button
          v-perms="'dailyImage:manage:upload'"
          type="primary"
          :loading="uploading"
          :icon="useRenderIcon(Upload)"
          @click="openUploadDialog"
        >
          上传图片
        </el-button>
      </div>
    </div>

    <!-- 浮动批量操作条（仅选中时出现） -->
    <Transition name="slide-down">
      <div v-if="hasSelection" class="batch-bar">
        <div class="batch-bar__left">
          <el-checkbox
            :model-value="isAllSelected"
            :indeterminate="isIndeterminate"
            aria-label="全选本页"
            @change="toggleSelectAll"
          />
          <span class="batch-bar__count">已选 {{ selectedCount }} 张</span>
          <el-button text size="small" @click="selectAllOnPage">
            全选本页
          </el-button>
          <el-button text size="small" @click="invertSelection">
            反选
          </el-button>
          <el-button text size="small" @click="clearSelection">
            清空
          </el-button>
        </div>
        <div class="batch-bar__right">
          <el-dropdown
            :disabled="downloadActionLoading"
            @command="handleDownloadCommand"
          >
            <el-button
              v-perms="'dailyImage:manage:export'"
              type="success"
              plain
              :loading="downloadActionLoading"
              :icon="useRenderIcon(Download)"
            >
              下载
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="zip">ZIP 打包下载</el-dropdown-item>
                <el-dropdown-item command="links">逐个下载</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            v-perms="'dailyImage:manage:delete'"
            type="danger"
            plain
            :loading="batchDeleteLoading"
            :icon="useRenderIcon(Delete)"
            @click="handleBatchDelete"
          >
            删除
          </el-button>
        </div>
      </div>
    </Transition>

    <!-- 图片网格 -->
    <div
      class="gallery"
      :style="gridStyle"
      tabindex="-1"
      @keydown="handleGridKeydown"
    >
      <!-- 骨架屏 -->
      <div v-if="loading" class="image-grid">
        <div v-for="n in 12" :key="n" class="skeleton-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" class="skeleton-card__img" />
              <div class="skeleton-card__body">
                <el-skeleton-item variant="text" style="width: 70%" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>

      <!-- 空态 -->
      <div v-else-if="filteredList.length === 0" class="empty-state">
        <el-icon :size="56" class="empty-state__icon"><Picture /></el-icon>
        <p class="empty-state__title">
          {{ keyword ? "当前页没有匹配的图片" : "暂无图片" }}
        </p>
        <p class="empty-state__hint">
          {{
            keyword
              ? "搜索仅筛选当前页，可尝试翻页或清空关键字"
              : "点击上传按钮，在弹框中选择或拖入图片"
          }}
        </p>
        <el-button
          v-if="!keyword"
          v-perms="'dailyImage:manage:upload'"
          type="primary"
          :icon="useRenderIcon(Upload)"
          @click="openUploadDialog"
        >
          上传图片
        </el-button>
        <el-button v-else @click="keyword = ''">清空搜索</el-button>
      </div>

      <!-- 网格 -->
      <div v-else class="image-grid">
        <div
          v-for="item in filteredList"
          :key="item.id"
          class="image-card"
          :class="{ 'is-selected': isSelected(item.id) }"
          role="button"
          tabindex="0"
          :aria-label="`查看 ${item.originalName || `图片 ${item.id}`} 详情`"
          @click="openDrawer(item)"
          @keydown.enter.self="openDrawer(item)"
          @keydown.space.prevent.self="toggleSelect(item.id, $event)"
        >
          <!-- 勾选框 -->
          <button
            class="image-card__check"
            :class="{ 'is-checked': isSelected(item.id) }"
            type="button"
            role="checkbox"
            :aria-checked="isSelected(item.id)"
            :aria-label="`选择 ${item.originalName || `图片 ${item.id}`}`"
            @click.stop="toggleSelect(item.id, $event)"
          >
            <el-icon v-if="isSelected(item.id)" :size="13"><Check /></el-icon>
          </button>

          <!-- 悬浮预览按钮 -->
          <button
            class="image-card__zoom"
            type="button"
            :aria-label="`全屏预览 ${item.originalName || `图片 ${item.id}`}`"
            @click.stop="openFullPreviewById(item.id)"
          >
            <el-icon :size="15"><ZoomIn /></el-icon>
          </button>

          <!-- 缩略图 -->
          <div class="image-card__thumb">
            <img
              :src="getDailyImageThumbnailUrl(item.id)"
              :alt="item.originalName || `图片 ${item.id}`"
              loading="lazy"
            />
            <span class="image-card__source">
              {{ getSourceLabel(item.source) }}
            </span>
          </div>

          <!-- 底部信息 -->
          <div class="image-card__footer">
            <div class="image-card__footer-top">
              <span class="image-card__name">
                {{ item.originalName || `图片 #${item.id}` }}
              </span>
              <span class="image-card__size">
                {{ formatFileSize(item.fileSize) }}
              </span>
            </div>
            <div
              v-if="
                hasVal(item.extension) ||
                (hasVal(item.width) && hasVal(item.height)) ||
                hasVal(item.theme)
              "
              class="image-card__meta"
            >
              <span v-if="hasVal(item.extension)">
                {{ String(item.extension).toUpperCase() }}
              </span>
              <span v-if="hasVal(item.width) && hasVal(item.height)">
                {{ item.width }}×{{ item.height }}
              </span>
              <span v-if="hasVal(item.theme)">{{ item.theme }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > 0" class="pagination-wrap">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[15, 30, 60, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerItem?.originalName || '图片详情'"
      size="600px"
      :destroy-on-close="false"
      @close="closeDrawer"
    >
      <div v-if="drawerItem" v-loading="drawerLoading" class="drawer-body">
        <!-- 缩略图（点击才加载原图进入全屏预览） -->
        <button
          class="drawer-body__preview"
          type="button"
          aria-label="全屏预览原图，可左右切换"
          @click="openFullPreviewById(drawerItem.id)"
        >
          <img
            :src="getDailyImageThumbnailUrl(drawerItem.id)"
            :alt="drawerItem.originalName || `图片 ${drawerItem.id}`"
            loading="lazy"
          />
          <span class="drawer-body__preview-hint">
            <el-icon><ZoomIn /></el-icon>
            点击查看原图，可左右切换
          </span>
        </button>

        <!-- 上一张 / 下一张 -->
        <div class="drawer-body__nav">
          <el-button
            :disabled="!hasPrev"
            :icon="useRenderIcon(ArrowLeft)"
            @click="goPrev"
          >
            上一张
          </el-button>
          <el-button :disabled="!hasNext" @click="goNext">
            下一张
            <el-icon class="ml-1"><ArrowRight /></el-icon>
          </el-button>
        </div>

        <!-- 分组信息 -->
        <div class="drawer-body__section">
          <el-collapse v-model="activeGroups" class="drawer-body__collapse">
            <!-- A 基本信息 -->
            <el-collapse-item v-if="groupFlags.A" title="基本信息" name="A">
              <dl class="drawer-body__fields">
                <template v-if="hasVal(detail?.id)">
                  <dt>ID</dt>
                  <dd>{{ detail?.id }}</dd>
                </template>
                <template v-if="hasVal(detail?.originalName)">
                  <dt>文件名</dt>
                  <dd
                    class="drawer-body__ellipsis"
                    :title="detail?.originalName"
                  >
                    {{ detail?.originalName }}
                  </dd>
                </template>
                <template v-if="hasVal(detail?.extension)">
                  <dt>格式</dt>
                  <dd>
                    <el-tag size="small" effect="plain">
                      {{ String(detail?.extension).toUpperCase() }}
                    </el-tag>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.fileSize)">
                  <dt>大小</dt>
                  <dd>{{ formatFileSize(detail?.fileSize) }}</dd>
                </template>
                <template v-if="hasVal(detail?.source)">
                  <dt>来源</dt>
                  <dd>
                    <el-tag
                      :type="getSourceType(detail?.source) as any"
                      size="small"
                      effect="plain"
                    >
                      {{ getSourceLabel(detail?.source) }}
                    </el-tag>
                  </dd>
                </template>
              </dl>
            </el-collapse-item>

            <!-- B 图片属性 -->
            <el-collapse-item v-if="groupFlags.B" title="图片属性" name="B">
              <dl class="drawer-body__fields">
                <template
                  v-if="hasVal(detail?.width) && hasVal(detail?.height)"
                >
                  <dt>尺寸</dt>
                  <dd>
                    {{ detail?.width }} × {{ detail?.height }}
                    <el-tag
                      v-if="hasVal(detail?.orientation)"
                      size="small"
                      type="info"
                      effect="plain"
                      class="ml-1"
                    >
                      {{ orientationLabel(detail?.orientation) }}
                    </el-tag>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.mimeType)">
                  <dt>MIME</dt>
                  <dd>{{ detail?.mimeType }}</dd>
                </template>
                <template v-if="hasVal(detail?.dominantColor)">
                  <dt>主色调</dt>
                  <dd class="drawer-body__color">
                    <span
                      class="drawer-body__color-swatch"
                      :style="{ background: detail?.dominantColor }"
                    />
                    <span>{{ detail?.dominantColor }}</span>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.fileHash)">
                  <dt>MD5</dt>
                  <dd class="drawer-body__copy">
                    <span class="drawer-body__mono">
                      {{ detail?.fileHash }}
                    </span>
                    <el-button
                      text
                      size="small"
                      aria-label="复制 MD5"
                      @click="copyText(detail?.fileHash || '')"
                    >
                      复制
                    </el-button>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.storageName)">
                  <dt>存储名</dt>
                  <dd class="drawer-body__mono">{{ detail?.storageName }}</dd>
                </template>
              </dl>
            </el-collapse-item>

            <!-- C 版权与来源 -->
            <el-collapse-item v-if="groupFlags.C" title="版权与来源" name="C">
              <dl class="drawer-body__fields">
                <template v-if="hasVal(detail?.authorName)">
                  <dt>作者</dt>
                  <dd>
                    <a
                      v-if="hasVal(detail?.authorUrl)"
                      :href="detail?.authorUrl"
                      target="_blank"
                      rel="noopener"
                      class="drawer-body__link"
                    >
                      {{ detail?.authorName }}
                    </a>
                    <template v-else>{{ detail?.authorName }}</template>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.license)">
                  <dt>授权</dt>
                  <dd>
                    <el-tag size="small" type="info" effect="plain">
                      {{ detail?.license }}
                    </el-tag>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.sourcePageUrl)">
                  <dt>来源页</dt>
                  <dd>
                    <a
                      :href="detail?.sourcePageUrl"
                      target="_blank"
                      rel="noopener"
                      class="drawer-body__link"
                    >
                      查看来源页
                    </a>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.sourceId)">
                  <dt>来源 ID</dt>
                  <dd class="drawer-body__mono">{{ detail?.sourceId }}</dd>
                </template>
                <template v-if="hasVal(detail?.sourceUrl)">
                  <dt>原始 URL</dt>
                  <dd>
                    <a
                      :href="detail?.sourceUrl"
                      target="_blank"
                      rel="noopener"
                      class="drawer-body__link"
                    >
                      打开
                    </a>
                  </dd>
                </template>
              </dl>
            </el-collapse-item>

            <!-- D 视觉描述 -->
            <el-collapse-item v-if="groupFlags.D" title="视觉描述" name="D">
              <div class="drawer-body__vision">
                <div class="drawer-body__vision-head">
                  <el-tag
                    :type="visionStatusType(detail?.visionStatus) as any"
                    size="small"
                    effect="plain"
                  >
                    {{ visionStatusLabel(detail?.visionStatus) }}
                  </el-tag>
                  <el-button
                    v-if="detail?.visionStatus === 2"
                    size="small"
                    type="warning"
                    :loading="visionRegenerating"
                    @click="regenerateVision"
                  >
                    重跑
                  </el-button>
                </div>

                <div
                  v-for="item in getVisionLanguages(detail?.visionDescriptions)"
                  :key="item.lang"
                  class="drawer-body__vision-card"
                >
                  <span class="drawer-body__vision-lang">
                    {{ langLabel(item.lang) }}
                  </span>
                  <p class="drawer-body__vision-text">{{ item.text }}</p>
                </div>

                <div
                  v-if="getVisionMeta(detail?.visionDescriptions)"
                  class="drawer-body__vision-meta"
                >
                  <span v-if="detail?.visionDescriptions?.model">
                    模型：{{ detail?.visionDescriptions?.model }}
                  </span>
                  <span
                    v-if="detail?.visionDescriptions?.cost_ms !== undefined"
                  >
                    耗时：{{ detail?.visionDescriptions?.cost_ms }} ms
                  </span>
                </div>

                <div
                  v-if="getVisionErrors(detail?.visionDescriptions).length"
                  class="drawer-body__vision-errors"
                >
                  <el-icon><WarningFilled /></el-icon>
                  <span>
                    {{ getVisionErrors(detail?.visionDescriptions).join("；") }}
                  </span>
                </div>

                <div
                  v-if="hasVal(detail?.visionGeneratedTime)"
                  class="drawer-body__vision-time"
                >
                  生成时间：{{ formatDateTime(detail?.visionGeneratedTime) }}
                </div>
              </div>
            </el-collapse-item>

            <!-- E 采集信息 -->
            <el-collapse-item v-if="groupFlags.E" title="采集信息" name="E">
              <dl class="drawer-body__fields">
                <template v-if="hasVal(detail?.imageDate)">
                  <dt>业务日期</dt>
                  <dd>{{ detail?.imageDate }}</dd>
                </template>
                <template v-if="hasVal(detail?.theme)">
                  <dt>主题词</dt>
                  <dd>
                    <el-tag size="small" effect="plain">
                      {{ detail?.theme }}
                    </el-tag>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.queryKeyword)">
                  <dt>搜索词</dt>
                  <dd>{{ detail?.queryKeyword }}</dd>
                </template>
                <template v-if="hasVal(detail?.batchId)">
                  <dt>批次</dt>
                  <dd class="drawer-body__mono">{{ detail?.batchId }}</dd>
                </template>
                <template v-if="hasVal(detail?.downloadedTime)">
                  <dt>下载完成</dt>
                  <dd>{{ formatDateTime(detail?.downloadedTime) }}</dd>
                </template>
                <template v-if="hasVal(detail?.downloadCostMs)">
                  <dt>下载耗时</dt>
                  <dd>{{ detail?.downloadCostMs }} ms</dd>
                </template>
              </dl>
            </el-collapse-item>

            <!-- F 存储与审计 -->
            <el-collapse-item v-if="groupFlags.F" title="存储与审计" name="F">
              <dl class="drawer-body__fields">
                <template v-if="hasVal(detail?.createdTime)">
                  <dt>创建时间</dt>
                  <dd>{{ formatDateTime(detail?.createdTime) }}</dd>
                </template>
                <template v-if="hasVal(detail?.updatedTime)">
                  <dt>更新时间</dt>
                  <dd>{{ formatDateTime(detail?.updatedTime) }}</dd>
                </template>
                <template v-if="hasVal(detail?.createdBy)">
                  <dt>创建人</dt>
                  <dd>{{ detail?.createdBy }}</dd>
                </template>
                <template v-if="hasVal(detail?.updatedBy)">
                  <dt>更新人</dt>
                  <dd>{{ detail?.updatedBy }}</dd>
                </template>
                <template v-if="hasObj(detail?.extraJson)">
                  <dt>扩展信息</dt>
                  <dd>
                    <pre class="drawer-body__json">{{
                      JSON.stringify(detail?.extraJson, null, 2)
                    }}</pre>
                  </dd>
                </template>
                <template v-if="hasVal(detail?.storagePath)">
                  <dt>存储路径</dt>
                  <dd
                    class="drawer-body__mono drawer-body__ellipsis"
                    :title="detail?.storagePath"
                  >
                    {{ detail?.storagePath }}
                  </dd>
                </template>
                <template v-if="hasVal(detail?.thumbnailPath)">
                  <dt>缩略图路径</dt>
                  <dd
                    class="drawer-body__mono drawer-body__ellipsis"
                    :title="detail?.thumbnailPath"
                  >
                    {{ detail?.thumbnailPath }}
                  </dd>
                </template>
              </dl>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 备注编辑 -->
        <div class="drawer-body__section">
          <h4 class="drawer-body__section-title">备注</h4>
          <el-input
            v-model="remarkDraft"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="填写备注信息"
          />
          <el-button
            class="mt-2"
            type="primary"
            size="small"
            :loading="remarkSaving"
            :disabled="remarkDraft === (drawerItem.remark || '')"
            @click="saveRemark"
          >
            保存备注
          </el-button>
        </div>

        <!-- 操作 -->
        <div class="drawer-body__actions">
          <el-button
            v-perms="'dailyImage:manage:export'"
            type="success"
            plain
            :icon="useRenderIcon(Download)"
            @click="handleDownload(drawerItem)"
          >
            下载原图
          </el-button>
          <el-button
            v-perms="'dailyImage:manage:delete'"
            type="danger"
            plain
            :icon="useRenderIcon(Delete)"
            @click="handleDelete(drawerItem)"
          >
            删除
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 上传弹框（拖拽 + 多选） -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传图片"
      width="520px"
      :close-on-click-modal="!uploading"
      @close="closeUploadDialog"
    >
      <div
        class="upload-dropzone"
        :class="{ 'is-dragover': isDraggingOver }"
        role="button"
        tabindex="0"
        aria-label="点击选择或拖入图片上传"
        @click="triggerUpload"
        @keydown.enter="triggerUpload"
        @dragenter.prevent="handleDragEnter"
        @dragover.prevent
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <el-icon :size="40" class="upload-dropzone__icon"><Upload /></el-icon>
        <p class="upload-dropzone__title">点击选择图片，或拖拽到此处</p>
        <p class="upload-dropzone__hint">支持一次选择/拖入多张图片</p>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        class="hidden-input"
        @change="handleFileChange"
      />
      <ul v-if="uploadTasks.length > 0" class="upload-dialog-list">
        <li
          v-for="task in uploadTasks"
          :key="task.uid"
          class="upload-panel__item"
        >
          <el-icon
            class="upload-panel__status-icon"
            :class="`is-${task.status}`"
          >
            <CircleCheckFilled v-if="task.status === 'success'" />
            <CircleCloseFilled v-else-if="task.status === 'error'" />
            <LoadingIcon
              v-else-if="task.status === 'uploading'"
              class="is-spinning"
            />
            <Upload v-else />
          </el-icon>
          <span class="upload-panel__name" :title="task.name">
            {{ task.name }}
          </span>
          <span class="upload-panel__state" :class="`is-${task.status}`">
            {{ task.errorMsg || uploadStatusLabel(task.status) }}
          </span>
        </li>
      </ul>
      <template #footer>
        <span v-if="uploadTasks.length > 0" class="upload-dialog-progress">
          {{ uploadDoneCount }}/{{ uploadTasks.length }}
        </span>
        <el-button :disabled="uploading" @click="closeUploadDialog">
          {{ uploading ? "上传中…" : "关闭" }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 上传进度浮层（弹框关闭后台上传时展示） -->
    <Transition name="slide-up">
      <div
        v-if="uploadTasks.length > 0 && !uploadDialogVisible"
        class="upload-panel"
      >
        <div class="upload-panel__header">
          <span class="upload-panel__title">
            上传队列（{{ uploadDoneCount }}/{{ uploadTasks.length }}）
          </span>
          <el-button
            text
            size="small"
            :disabled="uploading"
            :icon="useRenderIcon(Close)"
            aria-label="关闭上���队列"
            @click="clearUploadTasks"
          />
        </div>
        <ul class="upload-panel__list">
          <li
            v-for="task in uploadTasks"
            :key="task.uid"
            class="upload-panel__item"
          >
            <el-icon
              class="upload-panel__status-icon"
              :class="`is-${task.status}`"
            >
              <CircleCheckFilled v-if="task.status === 'success'" />
              <CircleCloseFilled v-else-if="task.status === 'error'" />
              <LoadingIcon
                v-else-if="task.status === 'uploading'"
                class="is-spinning"
              />
              <Upload v-else />
            </el-icon>
            <span class="upload-panel__name" :title="task.name">
              {{ task.name }}
            </span>
            <span class="upload-panel__state" :class="`is-${task.status}`">
              {{ task.errorMsg || uploadStatusLabel(task.status) }}
            </span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* ========== 响应式 ========== */
@media (width <= 768px) {
  .toolbar__left,
  .toolbar__right {
    width: 100%;
  }

  .toolbar__search {
    flex: 1;
    width: auto;
  }

  .batch-bar {
    top: 0;
  }

  .batch-bar__right {
    width: 100%;

    > * {
      flex: 1;
    }
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}

.daily-image-page {
  position: relative;
  min-height: 400px;
  padding: 16px;
}

.hidden-input {
  display: none;
}

/* ========== 上传弹框 ========== */
.upload-dropzone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 36px 24px;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 2px dashed var(--el-border-color);
  border-radius: 12px;
  transition:
    border-color 0.2s,
    background 0.2s;

  &:hover,
  &.is-dragover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.upload-dropzone__icon {
  color: var(--el-color-primary);
}

.upload-dropzone__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.upload-dropzone__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.upload-dialog-list {
  max-height: 220px;
  padding: 4px 0;
  margin-top: 12px;
  overflow-y: auto;
  border-top: 1px solid var(--el-border-color-lighter);
}

.upload-dialog-progress {
  margin-right: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ========== 工具栏 ========== */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.toolbar__left {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.toolbar__search {
  width: 260px;
  max-width: 100%;
}

.toolbar__source {
  width: 140px;
}

.toolbar__right {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

/* ========== 批量操作条 ========== */
.batch-bar {
  position: sticky;
  top: 8px;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgb(15 23 42 / 10%);
}

.batch-bar__left {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.batch-bar__count {
  margin: 0 6px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.batch-bar__right {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ========== 网格 ========== */
.gallery {
  min-height: 240px;
  outline: none;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min, 180px), 1fr));
  gap: 14px;
}

.skeleton-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
}

.skeleton-card__img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
}

.skeleton-card__body {
  padding: 10px 12px;
}

/* ========== 空态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  text-align: center;
}

.empty-state__icon {
  color: var(--el-text-color-placeholder);
}

.empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-state__hint {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* ========== 图片卡片 ========== */
.image-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 8px 24px rgb(15 23 42 / 10%);
    transform: translateY(-2px);

    .image-card__check,
    .image-card__zoom {
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary);

    .image-card__check {
      opacity: 1;
    }

    .image-card__thumb img {
      filter: brightness(0.86);
    }
  }
}

.image-card__check {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  background: rgb(255 255 255 / 90%);
  border: 1.5px solid var(--el-border-color);
  border-radius: 6px;
  opacity: 0.55;
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
    opacity: 1;
  }

  &.is-checked {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
  }
}

.image-card__zoom {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--el-text-color-primary);
  cursor: zoom-in;
  background: rgb(255 255 255 / 90%);
  border: none;
  border-radius: 6px;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
    background: #fff;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
    opacity: 1;
  }
}

.image-card__thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--el-fill-color-light);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.2s ease;
  }
}

.image-card__source {
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 1px 8px;
  font-size: 11px;
  color: #fff;
  background: rgb(0 0 0 / 55%);
  border-radius: 10px;
}

.image-card__footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
}

.image-card__footer-top {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.image-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  min-width: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.image-card__meta > span:not(:last-child)::after {
  margin-left: 6px;
  color: var(--el-text-color-placeholder);
  content: "·";
}

.image-card__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.image-card__size {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* ========== 分页 ========== */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ========== 详情抽屉 ========== */
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.drawer-body__preview {
  position: relative;
  padding: 0;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;

  img {
    display: block;
    width: 100%;
    max-height: 200px;
    object-fit: contain;
  }

  &:hover .drawer-body__preview-hint {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.drawer-body__preview-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 6px;
  font-size: 12px;
  color: #fff;
  background: rgb(0 0 0 / 55%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drawer-body__nav {
  display: flex;
  gap: 8px;

  > * {
    flex: 1;
  }
}

.drawer-body__section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.drawer-body__fields {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px 12px;
  padding: 12px;
  font-size: 13px;
  background: var(--el-fill-color-extra-light);
  border-radius: 8px;

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    min-width: 0;
    color: var(--el-text-color-primary);
    overflow-wrap: break-word;
  }
}

/* 折叠分组 */
.drawer-body__collapse {
  border-top: none;
  border-bottom: none;

  :deep(.el-collapse-item__header) {
    font-size: 13px;
    font-weight: 600;
    background: transparent;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 4px;
  }
}

/* 通用字段辅助 */
.drawer-body__ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-body__mono {
  font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.drawer-body__color {
  display: flex;
  gap: 8px;
  align-items: center;
}

.drawer-body__color-swatch {
  width: 16px;
  height: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.drawer-body__copy {
  display: flex;
  gap: 8px;
  align-items: center;

  .drawer-body__mono {
    flex: 1;
    min-width: 0;
  }
}

.drawer-body__link {
  color: var(--el-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.drawer-body__json {
  max-height: 200px;
  padding: 8px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

/* 视觉描述 */
.drawer-body__vision {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-body__vision-head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.drawer-body__vision-card {
  padding: 10px 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: 8px;
}

.drawer-body__vision-lang {
  display: inline-block;
  padding: 1px 8px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 10px;
}

.drawer-body__vision-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.drawer-body__vision-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.drawer-body__vision-errors {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
}

.drawer-body__vision-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.drawer-body__actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);

  > * {
    flex: 1;
  }
}

/* ========== 上传进度浮层 ========== */
.upload-panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2100;
  width: 320px;
  max-width: calc(100vw - 40px);
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 12px 36px rgb(15 23 42 / 18%);
}

.upload-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.upload-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.upload-panel__list {
  max-height: 220px;
  padding: 6px 0;
  overflow-y: auto;
}

.upload-panel__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 14px;
}

.upload-panel__status-icon {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);

  &.is-success {
    color: var(--el-color-success);
  }

  &.is-error {
    color: var(--el-color-danger);
  }

  &.is-uploading {
    color: var(--el-color-primary);
  }
}

.is-spinning {
  animation: spin 1s linear infinite;
}

.upload-panel__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.upload-panel__state {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);

  &.is-success {
    color: var(--el-color-success);
  }

  &.is-error {
    color: var(--el-color-danger);
  }

  &.is-uploading {
    color: var(--el-color-primary);
  }
}

/* ========== 过渡动画 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
