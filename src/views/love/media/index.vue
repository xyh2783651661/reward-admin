<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  getMemoryGallery,
  uploadMedia,
  deleteMedia,
  getMediaViewUrl,
  getMediaThumbnailUrl
} from "@/api/love";
import type { PaginationProps } from "@pureadmin/table";

import Refresh from "~icons/ep/refresh";
import Upload from "~icons/ep/upload";

defineOptions({
  name: "LoveMedia"
});

const loading = ref(true);
const uploadLoading = ref(false);
const dataList = ref<any[]>([]);
const fileInputRef = ref<HTMLInputElement>();

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 30,
  currentPage: 1,
  background: true
});

const current = ref(1);
const size = ref(30);

async function onSearch() {
  loading.value = true;
  try {
    const { data } = await getMemoryGallery({
      current: current.value,
      size: size.value
    });
    dataList.value = data?.records ?? [];
    pagination.total = data?.total ?? 0;
    pagination.pageSize = data?.size ?? size.value;
    pagination.currentPage = data?.current ?? current.value;
  } catch {
    dataList.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
}

function handleSizeChange(val: number) {
  size.value = val;
  current.value = 1;
  onSearch();
}

function handleCurrentChange(val: number) {
  current.value = val;
  onSearch();
}

function triggerUpload() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files?.length) return;

  uploadLoading.value = true;
  try {
    const result = await uploadMedia(Array.from(files));
    if (result.code === 200) {
      message("上传成功", { type: "success" });
      onSearch();
    } else {
      message(result.msg || "上传失败", { type: "error" });
    }
  } catch {
    message("上传失败", { type: "error" });
  } finally {
    uploadLoading.value = false;
    input.value = "";
  }
}

async function handleDelete(item: any) {
  try {
    await ElMessageBox.confirm("是否确认删除该媒体文件？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });
    const result = await deleteMedia(item.id);
    if (result.code === 200) {
      message("删除成功", { type: "success" });
      onSearch();
    }
  } catch {
    // cancelled
  }
}

function handlePreview(item: any) {
  const url = getMediaViewUrl(item.id);
  window.open(url, "_blank");
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main">
    <PureTableBar title="媒体文件" :columns="[]" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="primary"
          :loading="uploadLoading"
          :icon="useRenderIcon(Upload)"
          @click="triggerUpload"
        >
          上传文件
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="onSearch">
          刷新
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,video/*"
          class="hidden"
          @change="handleFileChange"
        />
      </template>
      <template v-slot="{ size }">
        <div v-loading="loading" class="media-gallery">
          <el-empty
            v-if="!loading && dataList.length === 0"
            description="暂无媒体文件"
            :image-size="90"
          />
          <div v-else class="media-grid">
            <div
              v-for="item in dataList"
              :key="item.id"
              class="media-card"
              @click="handlePreview(item)"
            >
              <div class="media-card__image">
                <img
                  :src="getMediaThumbnailUrl(item.id)"
                  :alt="item.fileName || 'media'"
                  loading="lazy"
                  @error="
                    ($event.target as HTMLImageElement).src =
                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjE0Ij7lm77niYc8L3RleHQ+PC9zdmc+'
                  "
                />
              </div>
              <div class="media-card__info">
                <span class="media-card__name">
                  {{ item.fileName || `媒体 #${item.id}` }}
                </span>
                <span class="media-card__date">
                  {{ item.recordDate || "" }}
                </span>
              </div>
              <div class="media-card__actions" @click.stop>
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
.media-gallery {
  min-height: 200px;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.media-card {
  overflow: hidden;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
    transform: translateY(-2px);

    .media-card__actions {
      opacity: 1;
    }
  }
}

.media-card__image {
  width: 100%;
  height: 180px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.media-card__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}

.media-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.media-card__date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.media-card__actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 12px 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
</style>
