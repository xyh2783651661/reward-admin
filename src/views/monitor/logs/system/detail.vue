<script setup lang="tsx">
import { computed, ref } from "vue";
import "vue-json-pretty/lib/styles.css";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
});

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
          <vue-json-pretty v-model:data="item.data" />
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
