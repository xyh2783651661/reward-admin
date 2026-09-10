<script setup lang="ts">
import { onMounted } from "vue";
import { useMailSendTask } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "~icons/ri/add-circle-line";
import EditPen from "~icons/ep/edit-pen";
import View from "~icons/ep/view";
import Delete from "~icons/ep/delete";
import Promotion from "~icons/ep/promotion";
import RefreshRight from "~icons/ep/refresh-right";

defineOptions({
  name: "MailSendTask"
});

const {
  form,
  loading,
  dataList,
  columns,
  pagination,
  searchFields,
  sendLoadingMap,
  onSearch,
  resetForm,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  openDialog,
  openDetail,
  handleSend,
  handleRetry,
  loadStatusOptions
} = useMailSendTask();

function handleSearch() {
  form.current = 1;
  onSearch();
}

onMounted(() => {
  loadStatusOptions();
});
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

    <PureTableBar title="邮件发送管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:mailTask:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新建邮件
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
              v-perms="'config:mailTask:query'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(View)"
              @click="openDetail(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="row.status === 0"
              v-perms="'config:mailTask:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 0"
              v-perms="'config:mailTask:send'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Promotion)"
              :loading="sendLoadingMap[row.id]"
              @click="handleSend(row)"
            >
              发送
            </el-button>
            <el-button
              v-if="row.status === 3 || row.status === 4"
              v-perms="'config:mailTask:retry'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(RefreshRight)"
              @click="handleRetry(row)"
            >
              重试
            </el-button>
            <el-popconfirm
              v-if="row.status === 0 || row.status === 5"
              :title="`是否确认删除任务「${row.taskName || row.taskNo}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:mailTask:delete'"
                  class="reset-margin"
                  link
                  type="primary"
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
