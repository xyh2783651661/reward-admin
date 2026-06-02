<script setup lang="ts">
import { ref, watch } from "vue";
import { formRules } from "./utils/rule";
import { FormProps } from "./utils/types";
import {
  uploadMedia,
  deleteMedia,
  getMediaViewUrl,
  getMediaThumbnailUrl
} from "@/api/love";
import { ReImageViewer } from "@/components/ReImageViewer";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { UploadFile } from "element-plus";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    id: "",
    recordDate: "",
    text: "",
    mood: "",
    location: { name: "", latitude: 0, longitude: 0 },
    media: []
  })
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const uploadLoading = ref(false);
const mediaList = ref<any[]>([]);

// 监听 media 变化，初始化媒体列表
watch(
  () => props.formInline.media,
  val => {
    if (Array.isArray(val) && val.length > 0) {
      // 如果是对象数组，直接使用；如果是ID数组，转换为对象数组
      if (typeof val[0] === "object") {
        mediaList.value = [...val];
      } else {
        mediaList.value = val.map(id => ({ id, isNew: false }));
      }
    } else {
      mediaList.value = [];
    }
  },
  { immediate: true }
);

// 获取媒体URL
function getMediaUrl(item: any) {
  return getMediaViewUrl(item.id);
}

function getMediaThumbUrl(item: any) {
  return getMediaThumbnailUrl(item.id);
}

// 上传图片
async function handleUpload(file: UploadFile) {
  if (!file.raw) return;

  uploadLoading.value = true;
  try {
    const result = await uploadMedia([file.raw]);
    if (result.code === 200 && result.data?.length) {
      const newMedia = result.data[0];
      mediaList.value.push({ ...newMedia, isNew: true });
      updateFormMedia();
      message("上传成功", { type: "success" });
    } else {
      message(result.msg || "上传失败", { type: "error" });
    }
  } catch {
    message("上传失败", { type: "error" });
  } finally {
    uploadLoading.value = false;
  }
}

// 删除图片
async function handleDeleteMedia(item: any, index: number) {
  try {
    await ElMessageBox.confirm("是否确认删除该图片？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });

    // 如果是已存在的媒体，需要调用删除接口
    if (!item.isNew && item.id) {
      const result = await deleteMedia(item.id);
      if (result.code !== 200) {
        message(result.msg || "删除失败", { type: "error" });
        return;
      }
    }

    mediaList.value.splice(index, 1);
    updateFormMedia();
    message("删除成功", { type: "success" });
  } catch {
    // cancelled
  }
}

// 更新表单中的media字段
function updateFormMedia() {
  newFormInline.value.media = mediaList.value.map(item => item.id);
}

// 上传前校验
function beforeUpload(file: File) {
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    message("只能上传图片文件", { type: "error" });
    return false;
  }
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message("图片大小不能超过 10MB", { type: "error" });
    return false;
  }
  return true;
}

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="82px"
  >
    <el-form-item label="日期" prop="recordDate">
      <el-date-picker
        v-model="newFormInline.recordDate"
        type="recordDate"
        value-format="YYYY-MM-DD"
        placeholder="请选择日期"
        clearable
      />
    </el-form-item>

    <el-form-item label="内容" prop="text">
      <el-input
        v-model="newFormInline.text"
        type="textarea"
        :rows="4"
        placeholder="请输入内容"
      />
    </el-form-item>

    <el-form-item label="心情" prop="mood">
      <el-input
        v-model="newFormInline.mood"
        clearable
        placeholder="请输入心情"
      />
    </el-form-item>

    <el-form-item label="地点" prop="location.name">
      <el-input
        v-model="newFormInline.location.name"
        clearable
        placeholder="请输入地点名称"
      />
    </el-form-item>

    <el-form-item label="图片">
      <div class="media-upload-area">
        <!-- 已有图片列表 -->
        <div v-if="mediaList.length" class="media-preview-list">
          <div
            v-for="(item, index) in mediaList"
            :key="item.id"
            class="media-preview-item"
          >
            <ReImageViewer
              :src="getMediaThumbUrl(item)"
              :preview-src-list="mediaList.map(m => getMediaUrl(m))"
              fit="cover"
            />
            <div class="media-preview-overlay">
              <el-button
                type="danger"
                :icon="'ep:delete'"
                circle
                size="small"
                @click="handleDeleteMedia(item, index)"
              />
            </div>
          </div>
        </div>

        <!-- 上传按钮 -->
        <el-upload
          :show-file-list="false"
          :before-upload="beforeUpload"
          :http-request="({ file }) => handleUpload(file)"
          accept="image/*"
          class="media-upload-btn"
        >
          <div v-loading="uploadLoading" class="upload-trigger">
            <el-icon v-if="!uploadLoading" class="upload-icon"
              ><Plus
            /></el-icon>
            <span v-if="!uploadLoading" class="upload-text">上传图片</span>
          </div>
        </el-upload>
      </div>
      <div class="upload-tip">支持 jpg、png、gif 格式，单张图片不超过 10MB</div>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.media-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

.media-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.media-preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);

  &:hover {
    .media-preview-overlay {
      opacity: 1;
    }
  }
}

.media-preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.media-upload-btn {
  width: 100px;
  height: 100px;
}

.upload-trigger {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
  }

  .upload-icon {
    font-size: 28px;
    color: var(--el-text-color-placeholder);
  }

  .upload-text {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
