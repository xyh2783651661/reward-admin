<script setup lang="ts">
import { useWeChatIdentity } from "./utils/hook";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";

defineOptions({
  name: "WeChatIdentity"
});

const {
  form,
  loading,
  dataList,
  pagination,
  columns,
  searchFields,
  onSearch,
  onReset,
  handleSizeChange,
  handleCurrentChange,
  openRebind,
  handleUnbind,
  openMigration,
  mode,
  modeLoading,
  modeSaving,
  saveMode,
  userOptions
} = useWeChatIdentity();

function handleSearch() {
  form.current = 1;
  onSearch();
}
</script>

<template>
  <div class="main">
    <!-- 单用户兼容模式：决定下面这份列表的语义，所以放最上面 -->
    <el-card v-loading="modeLoading" shadow="never" class="mode-card">
      <el-form inline class="mode-form" @submit.prevent>
        <el-form-item label="单用户兼容模式">
          <el-switch
            v-model="mode.enabled"
            active-text="开启"
            inactive-text="关闭"
            inline-prompt
          />
        </el-form-item>
        <el-form-item label="归属用户">
          <el-select
            v-model="mode.userId"
            filterable
            :disabled="!mode.enabled"
            placeholder="选择 Reward 用户"
            style="width: 240px"
          >
            <el-option
              v-for="item in userOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-perms="'config:wechat-identity:mode'"
            type="primary"
            :loading="modeSaving"
            @click="saveMode"
          >
            保存
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-tag v-if="mode.enabled" type="warning" effect="plain">
            开启中：所有微信登录共用同一份数据
          </el-tag>
          <el-tag v-else type="success" effect="plain">
            已关闭：每个微信独立账号
          </el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <ReSearchBar
      v-model="form"
      :fields="searchFields"
      :loading="loading"
      :visible-count="4"
      @search="handleSearch"
      @reset="onReset"
    />

    <PureTableBar
      title="微信用户绑定关系"
      class="w-full"
      :columns="columns"
      @refresh="onSearch"
    >
      <template #buttons>
        <el-button
          v-perms="'config:wechat-identity:migrate'"
          type="primary"
          plain
          @click="openMigration"
        >
          数据迁移
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
              v-perms="'config:wechat-identity:rebind'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openRebind(row)"
            >
              改挂
            </el-button>
            <el-popconfirm
              :title="`确认解绑这条微信（当前归属 userId=${row.userId}）？解绑后下次登录会重新走首次登录逻辑。`"
              @confirm="handleUnbind(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'config:wechat-identity:delete'"
                  class="reset-margin"
                  link
                  type="danger"
                  :size="size"
                  :icon="useRenderIcon(Delete)"
                >
                  解绑
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped>
.mode-card {
  margin-bottom: 12px;
}

.mode-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 0;
}
</style>
