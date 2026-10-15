<script setup lang="ts">
import { onMounted } from "vue";
import { useContentFetchRecord } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({
  name: "ContentFetchRecord"
});

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  searchFields,
  onSearch,
  exportExcel,
  exportLoading,
  handleSizeChange,
  handleCurrentChange
} = useContentFetchRecord();

function handleSearch() {
  form.current = 1;
  onSearch();
}

function handleReset() {
  // ReSearchBar 内部已调用 formRef.resetFields()，此处只需复位页码并刷新
  form.current = 1;
  form.size = 10;
  onSearch();
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    />

    <PureTableBar title="内容源抓取流水" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'monitor:contentFetch:export'"
          type="primary"
          :loading="exportLoading"
          :icon="useRenderIcon(HugeiconsDownload01)"
          @click="exportExcel"
        >
          导出
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          row-key="id"
          align-whole="center"
          table-layout="auto"
          adaptive
          showOverflowTooltip
          :adaptiveConfig="{ offsetBottom: 108 }"
          :loading="loading"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        />
      </template>
    </PureTableBar>
  </div>
</template>
