<script setup lang="ts">
import { onMounted } from "vue";
import { useContentFetchRecord } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";

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
