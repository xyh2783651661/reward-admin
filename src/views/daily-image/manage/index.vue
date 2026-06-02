<script setup lang="ts">
import { ref } from "vue";
import { useDailyImage } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { ReImageViewer } from "@/components/ReImageViewer";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";
import Upload from "~icons/ep/upload";

defineOptions({
  name: "DailyImageManage"
});

const formRef = ref();

const {
  form,
  loading,
  uploadLoading,
  dataList,
  pagination,
  fileInputRef,
  remarkEditId,
  remarkEditText,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  triggerUpload,
  handleFileChange,
  handleDelete,
  handleDownload,
  startRemarkEdit,
  cancelRemarkEdit,
  saveRemarkEdit,
  getDailyImageThumbnailUrl,
  getDailyImageDownloadUrl
} = useDailyImage();

const sourceOptions = [
  { label: "全部", value: "" },
  { label: "Unsplash", value: "unsplash" },
  { label: "本地", value: "local" },
  { label: "上传", value: "upload" }
];

function formatFileSize(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getSourceType(type: string) {
  const map: Record<string, string> = {
    unsplash: "info",
    local: "warning",
    upload: "success"
  };
  return map[type] || "info";
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
        <el-button
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
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
      </template>
      <template v-slot="{ size }">
        <div v-loading="loading" class="image-gallery">
          <el-empty
            v-if="!loading && dataList.length === 0"
            description="暂无图片"
            :image-size="90"
          />
          <div v-else class="image-grid">
            <div v-for="item in dataList" :key="item.id" class="image-card">
              <div class="image-card__preview">
                <ReImageViewer
                  :src="getDailyImageThumbnailUrl(item.id)"
                  :preview-src-list="[getDailyImageDownloadUrl(item.id)]"
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
                    {{ item.source }}
                  </el-tag>
                </div>
                <div class="image-card__meta">
                  <span>{{ formatFileSize(item.fileSize) }}</span>
                  <span>{{ item.extension?.toUpperCase() }}</span>
                </div>
                <div class="image-card__remark">
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
                  link
                  type="primary"
                  :size="size"
                  @click="startRemarkEdit(item)"
                >
                  备注
                </el-button>
                <el-button
                  link
                  type="success"
                  :size="size"
                  @click="handleDownload(item)"
                >
                  下载
                </el-button>
                <el-button
                  link
                  type="danger"
                  :size="size"
                  @click="handleDelete(item)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="pagination.total > 0" class="mt-4 flex justify-end">
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

.image-gallery {
  min-height: 200px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.image-card {
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
    transform: translateY(-2px);

    .image-card__actions {
      opacity: 1;
    }
  }
}

.image-card__preview {
  width: 100%;
  height: 180px;
  overflow: hidden;
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
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.image-card__meta {
  display: flex;
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
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;

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
  gap: 8px;
  justify-content: center;
  padding: 8px 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
</style>
