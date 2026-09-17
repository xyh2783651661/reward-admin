<script setup lang="ts">
import { useHolidayConfig } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import ReFriendPicker from "@/components/ReFriendPicker/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import AddFill from "~icons/ri/add-circle-line";
import User from "~icons/ep/user";

defineOptions({
  name: "HolidayConfig"
});

const {
  form,
  loading,
  searchFields,
  columns,
  dataList,
  pagination,
  recipientVisible,
  recipientTitle,
  recipientIds,
  saveHolidayRecipients,
  onSearch,
  resetForm,
  openDialog,
  openRecipientDialog,
  handleDelete,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange
} = useHolidayConfig();

function handleSearch() {
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

    <PureTableBar title="节假日配置管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'config:holiday:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增配置
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
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'config:holiday:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openDialog('修改', row)"
            >
              修改
            </el-button>
            <el-popconfirm
              :title="`是否确认删除「${row.holidayName}」？`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:holiday:delete'"
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
            <el-button
              v-perms="'config:holiday:recipients'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(User)"
              @click="openRecipientDialog(row)"
            >
              收件人
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 收件人关联：与「邮件发送任务」共用同一个选择器组件 -->
    <ReFriendPicker
      v-model:visible="recipientVisible"
      v-model="recipientIds"
      :title="recipientTitle"
      :before-confirm="saveHolidayRecipients"
    >
      <template #tip="{ count }">
        <el-text v-if="count === 0" type="info">
          未指定收件人，将发送给所有用户
        </el-text>
        <el-text v-else type="info">
          仅发送给 {{ count }} 位指定收件人
        </el-text>
      </template>
    </ReFriendPicker>
  </div>
</template>
