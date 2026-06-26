<script setup lang="ts">
import { ref, computed } from "vue";
import { useDailyImage } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { ReImageViewer } from "@/components/ReImageViewer";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Upload from "~icons/ep/upload";
import Delete from "~icons/ep/delete";
import Download from "~icons/ep/download";
import { MoreFilled, Select } from "@element-plus/icons-vue";

defineOptions({
  name: "DailyImageManage"
});

const formRef = ref();

type DailyImageItem = {
  id: number;
  originalName?: string;
  source?: string;
  fileSize?: number;
  extension?: string;
  remark?: string;
};

const {
  form,
  loading,
  uploadLoading,
  batchDeleteLoading,
  batchDownloadLoading,
  isDownloading,
  dataList,
  pagination,
  fileInputRef,
  selectedIds,
  remarkEditId,
  remarkEditText,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  triggerUpload,
  handleFileChange,
  handleDelete,
  handleBatchDelete,
  handleBatchDownload,
  handleBatchDownloadLinks,
  handleDownload,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  startRemarkEdit,
  cancelRemarkEdit,
  saveRemarkEdit,
  getDailyImageThumbnailUrl,
  getDailyImagePreviewUrl,
  getDailyImageDownloadUrl
} = useDailyImage();

// 批量下载命令分发
function handleDownloadCommand(command: string | number | object) {
  const action = String(command);
  if (action === "zip") {
    handleBatchDownload();
  } else if (action === "links") {
    handleBatchDownloadLinks();
  }
}

function handleCardCommand(
  command: string | number | object,
  item: DailyImageItem
) {
  const action = String(command);
  if (action === "remark") {
    startRemarkEdit(item);
  } else if (action === "delete") {
    handleDelete(item);
  }
}

const selectedCount = computed(() => selectedIds.value.length);
const hasSelection = computed(() => selectedCount.value > 0);
const pageTotal = computed(() => dataList.value.length);
const downloadActionLoading = computed(
  () => batchDownloadLoading.value || isDownloading.value
);
const selectionSummary = computed(() => {
  if (!hasSelection.value) return "勾选图片后可批量下载或删除";
  return `已选择 ${selectedCount.value} / ${pageTotal.value} 张图片`;
});

// 是否全选
const isAllSelected = computed(
  () =>
    dataList.value.length > 0 &&
    selectedIds.value.length === dataList.value.length
);

// 是否部分选中
const isIndeterminate = computed(
  () =>
    selectedIds.value.length > 0 &&
    selectedIds.value.length < dataList.value.length
);

const sourceOptions = [
  { label: "全部", value: "" },
  { label: "Unsplash", value: "unsplash" },
  { label: "本地", value: "local" },
  { label: "上传", value: "upload" }
];

function formatFileSize(bytes?: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getSourceType(type?: string) {
  const map: Record<string, string> = {
    unsplash: "info",
    local: "warning",
    upload: "success"
  };
  return type ? map[type] || "info" : "info";
}

function getSourceLabel(type?: string) {
  const map: Record<string, string> = {
    unsplash: "Unsplash",
    local: "本地",
    upload: "上传"
  };
  return type ? map[type] || type : "未知";
}
</script>

<template>
  <div class="main">
    <el-form ref="formRef" :inline="true" :model="form" class="search-form">
      <el-form-item label="来源" prop="source">
        <el-select
          v-model="form.source"
          placeholder="全部"
          clearable
          style="width: 150px"
        >
          <el-option
            v-for="item in sourceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="useRenderIcon('ri:refresh-line')"
          @click="resetForm(formRef)"
        >
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="每日图片" :columns="[]" @refresh="onSearch">
      <template #buttons>
        <div class="toolbar-actions">
          <el-button
            v-perms="'dailyImage:manage:upload'"
            type="primary"
            :loading="uploadLoading"
            :icon="useRenderIcon(Upload)"
            @click="triggerUpload"
          >
            上传图片
          </el-button>
          <el-button :icon="useRenderIcon(Refresh)" @click="onSearch">
            刷新
          </el-button>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
      </template>
      <template v-slot="{ size }">
        <div v-if="dataList.length > 0" class="selection-toolbar">
          <div class="selection-toolbar__main">
            <el-checkbox
              :model-value="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="toggleSelectAll"
            >
              选择本页
            </el-checkbox>
            <div class="selection-toolbar__copy">
              <span class="selection-toolbar__count">
                {{ selectionSummary }}
              </span>
              <span class="selection-toolbar__hint">
                点击卡片可快速选择，点击图片可预览原图
              </span>
            </div>
          </div>
          <div class="selection-toolbar__actions">
            <el-dropdown
              :disabled="!hasSelection || downloadActionLoading"
              @command="handleDownloadCommand"
            >
              <el-button
                v-perms="'dailyImage:manage:export'"
                type="success"
                :disabled="!hasSelection"
                :loading="downloadActionLoading"
                :icon="useRenderIcon(Download)"
              >
                下载选中
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="zip">
                    ZIP 打包下载
                  </el-dropdown-item>
                  <el-dropdown-item command="links">逐个下载</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button
              v-perms="'dailyImage:manage:delete'"
              type="danger"
              :disabled="!hasSelection"
              :loading="batchDeleteLoading"
              :icon="useRenderIcon(Delete)"
              @click="handleBatchDelete"
            >
              删除选中
            </el-button>
            <el-button text :disabled="!hasSelection" @click="clearSelection">
              清空选择
            </el-button>
          </div>
        </div>

        <div v-loading="loading" class="image-gallery">
          <el-empty
            v-if="!loading && dataList.length === 0"
            description="暂无图片"
            :image-size="90"
          />
          <div v-else class="image-grid">
            <div
              v-for="item in dataList"
              :key="item.id"
              class="image-card"
              :class="{ 'is-selected': selectedIds.includes(item.id) }"
              @click="toggleSelect(item.id)"
            >
              <div
                class="image-card__check"
                :class="{ 'is-checked': selectedIds.includes(item.id) }"
                role="checkbox"
                tabindex="0"
                :aria-checked="selectedIds.includes(item.id)"
                @click.stop="toggleSelect(item.id)"
                @keydown.enter.stop="toggleSelect(item.id)"
                @keydown.space.prevent.stop="toggleSelect(item.id)"
              >
                <el-icon v-if="selectedIds.includes(item.id)">
                  <Select />
                </el-icon>
              </div>
              <div class="image-card__preview" @click.stop>
                <ReImageViewer
                  :src="getDailyImageThumbnailUrl(item.id)"
                  :preview-src-list="[getDailyImagePreviewUrl(item.id)]"
                  fit="cover"
                />
              </div>
              <div class="image-card__info">
                <div class="image-card__header">
                  <span class="image-card__name">
                    {{ item.originalName || `图片 #${item.id}` }}
                  </span>
                  <el-tag
                    :type="getSourceType(item.source)"
                    size="small"
                    effect="plain"
                  >
                    {{ getSourceLabel(item.source) }}
                  </el-tag>
                </div>
                <div class="image-card__meta">
                  <span>{{ formatFileSize(item.fileSize) }}</span>
                  <span>{{ item.extension?.toUpperCase() || "未知格式" }}</span>
                </div>
                <div class="image-card__remark" @click.stop>
                  <template v-if="remarkEditId === item.id">
                    <el-input
                      v-model="remarkEditText"
                      size="small"
                      placeholder="输入备注"
                      @keyup.enter="saveRemarkEdit(item)"
                    />
                    <div class="image-card__remark-actions">
                      <el-button
                        type="primary"
                        link
                        size="small"
                        @click="saveRemarkEdit(item)"
                      >
                        保存
                      </el-button>
                      <el-button link size="small" @click="cancelRemarkEdit">
                        取消
                      </el-button>
                    </div>
                  </template>
                  <template v-else>
                    <span
                      class="image-card__remark-text"
                      @click="startRemarkEdit(item)"
                    >
                      {{ item.remark || "点击添加备注" }}
                    </span>
                  </template>
                </div>
              </div>
              <div class="image-card__actions" @click.stop>
                <el-button
                  v-perms="'dailyImage:manage:export'"
                  plain
                  type="success"
                  :size="size"
                  :icon="useRenderIcon(Download)"
                  @click="handleDownload(item)"
                >
                  下载
                </el-button>
                <el-dropdown
                  trigger="click"
                  @command="command => handleCardCommand(command, item)"
                >
                  <el-button circle text :size="size" aria-label="更多操作">
                    <el-icon>
                      <MoreFilled />
                    </el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="remark"
                        >编辑备注</el-dropdown-item
                      >
                      <el-dropdown-item command="delete" divided>
                        删除图片
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </div>
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
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.search-form {
  margin-bottom: 16px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.selection-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: linear-gradient(
    135deg,
    var(--el-fill-color-extra-light),
    var(--el-bg-color)
  );
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.selection-toolbar__main {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.selection-toolbar__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.selection-toolbar__count {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.selection-toolbar__hint {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.selection-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.image-gallery {
  min-height: 200px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.image-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(15 23 42 / 4%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 10px 28px rgb(15 23 42 / 10%);
    transform: translateY(-2px);
  }

  &.is-selected {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
  }
}

.image-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  cursor: pointer;
  background: rgb(255 255 255 / 92%);
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgb(15 23 42 / 14%);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary);
    transform: scale(1.06);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 2px;
  }

  &.is-checked {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);

    .el-icon {
      font-size: 14px;
      color: #fff;
    }
  }
}

.image-card__preview {
  width: 100%;
  height: 180px;
  overflow: hidden;
  cursor: zoom-in;
  background: var(--el-fill-color-light);
}

.image-card__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
}

.image-card__header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.image-card__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.image-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.image-card__remark {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.image-card__remark-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  -webkit-box-orient: vertical;

  &:hover {
    color: var(--el-color-primary);
  }
}

.image-card__remark-actions {
  display: flex;
  gap: 8px;
}

.image-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width <= 768px) {
  .toolbar-actions,
  .selection-toolbar,
  .selection-toolbar__main,
  .selection-toolbar__actions {
    align-items: stretch;
    width: 100%;
  }

  .toolbar-actions,
  .selection-toolbar {
    flex-direction: column;
  }

  .selection-toolbar__hint {
    white-space: normal;
  }

  .selection-toolbar__actions > * {
    flex: 1;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
