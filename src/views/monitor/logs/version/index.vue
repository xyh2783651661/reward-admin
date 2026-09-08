<script setup lang="ts">
import { ref } from "vue";
import { useVersionLog as useRole } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";

defineOptions({
  name: "VersionLog"
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
  handlePublish,
  handleYank,
  handleEditRelease
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
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar :columns="columns" @refresh="onSearch">
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
              v-if="row.state === 'BETA' || row.state === 'DRAFT'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              @click="handlePublish(row)"
            >
              发版
            </el-button>
            <el-button
              class="reset-margin"
              link
              type="primary"
              :size="size"
              @click="handleEditRelease(row)"
            >
              灰度/策略
            </el-button>
            <el-button
              v-if="row.state !== 'YANKED'"
              class="reset-margin"
              link
              type="danger"
              :size="size"
              @click="handleYank(row)"
            >
              撤回
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
