<script setup lang="ts">
import { ref } from "vue";
import { useOperationLog as useRole } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import AntDesignExceptionOutlined from "~icons/ant-design/exception-outlined";

defineOptions({
  name: "OperationLog"
});

const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  searchFields,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  onDetail
} = useRole(tableRef);

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main">
    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="4"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="任务执行日志" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="id"
          align-whole="center"
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              v-if="!row.success || row.hasSteps || row.hasException"
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(AntDesignExceptionOutlined)"
              @click="onDetail(row)"
            >
              {{ row.success ? "执行详情" : "异常详情" }}
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}
</style>
