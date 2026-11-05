<script setup lang="ts">
import { ref } from "vue";
import type { TaskLogException } from "@/api/logs";
import { copyText } from "../format";

defineProps<{ exception: TaskLogException }>();

const rootRef = ref<HTMLElement>();
const open = ref(false);

/** 从指标卡跳转过来时：展开堆栈并滚动到可见区域 */
function reveal() {
  open.value = true;
  rootRef.value?.scrollIntoView({ block: "start", behavior: "smooth" });
}

defineExpose({ reveal });
</script>

<template>
  <section ref="rootRef" class="exception-card" aria-label="异常信息">
    <header class="exception-card__head">
      <IconifyIconOnline icon="ri:bug-line" />
      <h3>异常信息</h3>
      <code v-if="exception.type" :title="exception.type">
        {{ exception.type }}
      </code>
      <el-button
        v-if="exception.stackTrace"
        class="exception-card__toggle"
        link
        type="danger"
        @click="open = !open"
      >
        {{ open ? "收起堆栈" : "展开堆栈" }}
      </el-button>
    </header>

    <p class="exception-card__message">
      {{ exception.message || "无异常消息" }}
    </p>

    <template v-if="open && exception.stackTrace">
      <div class="exception-card__bar">
        <span>堆栈信息</span>
        <el-button
          link
          type="primary"
          size="small"
          @click="copyText(exception.stackTrace, '堆栈信息')"
        >
          复制堆栈
        </el-button>
      </div>
      <pre class="exception-card__stack">{{ exception.stackTrace }}</pre>
    </template>
  </section>
</template>

<style scoped lang="scss">
.exception-card {
  padding: 16px 20px;
  background: color-mix(
    in srgb,
    var(--el-color-danger) 5%,
    var(--el-bg-color-overlay)
  );
  border: 1px solid color-mix(in srgb, var(--el-color-danger) 28%, transparent);
  border-radius: var(--ra-radius-lg);
}

.exception-card__head {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--el-color-danger);

  h3 {
    margin: 0;
    font-size: var(--ra-font-md);
    font-weight: 600;
  }

  code {
    min-width: 0;
    padding: 1px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--el-font-family-mono, ui-monospace, monospace);
    font-size: var(--ra-font-xs);
    white-space: nowrap;
    background: color-mix(in srgb, var(--el-color-danger) 12%, transparent);
    border-radius: var(--ra-radius-md);
  }
}

.exception-card__toggle {
  margin-left: auto;
}

.exception-card__message {
  margin: 8px 0 0;
  font-size: var(--ra-font-base);
  line-height: 1.7;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.exception-card__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.exception-card__stack {
  max-height: 340px;
  padding: 12px 14px;
  margin: 6px 0 0;
  overflow: auto;
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  font-size: var(--ra-font-xs);
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre;
  background: var(--el-fill-color-light);
  border-radius: var(--ra-radius-lg);
}
</style>
