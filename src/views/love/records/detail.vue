<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  getLoveRecordDetail,
  getMediaViewUrl,
  getMediaThumbnailUrl
} from "@/api/love";
import { ReImageViewer } from "@/components/ReImageViewer";
import dayjs from "dayjs";

interface Props {
  /** 记录ID */
  id: string | number;
  /** 是否显示 */
  visible: boolean;
}

interface RecordDetail {
  id: string;
  recordDate: string;
  text: string;
  mood: string;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  media: Array<{
    id: string;
    type: string;
    url: string;
    thumbnailUrl: string;
    fileName: string;
    mimeType: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "close"): void;
}>();

const loading = ref(false);
const detail = ref<RecordDetail | null>(null);

const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit("update:visible", val)
});

// 心情映射
const moodMap: Record<string, { label: string; color: string }> = {
  heart: { label: "开心", color: "#ff6b6b" },
  smile: { label: "微笑", color: "#ffa726" },
  laugh: { label: "大笑", color: "#66bb6a" },
  sad: { label: "难过", color: "#42a5f5" },
  angry: { label: "生气", color: "#ef5350" },
  neutral: { label: "平静", color: "#78909c" }
};

// 获取心情信息
function getMoodInfo(mood: string) {
  return moodMap[mood] || { label: mood || "-", color: "#909399" };
}

// 加载详情数据
async function loadDetail() {
  if (!props.id) return;

  loading.value = true;
  try {
    const { data } = await getLoveRecordDetail(props.id);
    detail.value = data;
  } catch (error) {
    console.error("加载详情失败:", error);
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

// 监听visible变化，打开时加载数据
watch(
  () => props.visible,
  val => {
    if (val && props.id) {
      loadDetail();
    }
  }
);

// 监听id变化
watch(
  () => props.id,
  () => {
    if (props.visible) {
      loadDetail();
    }
  }
);

function handleClose() {
  dialogVisible.value = false;
  emit("close");
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="恋爱记录详情"
    width="680px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="detail-container">
      <template v-if="detail">
        <!-- 基本信息 -->
        <div class="detail-section">
          <h4 class="section-title">基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">{{
              detail.id
            }}</el-descriptions-item>
            <el-descriptions-item label="日期">{{
              detail.recordDate || "-"
            }}</el-descriptions-item>
            <el-descriptions-item label="心情">
              <el-tag
                :color="getMoodInfo(detail.mood).color"
                effect="dark"
                round
                size="small"
              >
                {{ getMoodInfo(detail.mood).label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="地点">
              {{ detail.location?.name || "-" }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">
              {{
                detail.createdAt
                  ? dayjs(detail.createdAt).format("YYYY-MM-DD HH:mm:ss")
                  : "-"
              }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间" :span="2">
              {{
                detail.updatedAt
                  ? dayjs(detail.updatedAt).format("YYYY-MM-DD HH:mm:ss")
                  : "-"
              }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 内容 -->
        <div class="detail-section">
          <h4 class="section-title">内容</h4>
          <div class="content-text">{{ detail.text || "暂无内容" }}</div>
        </div>

        <!-- 媒体图片 -->
        <div v-if="detail.media?.length" class="detail-section">
          <h4 class="section-title">图片 ({{ detail.media.length }})</h4>
          <div class="media-grid">
            <div v-for="item in detail.media" :key="item.id" class="media-item">
              <ReImageViewer
                :src="getMediaThumbnailUrl(item.id)"
                :preview-src-list="detail.media.map(m => getMediaViewUrl(m.id))"
                fit="cover"
              />
            </div>
          </div>
        </div>

        <div v-else class="detail-section">
          <h4 class="section-title">图片</h4>
          <el-empty description="暂无图片" :image-size="60" />
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.detail-container {
  min-height: 200px;
}

.detail-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    border-left: 3px solid var(--el-color-primary);
    padding-left: 10px;
  }
}

.content-text {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;

  .media-item {
    width: 100%;
    height: 150px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s;

    &:hover {
      transform: scale(1.05);
    }
  }
}
</style>
