<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useMailSendTask } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import AddFill from "~icons/ri/add-circle-line";
import Refresh from "~icons/ep/refresh";
import EditPen from "~icons/ep/edit-pen";
import View from "~icons/ep/view";
import Delete from "~icons/ep/delete";
import Promotion from "~icons/ep/promotion";
import RefreshRight from "~icons/ep/refresh-right";

defineOptions({
  name: "MailSendTask"
});

const formRef = ref();

const {
  form,
  loading,
  dataList,
  columns,
  pagination,
  statusOptions,
  sendLoadingMap,
  onSearch,
  resetForm,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  goCreate,
  goEdit,
  goDetail,
  handleSend,
  handleRetry,
  loadStatusOptions
} = useMailSendTask();

onMounted(() => {
  loadStatusOptions();
});
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
      @submit.prevent
    >
      <el-form-item label="任务编号：" prop="taskNo">
        <el-input
          v-model="form.taskNo"
          placeholder="请输入任务编号"
          clearable
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="任务名称：" prop="taskName">
        <el-input
          v-model="form.taskName"
          placeholder="请输入任务名称"
          clearable
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="邮件主题：" prop="subject">
        <el-input
          v-model="form.subject"
          placeholder="请输入邮件主题"
          clearable
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="状态：" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择状态"
          clearable
          class="w-[160px]!"
        >
          <el-option
            v-for="o in statusOptions"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="邮件发送管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:mailTask:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="goCreate"
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
              @click="goDetail(row)"
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
              @click="goEdit(row)"
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

<style lang="scss" scoped>
.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
