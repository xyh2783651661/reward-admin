<script setup lang="ts">
import { ref } from "vue";
import { useMailLog } from "./hook";
import { getPickerShortcuts } from "../../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import DictSelect from "@/components/DictSelect/index.vue";

import Refresh from "~icons/ep/refresh";
import AntDesignMailOutlined from "~icons/ant-design/mail-outlined";

defineOptions({
  name: "MailLog"
});

const formRef = ref();

const {
  form,
  loading,
  optionsLoading,
  options,
  columns,
  dataList,
  pagination,
  onSearch,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  onDetail
} = useMailLog();
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      v-search-enter="onSearch"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="主题" prop="subject">
        <el-input
          v-model="form.subject"
          placeholder="请输入主题"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <DictSelect
          v-model="form.status"
          :options="options.statusOptions"
          :loading="optionsLoading"
          placeholder="请选择"
          class="w-[150px]!"
        />
      </el-form-item>
      <el-form-item label="邮件类型" prop="type">
        <DictSelect
          v-model="form.type"
          :options="options.typeOptions"
          :loading="optionsLoading"
          placeholder="请选择邮件类型"
          filterable
          class="w-[200px]!"
        />
      </el-form-item>
      <el-form-item label="MQ状态" prop="mqStatus">
        <DictSelect
          v-model="form.mqStatus"
          :options="options.mqStatusOptions"
          :loading="optionsLoading"
          placeholder="请选择MQ状态"
          class="w-[150px]!"
        />
      </el-form-item>
      <el-form-item label="收件人" prop="recipient">
        <el-input
          v-model="form.recipient"
          placeholder="请输入收件人邮箱"
          clearable
          class="w-[190px]!"
        />
      </el-form-item>
      <el-form-item label="消息ID" prop="messageId">
        <el-input
          v-model="form.messageId"
          placeholder="请输入消息ID"
          clearable
          class="w-[190px]!"
        />
      </el-form-item>
      <el-form-item label="优先级" prop="priority">
        <DictSelect
          v-model="form.priority"
          :options="options.priorityOptions"
          :loading="optionsLoading"
          placeholder="请选择优先级"
          class="w-[150px]!"
        />
      </el-form-item>
      <el-form-item label="供应商" prop="provider">
        <el-input
          v-model="form.provider"
          placeholder="请输入供应商"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="发送时间" prop="requestTime">
        <el-date-picker
          v-model="form.requestTime"
          :shortcuts="getPickerShortcuts()"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至"
          start-placeholder="开始日期时间"
          end-placeholder="结束日期时间"
        />
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
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="邮件发送记录" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
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
              v-if="row.id"
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(AntDesignMailOutlined)"
              @click="onDetail(row)"
            >
              邮件详情
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

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
