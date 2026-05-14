<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useAiCallRecord } from "./hook";
import { getPickerShortcuts } from "../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import View from "~icons/ep/view";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "AiCallRecord"
});

const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  statusOptions,
  onSearch,
  onDetail,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useAiCallRecord(tableRef);

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="记录ID" prop="id">
        <el-input
          v-model="form.id"
          placeholder="请输入记录ID"
          clearable
          class="w-[160px]!"
        />
      </el-form-item>
      <el-form-item label="业务类型" prop="bizType">
        <el-input
          v-model="form.bizType"
          placeholder="请输入业务类型"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="业务ID" prop="bizId">
        <el-input
          v-model="form.bizId"
          placeholder="请输入业务ID"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="调用模型" prop="model">
        <el-input
          v-model="form.model"
          placeholder="请输入调用模型"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="模板名称" prop="templateName">
        <el-input
          v-model="form.templateName"
          placeholder="请输入模板名称"
          clearable
          class="w-[190px]!"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="form.status"
          placeholder="请选择状态"
          clearable
          filterable
          allow-create
          default-first-option
          class="w-[150px]!"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人" prop="operator">
        <el-input
          v-model="form.operator"
          placeholder="请输入操作人"
          clearable
          class="w-[160px]!"
        />
      </el-form-item>
      <el-form-item label="TraceId" prop="traceId">
        <el-input
          v-model="form.traceId"
          placeholder="请输入 TraceId"
          clearable
          class="w-[190px]!"
        />
      </el-form-item>
      <el-form-item label="请求时间" prop="requestTime">
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

    <PureTableBar title="AI 调用记录" :columns="columns" @refresh="onSearch">
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
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              class="reset-margin outline-hidden!"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(View)"
              @click="onDetail(row)"
            >
              详情
            </el-button>
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
