<script setup lang="ts">
import { ref } from "vue";
import { useTaskCompensation } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "~icons/ri/search-line";
import RiRefreshLine from "~icons/ri/refresh-line";
import RiPlayCircleLine from "~icons/ri/play-circle-line";

defineOptions({
  name: "TaskCompensation"
});

const tableRef = ref();

const {
  loading,
  keyword,
  filteredList,
  stats,
  columns,
  onSearch,
  openTriggerDialog
} = useTaskCompensation();
</script>

<template>
  <div class="main">
    <el-card shadow="never" class="mb-4!">
      <div class="flex flex-wrap items-center gap-x-10 gap-y-3">
        <div>
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            可补偿任务
          </div>
          <div class="text-2xl leading-8 font-medium">{{ stats.total }}</div>
        </div>
        <div>
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            允许手动触发
          </div>
          <div class="text-2xl leading-8 font-medium">
            {{ stats.compensable }}
          </div>
        </div>
        <div>
          <div class="text-xs text-[var(--el-text-color-secondary)]">
            含前置依赖
          </div>
          <div class="text-2xl leading-8 font-medium">{{ stats.withDeps }}</div>
        </div>
        <el-text type="info" size="small" class="ml-auto">
          任务码由后端 @TaskGuard 注解驱动，新增任务无需改动前端
        </el-text>
      </div>
    </el-card>

    <PureTableBar title="定时任务补偿" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索任务码 / 名称 / 描述"
          :prefix-icon="useRenderIcon(Search)"
          style="width: 260px"
        />
      </template>

      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="code"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          :data="filteredList"
          :columns="dynamicColumns"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'monitor:taskCompensation:trigger'"
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :disabled="!row.compensable"
              :icon="useRenderIcon(RiPlayCircleLine)"
              @click="openTriggerDialog(row)"
            >
              {{ row.compensable ? "触发补偿" : "已禁用" }}
            </el-button>
          </template>

          <template #empty>
            <el-empty :image-size="80" description="暂无数据">
              <el-button
                type="primary"
                :icon="useRenderIcon(RiRefreshLine)"
                @click="onSearch"
              >
                重新加载
              </el-button>
            </el-empty>
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
