<script setup lang="ts">
import { ref } from "vue";
import { useSysNotice } from "./hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({
  name: "SystemNotice"
});

const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  noticeStats,
  searchFields,
  onSearch,
  resetForm,
  openDialog,
  handleDelete,
  handlePublish,
  handleWithdraw,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useSysNotice(tableRef);

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main notice-page">
    <section class="notice-hero bg-bg_color">
      <div class="notice-hero-content">
        <div class="notice-hero-eyebrow">公告通知模块</div>
        <h2>面向 Web / App 的统一公告管理</h2>
        <p>
          对齐公告管理、用户已读和顶部通知中心接口，集中管理发布、撤回、平台可见性与展示周期。
        </p>
      </div>
      <div class="notice-stat-grid">
        <div class="notice-stat-card is-total">
          <span>当前页公告</span>
          <strong>{{ noticeStats.total }}</strong>
        </div>
        <div class="notice-stat-card is-published">
          <span>已发布</span>
          <strong>{{ noticeStats.published }}</strong>
        </div>
        <div class="notice-stat-card is-draft">
          <span>草稿</span>
          <strong>{{ noticeStats.draft }}</strong>
        </div>
        <div class="notice-stat-card is-urgent">
          <span>高优先级</span>
          <strong>{{ noticeStats.urgent }}</strong>
        </div>
      </div>
    </section>

    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="3"
      @search="handleSearch"
      @reset="resetForm"
    />

    <PureTableBar title="公告列表" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'notice:sysNotice:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增公告
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="id"
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
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #empty>
            <el-empty description="暂无公告，点击右上角新增第一条公告" />
          </template>
          <template #operation="{ row }">
            <el-button
              v-perms="'notice:sysNotice:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="Number(row.status) === 0 || Number(row.status) === 2"
              v-perms="'notice:sysNotice:publish'"
              class="reset-margin"
              link
              type="success"
              :size="size"
              @click="handlePublish(row)"
            >
              发布
            </el-button>
            <el-button
              v-if="Number(row.status) === 1"
              v-perms="'notice:sysNotice:withdraw'"
              class="reset-margin"
              link
              type="warning"
              :size="size"
              @click="handleWithdraw(row)"
            >
              撤回
            </el-button>
            <el-popconfirm
              :title="`是否确认删除「${row.title || row.id}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'notice:sysNotice:delete'"
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style lang="scss" scoped>
.notice-page {
  .notice-hero {
    display: flex;
    gap: 24px;
    align-items: stretch;
    justify-content: space-between;
    padding: 22px 24px;
    margin-bottom: 12px;
    overflow: hidden;
    border-radius: 12px;
  }

  .notice-hero-content {
    max-width: 620px;

    h2 {
      margin: 6px 0 8px;
      font-size: 22px;
      font-weight: 700;
      line-height: 32px;
      color: var(--el-text-color-primary);
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 22px;
      color: var(--el-text-color-secondary);
    }
  }

  .notice-hero-eyebrow {
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
    color: var(--el-color-primary);
  }

  .notice-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(92px, 1fr));
    gap: 10px;
    min-width: 430px;
  }

  .notice-stat-card {
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;

    span {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    strong {
      font-size: 24px;
      line-height: 30px;
      color: var(--el-text-color-primary);
    }
  }

  .is-total {
    background: var(--el-color-primary-light-9);
  }

  .is-published {
    background: var(--el-color-success-light-9);
  }

  .is-draft {
    background: var(--el-color-info-light-9);
  }

  .is-urgent {
    background: var(--el-color-warning-light-9);
  }
}

:deep(.notice-title-cell) {
  min-width: 0;
  text-align: left;
}

:deep(.notice-title-line) {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

:deep(.notice-title-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

:deep(.notice-content-preview) {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
}

:deep(.notice-priority-cell),
:deep(.notice-status-cell),
:deep(.notice-time-cell) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

:deep(.notice-platform-cell) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

:deep(.notice-time-cell em) {
  font-style: normal;
  color: var(--el-text-color-placeholder);
}

:deep(.notice-empty-text) {
  color: var(--el-text-color-placeholder);
}

@media (width <= 1200px) {
  .notice-page {
    .notice-hero {
      flex-direction: column;
    }

    .notice-stat-grid {
      min-width: 0;
    }
  }
}

@media (width <= 768px) {
  .notice-page {
    .notice-stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
</style>
