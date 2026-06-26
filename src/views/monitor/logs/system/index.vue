<script setup lang="ts">
import { ref } from "vue";
import { useSystemLog as useRole } from "./hook";
import { getPickerShortcuts } from "../../utils";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import View from "~icons/ep/view";
import Refresh from "~icons/ep/refresh";
import HugeiconsDownload01 from "~icons/hugeicons/download-01";

defineOptions({
  name: "SystemLog"
});

const formRef = ref();
const tableRef = ref();

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  filterOptions,
  onSearch,
  onDetail,
  clearAll,
  resetForm,
  exportExcel,
  exportLoading,
  handleSizeChange,
  handleCellDblclick,
  handleCurrentChange
} = useRole(tableRef);
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="所属模块" prop="module">
        <el-select
          v-model="form.module"
          placeholder="请选择所属模块"
          clearable
          filterable
          class="w-[170px]!"
        >
          <el-option
            v-for="item in filterOptions.modules"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="TraceId" prop="traceId">
        <el-input
          v-model="form.traceId"
          placeholder="请输入 TraceId"
          clearable
          class="w-[180px]!"
        />
      </el-form-item>
      <el-form-item label="请求接口" prop="uri">
        <el-input
          v-model="form.uri"
          placeholder="请输入请求接口"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="请求方法" prop="method">
        <el-select
          v-model="form.method"
          placeholder="请选择请求方法"
          clearable
          class="w-[130px]!"
        >
          <el-option
            v-for="item in filterOptions.methods"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="操作类型" prop="action">
        <el-select
          v-model="form.action"
          placeholder="请选择操作类型"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in filterOptions.actions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资源类型" prop="resourceType">
        <el-select
          v-model="form.resourceType"
          placeholder="请选择资源类型"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in filterOptions.resourceTypes"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资源ID" prop="resourceId">
        <el-input
          v-model="form.resourceId"
          placeholder="请输入资源ID"
          clearable
          class="w-[150px]!"
        />
      </el-form-item>
      <el-form-item label="业务类型" prop="bizType">
        <el-select
          v-model="form.bizType"
          placeholder="请选择业务类型"
          clearable
          filterable
          class="w-[150px]!"
        >
          <el-option
            v-for="item in filterOptions.bizTypes"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="业务ID" prop="bizId">
        <el-input
          v-model="form.bizId"
          placeholder="请输入业务ID"
          clearable
          class="w-[150px]!"
        />
      </el-form-item>
      <el-form-item label="操作人ID" prop="operatorId">
        <el-input
          v-model="form.operatorId"
          placeholder="请输入操作人ID"
          clearable
          class="w-[160px]!"
        />
      </el-form-item>
      <el-form-item label="操作人" prop="operatorName">
        <el-select
          v-model="form.operatorName"
          placeholder="请选择或输入操作人"
          clearable
          filterable
          allow-create
          default-first-option
          class="w-[160px]!"
        >
          <el-option
            v-for="item in filterOptions.operatorNames"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="浏览器类型" prop="browserType">
        <el-select
          v-model="form.browserType"
          placeholder="请选择浏览器"
          clearable
          class="w-[140px]!"
        >
          <el-option
            v-for="item in filterOptions.browserTypes"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="IP 归属地" prop="ipLocation">
        <el-select
          v-model="form.ipLocation"
          placeholder="请选择归属地"
          clearable
          filterable
          class="w-[160px]!"
        >
          <el-option
            v-for="item in filterOptions.ipLocations"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="请求描述" prop="description">
        <el-input
          v-model="form.description"
          placeholder="请输入请求描述"
          clearable
          class="w-[170px]!"
        />
      </el-form-item>
      <el-form-item label="状态：" prop="success">
        <el-select
          v-model="form.success"
          placeholder="请选择状态"
          clearable
          class="w-[120px]!"
        >
          <el-option label="成功" value="true" />
          <el-option label="失败" value="false" />
        </el-select>
      </el-form-item>
      <el-form-item label="请求时间" prop="requestTime">
        <el-date-picker
          v-model="form.requestTime"
          :shortcuts="getPickerShortcuts()"
          type="datetimerange"
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

    <PureTableBar :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="primary"
          :loading="exportLoading"
          :icon="useRenderIcon(HugeiconsDownload01)"
          @click="exportExcel"
        >
          导出
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
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
          @cell-dblclick="handleCellDblclick"
        >
          <template #operation="{ row }">
            <el-button
              v-if="row.hasDetail"
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
:deep(.el-dropdown-menu__item i) {
  margin: 0;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
