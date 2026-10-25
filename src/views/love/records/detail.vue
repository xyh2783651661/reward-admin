<script setup lang="ts">
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import { ref, watch, computed } from "vue";
import {
  getLoveRecordDetail,
  getMediaViewUrl,
  getMediaThumbnailUrl
} from "@/api/love";
import { ReImageViewer } from "@/components/ReImageViewer";
import {
  DetailFields,
  DetailHeader,
  DetailPage,
  DetailSection,
  type DetailFieldItem
} from "@/components/ReDetail";
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

const moodMap: Record<string, { label: string; color: string }> = {
  heart: { label: "开心", color: "#ff6b6b" },
  smile: { label: "微笑", color: "#ffa726" },
  laugh: { label: "大笑", color: "#66bb6a" },
  sad: { label: "难过", color: "#42a5f5" },
  angry: { label: "生气", color: "#ef5350" },
  neutral: { label: "平静", color: "#78909c" }
};

const mood = computed(() => {
  const key = detail.value?.mood;
  return moodMap[key ?? ""] ?? { label: key || "-", color: "#909399" };
});

const formatTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : undefined;

const infoFields = computed<DetailFieldItem[]>(() => {
  const record = detail.value;
  return [
    { label: "记录日期", value: record?.recordDate },
    { label: "地点", value: record?.location?.name },
    { label: "详细地址", value: record?.location?.address, full: true },
    { label: "创建时间", value: formatTime(record?.createdAt) },
    { label: "更新时间", value: formatTime(record?.updatedAt) }
  ];
});

const previewList = computed(
  () => detail.value?.media?.map(m => getMediaViewUrl(m.id)) ?? []
);

async function loadDetail() {
  if (!props.id) return;

  loading.value = true;
  try {
    const { data } = await getLoveRecordDetail<RecordDetail>(props.id);
    detail.value = data;
  } catch (error) {
    message(getErrorMessage(error, "加载恋爱记录详情失败"), { type: "error" });
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  val => {
    if (val && props.id) {
      loadDetail();
    }
  }
);

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
    width="720px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="love-detail">
      <DetailPage v-if="detail">
        <DetailHeader :title="detail.recordDate || '恋爱记录'">
          <template #tags>
            <el-tag :color="mood.color" effect="dark" round size="small">
              {{ mood.label }}
            </el-tag>
          </template>
          <template #subtitle>ID：{{ detail.id }}</template>
        </DetailHeader>

        <DetailSection title="记录内容">
          <p class="love-detail__text">{{ detail.text || "暂无内容" }}</p>
        </DetailSection>

        <DetailSection
          title="图片"
          :description="
            detail.media?.length ? `${detail.media.length} 张` : undefined
          "
        >
          <div v-if="detail.media?.length" class="love-detail__media">
            <div
              v-for="item in detail.media"
              :key="item.id"
              class="love-detail__thumb"
            >
              <ReImageViewer
                :src="getMediaThumbnailUrl(item.id)"
                :preview-src-list="previewList"
                fit="cover"
              />
            </div>
          </div>
          <el-empty v-else description="暂无图片" :image-size="60" />
        </DetailSection>

        <DetailSection title="基本信息">
          <DetailFields :items="infoFields" :min-column-width="200" />
        </DetailSection>
      </DetailPage>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.love-detail {
  min-height: 200px;
}

.love-detail__text {
  margin: 0;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  word-break: break-word;
  white-space: pre-wrap;
}

.love-detail__media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.love-detail__thumb {
  height: 120px;
  overflow: hidden;
  border-radius: var(--ra-radius-md);
}
</style>
