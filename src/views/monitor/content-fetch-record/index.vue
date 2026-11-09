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
  itemColumns,
  itemsVisible,
  itemsLoading,
  itemsList,
  itemsRecord,
  dataList,
  pagination,
  searchFields,
  onSearch,
  resetForm,
  exportExcel,
  exportLoading,
  handleSizeChange,
  handleCurrentChange
} = useContentFetchRecord();

function handleSearch() {
  form.current = 1;
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
      @reset="resetForm"
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
          :size="size"
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

    <!-- 抓取内容抽屉：回答「这条流水到底抓到了什么」 -->
    <el-drawer
      v-model="itemsVisible"
      :title="`抓取内容 #${itemsRecord?.id ?? ''}`"
      size="900px"
      destroy-on-close
    >
      <el-descriptions
        v-if="itemsRecord"
        :column="2"
        border
        size="small"
        class="mb-3"
      >
        <el-descriptions-item label="信源">
          {{ itemsRecord.sourceKey || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="业务日期">
          {{ itemsRecord.bizDate || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="抓取结果">
          {{ itemsRecord.status || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="条目数">
          {{ itemsRecord.itemCount ?? 0 }}
        </el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="!itemsLoading && itemsList.length === 0"
        type="info"
        :closable="false"
        show-icon
        title="本次没有内容条目"
        description="可能是：命中缓存且该次未落条目、抓取失败（见列表「错误信息」），或该流水写入早于条目存储上线。"
      />

      <pure-table
        v-else
        row-key="id"
        table-layout="auto"
        :loading="itemsLoading"
        :data="itemsList"
        :columns="itemColumns"
      />
    </el-drawer>
  </div>
</template>
