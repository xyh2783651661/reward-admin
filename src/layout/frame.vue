<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { ref, unref, watch, onMounted, nextTick, computed } from "vue";

defineOptions({
  name: "LayFrame"
});

const props = defineProps<{
  frameInfo?: {
    frameSrc?: string;
    fullPath?: string;
  };
}>();

const { t } = useI18n();
const loading = ref(true);
const currentRoute = useRoute();
const frameSrc = ref<string>("");
const frameRef = ref<HTMLElement | null>(null);
const fallbackTimer = ref<number | null>(null);

if (unref(currentRoute.meta)?.frameSrc) {
  frameSrc.value = unref(currentRoute.meta)?.frameSrc as string;
}

/**
 * Mixed Content 检测：当前页面为 HTTPS 但内嵌地址为 HTTP 时，
 * 浏览器会强制拦截 iframe。此时降级为提示 + 新标签打开，避免白屏。
 */
const isMixedContent = computed(() => {
  const src = frameSrc.value;
  if (!src) return false;
  return (
    window.location.protocol === "https:" && /^http:\/\//i.test(src.trim())
  );
});

function openInNewTab() {
  if (frameSrc.value) {
    window.open(frameSrc.value, "_blank", "noopener");
  }
}

function clearFallbackTimer() {
  if (fallbackTimer.value !== null) {
    clearTimeout(fallbackTimer.value);
    fallbackTimer.value = null;
  }
}

function hideLoading() {
  loading.value = false;
  clearFallbackTimer();
}

function init() {
  nextTick(() => {
    const iframe = unref(frameRef);
    if (!iframe) return;
    const _frame = iframe as any;
    if (_frame.attachEvent) {
      _frame.attachEvent("onload", hideLoading);
    } else {
      iframe.onload = hideLoading;
    }
  });
}

let isRedirect = false;

watch(
  () => currentRoute.fullPath,
  path => {
    if (
      currentRoute.name === "Redirect" &&
      props.frameInfo?.fullPath &&
      path.includes(props.frameInfo.fullPath)
    ) {
      isRedirect = true;
      loading.value = true;
      return;
    }
    if (props.frameInfo?.fullPath === path && isRedirect) {
      loading.value = true;
      clearFallbackTimer();
      const url = new URL(props.frameInfo.frameSrc, window.location.origin);
      const joinChar = url.search ? "&" : "?";
      frameSrc.value = `${props.frameInfo.frameSrc}${joinChar}t=${Date.now()}`;
      fallbackTimer.value = window.setTimeout(() => {
        if (loading.value) {
          hideLoading();
        }
      }, 1500);
      isRedirect = false;
    }
  },
  { immediate: true }
);

onMounted(() => {
  init();
});
</script>

<template>
  <!-- HTTPS 页面无法内嵌 HTTP 地址（Mixed Content 被浏览器拦截），降级为新标签打开 -->
  <div v-if="isMixedContent" class="frame-fallback">
    <el-result
      icon="warning"
      title="该页面需在新标签打开"
      sub-title="当前站点为 HTTPS，而目标地址为 HTTP，浏览器出于安全策略无法内嵌显示，请点击下方按钮在新标签页打开。"
    >
      <template #extra>
        <el-button type="primary" @click="openInNewTab">
          在新标签打开
        </el-button>
      </template>
    </el-result>
  </div>
  <div
    v-else
    v-loading="loading"
    class="frame"
    :element-loading-text="t('status.pureLoad')"
  >
    <iframe ref="frameRef" :src="frameSrc" class="frame-iframe" />
  </div>
</template>

<style lang="scss" scoped>
.frame {
  position: absolute;
  inset: 0;

  .frame-iframe {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 0;
  }
}

.frame-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.main-content {
  margin: 2px 0 0 !important;
}
</style>
