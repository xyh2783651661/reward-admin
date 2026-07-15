<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useGeoProviderStatus } from "../hook/useGeoProviderStatus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "GeoProviderStatus"
});

const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  statsOverview,
  dropdownOptions,
  selectedRows,
  onSearch,
  onProbe,
  onToggleEnable,
  onReset,
  onBatchEnable,
  onBatchDisable,
  onBatchReset,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  getPoolLabel
} = useGeoProviderStatus(tableRef);

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div>
    <!-- 顶部总览 -->
    <el-row :gutter="16" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">总来源数</div>
          <div class="stat-value text-primary">
            {{ statsOverview.totalProviders }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">正常</div>
          <div class="stat-value text-success">{{ statsOverview.upCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">异常 / 停机</div>
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

    <!-- 按池汇总 -->
    <el-row :gutter="16" class="mb-4">
      <el-col
        v-for="pool in statsOverview.countsByPool || []"
        :key="pool.poolName"
        :span="8"
      >
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">{{ getPoolLabel(pool.poolName) }}</div>
          <div class="stat-value">
            <span class="text-success">{{ pool.up }}</span>
            /
            <span class="text-info">{{ pool.total }}</span>
            <span
              v-if="pool.down > 0"
              class="text-danger"
              style="margin-left: 8px; font-size: 14px"
            >
              异常 {{ pool.down }}
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选：池子 -->
    <el-form
      :inline="true"
      :model="form"
      class="bg-bg_color w-full pl-8 pt-[12px]"
    >
      <el-form-item label="池子">
        <el-select
          v-model="form.poolName"
          placeholder="全部池子"
          clearable
          class="w-[200px]!"
          @change="onSearch"
        >
          <el-option
            v-for="item in dropdownOptions.pools"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="来源状态" :columns="columns" @refresh="onSearch">
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
        <el-button
          type="warning"
          :icon="useRenderIcon(Refresh)"
          @click="onBatchReset"
        >
          批量重置熔断
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
              type="warning"
              :size="size"
              :loading="row._resetting"
              @click="onReset(row)"
            >
              重置熔断
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
