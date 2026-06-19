<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useProviderStatus } from "../hook/useProviderStatus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "ProviderStatus"
});

const tableRef = ref();

const {
  loading,
  columns,
  dataList,
  pagination,
  statsOverview,
  onSearch,
  onProbe,
  onToggleEnable,
  onBatchEnable,
  onBatchDisable,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useProviderStatus(tableRef);

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div>
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">总供应商数</div>
          <div class="stat-value text-primary">
            {{ statsOverview.totalProviders }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">正常运行</div>
          <div class="stat-value text-success">{{ statsOverview.upCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">异常/停机</div>
          <div class="stat-value text-danger">
            {{ statsOverview.warnCount + statsOverview.downCount }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">未解决告警</div>
          <div class="stat-value text-warning">
            {{ statsOverview.openAlertCount }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <PureTableBar title="供应商状态" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="primary"
          :icon="useRenderIcon('ep:check')"
          @click="onBatchEnable"
        >
          批量启用
        </el-button>
        <el-button
          type="danger"
          :icon="useRenderIcon('ep:close')"
          @click="onBatchDisable"
        >
          批量禁用
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
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
          @selection-change="
            rows => {
              selectedRows = rows;
            }
          "
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :loading="row._probing"
              @click="onProbe(row)"
            >
              探测
            </el-button>
            <el-button
              class="reset-margin outline-hidden!"
              link
              :type="row.enabled ? 'danger' : 'success'"
              :size="size"
              @click="onToggleEnable(row)"
            >
              {{ row.enabled ? "禁用" : "启用" }}
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.stat-card {
  text-align: center;

  .stat-title {
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .stat-value {
    font-size: 28px;
    font-weight: 600;
  }
}
</style>
