<script setup lang="tsx">
import { computed } from "vue";
import "vue-json-pretty/lib/styles.css";
import VueJsonPretty from "vue-json-pretty";
import type { JSONDataType } from "vue-json-pretty/types/utils";

interface SystemLogDetailItem {
  ip?: string;
  ipLocation?: string;
  osType?: string;
  browserType?: string;
  module?: string;
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

const normalizeJsonData = (value: unknown): JSONDataType => {
  if (value == null) return null;
  if (Array.isArray(value)) return value;

  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    case "object":
      return value as Record<string, unknown>;
    default:
      return String(value);
  }
};

const columns = [
  {
    label: "IP 地址",
    prop: "ip"
  },
  {
    label: "地点",
    prop: "ipLocation"
  },
  {
    label: "操作系统",
    prop: "osType"
  },
  {
    label: "浏览器类型",
    prop: "browserType"
  },
  {
    label: "所属模块",
    prop: "module"
  },
  {
    label: "请求时间",
    prop: "createdTime"
  },
  {
    label: "请求方法",
    prop: "method"
  },
  {
    label: "请求耗时",
    prop: "timeCost"
  },
  {
    label: "请求接口",
    prop: "uri",
    copy: true
  },
  {
    label: "TraceId",
    prop: "traceId",
    copy: true
  }
];

const dataList = computed(() => {
  const item = props.data?.[0];
  if (!item) return [];

  const list = [
    {
      title: "响应头",
      name: "responseHeaders",
      data: normalizeJsonData(item.responseHeaders)
    },
    {
      title: "响应体",
      name: "responseBody",
      data: normalizeJsonData(item.responseBody)
    },
    {
      title: "请求头",
      name: "requestHeaders",
      data: normalizeJsonData(item.requestHeaders)
    },
    {
      title: "请求体",
      name: "requestBody",
      data: normalizeJsonData(item.requestBody)
    }
  ];

  // ⚠️ 注意：异常 ≠ success
  if (!item.success) {
    list.push(
      {
        title: "异常类型",
        name: "exceptionType",
        data: normalizeJsonData(item.exceptionType)
      },
      {
        title: "异常信息",
        name: "exceptionMessage",
        data: normalizeJsonData(item.exceptionMessage)
      },
      {
        title: "异常堆栈",
        name: "exceptionStackTrace",
        data: normalizeJsonData(item.exceptionStackTrace)
      }
    );
  }

  return list;
});
</script>

<template>
  <div>
    <el-scrollbar>
      <PureDescriptions border :data="data" :columns="columns" :column="5" />
    </el-scrollbar>
    <el-tabs :modelValue="'responseBody'" type="border-card" class="mt-4">
      <el-tab-pane
        v-for="(item, index) in dataList"
        :key="index"
        :name="item.name"
        :label="item.title"
      >
        <el-scrollbar max-height="calc(100vh - 240px)">
          <vue-json-pretty v-model:data="item.data" />
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
