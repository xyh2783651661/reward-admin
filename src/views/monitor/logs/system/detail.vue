<script setup lang="tsx">
import { computed } from "vue";
import ReJsonField from "@/components/ReJsonField/index.vue";

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
    label: "操作类型",
    prop: "action"
  },
  {
    label: "资源类型",
    prop: "resourceType"
  },
  {
    label: "资源ID",
    prop: "resourceId"
  },
  {
    label: "业务类型",
    prop: "bizType"
  },
  {
    label: "业务ID",
    prop: "bizId"
  },
  {
    label: "操作人ID",
    prop: "operatorId"
  },
  {
    label: "操作人",
    prop: "operatorName"
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
      data: item.responseHeaders
    },
    {
      title: "响应体",
      name: "responseBody",
      data: item.responseBody
    },
    {
      title: "请求头",
      name: "requestHeaders",
      data: item.requestHeaders
    },
    {
      title: "请求体",
      name: "requestBody",
      data: item.requestBody
    }
  ];

  // ⚠️ 注意：异常 ≠ success
  if (!item.success) {
    list.push(
      {
        title: "异常类型",
        name: "exceptionType",
        data: item.exceptionType
      },
      {
        title: "异常信息",
        name: "exceptionMessage",
        data: item.exceptionMessage
      },
      {
        title: "异常堆栈",
        name: "exceptionStackTrace",
        data: item.exceptionStackTrace
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
          <ReJsonField :data="item.data" readonly :deep="3" />
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
