<script setup lang="ts">
import { useProviderModel } from "./hook/useProviderModel";
import SyncResultDialog from "./components/sync-result-dialog.vue";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getProviderLabel } from "@/constants/ai-provider";
import Sync from "~icons/ri/refresh-line";
import AddFill from "~icons/ri/add-circle-line";
import EditPen from "~icons/ep/edit-pen";

defineOptions({ name: "AiProviderModel" });

const {
  form,
  searchFields,
  loading,
  columns,
  dataList,
  pagination,
  hasFilter,
  syncLoading,
  syncDialogVisible,
  syncResults,
  onSearch,
  resetForm,
  handleSync,
  openManualDialog,
  openCapabilityDialog,
  handleSizeChange,
  handleCurrentChange
} = useProviderModel();

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main provider-model-page">
    <header class="provider-model-hero">
      <div>
        <p class="provider-model-hero__eyebrow">Model Catalog</p>
        <h1>AI 模型目录</h1>
        <p>
          从供应商真实模型列表中选模型，避免配置的模型被下线后调用
          404。同步会把本次未返回的模型标记为已下线。
        </p>
      </div>
      <div class="provider-model-hero__tip">
        <el-tag effect="plain" type="info"
          >配置入口：系统配置 → ai.*.model</el-tag
        >
      </div>
    </header>

    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      @search="handleSearch"
      @reset="resetForm"
    />

    <el-alert
      v-if="!loading && !dataList.length"
      :type="hasFilter ? 'info' : 'warning'"
      :closable="false"
      show-icon
      :title="
        hasFilter
          ? '当前筛选条件下没有模型'
          : '模型目录还没有数据，先点「同步全部」拉取供应商模型列表'
      "
      :description="
        hasFilter
          ? '可清空筛选条件后重试。'
          : '供应商没有标准 /models 接口时同步会跳过，可用「手工补录」补一条。'
      "
    />

    <PureTableBar title="模型目录" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'monitor:aiProviderModel:sync'"
          type="primary"
          :loading="syncLoading"
          :icon="useRenderIcon(Sync)"
          @click="handleSync()"
        >
          同步全部
        </el-button>
        <el-button
          v-if="form.provider"
          v-perms="'monitor:aiProviderModel:sync'"
          plain
          :loading="syncLoading"
          :icon="useRenderIcon(Sync)"
          @click="handleSync(form.provider)"
        >
          同步 {{ getProviderLabel(form.provider) }}
        </el-button>
        <el-button
          v-perms="'monitor:aiProviderModel:manual'"
          plain
          :icon="useRenderIcon(AddFill)"
          @click="openManualDialog()"
        >
          手工补录
        </el-button>
      </template>

      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          align-whole="center"
          showOverflowTooltip
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
              v-perms="'monitor:aiProviderModel:capability'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openCapabilityDialog(row)"
            >
              修正能力
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="syncDialogVisible"
      title="模型目录同步结果"
      width="960px"
      draggable
      :close-on-click-modal="false"
    >
      <SyncResultDialog :results="syncResults" />
      <template #footer>
        <el-button type="primary" @click="syncDialogVisible = false">
          知道了
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.provider-model-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-model-hero {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: linear-gradient(
    135deg,
    var(--el-bg-color),
    var(--el-fill-color-light)
  );
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--ra-radius-lg);

  h1 {
    margin: 3px 0 6px;
    font-size: var(--ra-font-2xl);
    color: var(--el-text-color-primary);
  }

  p {
    max-width: 720px;
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}

.provider-model-hero__eyebrow {
  font-size: var(--ra-font-xs);
  font-weight: 700;
  color: var(--el-color-primary) !important;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.provider-model-hero__tip {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

@media (width <= 768px) {
  .provider-model-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
