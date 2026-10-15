<script setup lang="ts">
import { computed, ref } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";
import {
  DetailFields,
  DetailHeader,
  DetailPage,
  DetailSection,
  DetailSummary,
  type DetailFieldItem,
  type DetailSummaryItem
} from "@/components/ReDetail";

defineOptions({ name: "SystemLogDetail" });

interface SystemLogDetailItem {
  ip?: string;
  ipLocation?: string;
  osType?: string;
  browserType?: string;
  module?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  bizType?: string;
  bizId?: string;
  operatorId?: string;
  operatorName?: string;
  createdTime?: string;
  method?: string;
  timeCost?: number;
  uri?: string;
  traceId?: string;
  responseHeaders?: unknown;
  responseBody?: unknown;
  requestHeaders?: unknown;
  requestBody?: unknown;
  success?: boolean;
  exceptionType?: unknown;
  exceptionMessage?: unknown;
  exceptionStackTrace?: unknown;
}

const props = withDefaults(
  defineProps<{
    data?: SystemLogDetailItem[];
  }>(),
  {
    data: () => []
  }
);

const item = computed<SystemLogDetailItem>(() => props.data?.[0] ?? {});
const activeTab = ref("responseBody");

const title = computed(() =>
  [item.value.module, item.value.action].filter(Boolean).join(" · ")
);

const summaryItems = computed<DetailSummaryItem[]>(() => [
  {
    label: "执行结果",
    value: item.value.success ? "成功" : "失败",
    tagType: item.value.success ? "success" : "danger"
  },
  { label: "请求方法", value: item.value.method },
  {
    label: "请求耗时",
    value: item.value.timeCost != null ? `${item.value.timeCost} ms` : undefined
  },
  { label: "请求时间", value: item.value.createdTime }
]);

const requestFields = computed<DetailFieldItem[]>(() => [
  {
    label: "请求接口",
    value: item.value.uri,
    mono: true,
    copy: true,
    full: true
  },
  {
    label: "TraceId",
    value: item.value.traceId,
    mono: true,
    copy: true,
    full: true
  },
  { label: "所属模块", value: item.value.module },
  { label: "操作类型", value: item.value.action },
  { label: "资源类型", value: item.value.resourceType },
  { label: "资源 ID", value: item.value.resourceId, mono: true, copy: true },
  { label: "业务类型", value: item.value.bizType },
  { label: "业务 ID", value: item.value.bizId, mono: true, copy: true }
]);

const operatorFields = computed<DetailFieldItem[]>(() => [
  { label: "操作人", value: item.value.operatorName },
  { label: "操作人 ID", value: item.value.operatorId, mono: true, copy: true },
  { label: "IP 地址", value: item.value.ip, mono: true, copy: true },
  { label: "地点", value: item.value.ipLocation },
  { label: "操作系统", value: item.value.osType },
  { label: "浏览器类型", value: item.value.browserType }
]);

const payloadTabs = computed(() => {
  const list = [
    { title: "响应体", name: "responseBody", data: item.value.responseBody },
    {
      title: "响应头",
      name: "responseHeaders",
      data: item.value.responseHeaders
    },
    { title: "请求体", name: "requestBody", data: item.value.requestBody },
    { title: "请求头", name: "requestHeaders", data: item.value.requestHeaders }
  ];

  if (!item.value.success) {
    list.push(
      {
        title: "异常类型",
        name: "exceptionType",
        data: item.value.exceptionType
      },
      {
        title: "异常信息",
        name: "exceptionMessage",
        data: item.value.exceptionMessage
      },
      {
        title: "异常堆栈",
        name: "exceptionStackTrace",
        data: item.value.exceptionStackTrace
      }
    );
  }

  return list;
});
</script>

<template>
  <DetailPage>
    <DetailHeader :title="title || '系统日志'">
      <template #tags>
        <el-tag :type="item.success ? 'success' : 'danger'" effect="light">
          {{ item.success ? "成功" : "失败" }}
        </el-tag>
      </template>
      <template #subtitle>
        <span v-if="item.method" class="log-method">{{ item.method }}</span>
        {{ item.uri || "-" }}
      </template>
    </DetailHeader>

    <DetailSummary :items="summaryItems" />

    <div class="log-info-grid">
      <DetailSection title="请求信息">
        <DetailFields :items="requestFields" :min-column-width="200" />
      </DetailSection>
      <DetailSection title="操作人与环境">
        <DetailFields :items="operatorFields" :min-column-width="180" />
      </DetailSection>
    </div>

    <DetailSection title="请求 / 响应数据" flush>
      <el-tabs v-model="activeTab" class="log-tabs">
        <el-tab-pane
          v-for="tab in payloadTabs"
          :key="tab.name"
          :name="tab.name"
          :label="tab.title"
          lazy
        >
          <el-scrollbar max-height="calc(100vh - 420px)">
            <div class="log-payload">
              <ReJsonField :data="tab.data" readonly :deep="3" />
            </div>
          </el-scrollbar>
        </el-tab-pane>
      </el-tabs>
    </DetailSection>
  </DetailPage>
</template>

<style scoped>
.log-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.log-method {
  margin-right: 6px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.log-tabs :deep(.el-tabs__header) {
  padding: 0 16px;
  margin: 0;
}

.log-payload {
  padding: 16px;
}

@media (width <= 1000px) {
  .log-info-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
