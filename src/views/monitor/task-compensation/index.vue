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

const { loading, keyword, filteredList, columns, onSearch, openTriggerDialog } =
  useTaskCompensation();
</script>

<template>
  <div class="main">
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
