<script setup lang="ts">
import { computed } from "vue";
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

const emptyDescription = computed(() =>
  hasFilter.value
    ? "当前筛选条件下没有模型，可清空筛选后重试"
    : "暂无模型目录数据，点「同步全部」从供应商拉取模型列表"
);

function handleSearch() {
  form.current = 1;
  onSearch();
}

/** 空态里的「清空筛选」：ReSearchBar 的 reset 需要表单实例，这里直接复位查询条件 */
function clearFilters() {
  form.provider = "";
  form.capability = "";
  form.keyword = "";
  form.available = "";
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

    <el-empty
      v-if="!loading && !dataList.length"
      :image-size="90"
      :description="emptyDescription"
    >
      <el-button
        v-if="!hasFilter"
        v-perms="'monitor:aiProviderModel:sync'"
        type="primary"
        :loading="syncLoading"
        :icon="useRenderIcon(Sync)"
        @click="handleSync()"
      >
        同步全部
      </el-button>
      <el-button v-else plain @click="clearFilters">清空筛选</el-button>
    </el-empty>

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
