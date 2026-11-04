<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  getWeChatIdentityPage,
  rebindWeChatIdentity,
  unbindWeChatIdentity,
  getMiniSharedMode,
  updateMiniSharedMode,
  type WeChatIdentityRow
} from "@/api/reward-wechat";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";

defineOptions({ name: "WeChatIdentity" });

/** ---------------- 单用户兼容模式 ---------------- */
const modeLoading = ref(false);
const modeSaving = ref(false);
const mode = reactive({ enabled: true, userId: 1 });

async function loadMode() {
  modeLoading.value = true;
  try {
    const res = await getMiniSharedMode();
    if (res?.data) {
      mode.enabled = res.data.enabled;
      mode.userId = res.data.userId ?? 1;
    }
  } catch {
    // 提示由 http 拦截器统一处理
  } finally {
    modeLoading.value = false;
  }
}

async function saveMode() {
  modeSaving.value = true;
  try {
    await updateMiniSharedMode({ enabled: mode.enabled, userId: mode.userId });
    ElMessage.success(
      mode.enabled
        ? `已开启：之后所有微信登录都归属到 userId=${mode.userId}`
        : "已关闭：恢复「一个微信一个账号」"
    );
    await loadMode();
  } catch {
    // 同上
  } finally {
    modeSaving.value = false;
  }
}

/** ---------------- 绑定关系列表 ---------------- */
const loading = ref(false);
const dataList = ref<WeChatIdentityRow[]>([]);
const form = reactive({ keyword: "", userId: undefined as number | undefined });
const pagination = reactive({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const columns: TableColumnList = [
  { label: "ID", prop: "id", width: 90 },
  { label: "Reward 用户", prop: "userId", width: 130 },
  { label: "昵称", prop: "nickName", minWidth: 120 },
  {
    label: "注册来源",
    prop: "registerSource",
    width: 140,
    formatter: (row: any) =>
      row.registerSource === "WECHAT_MINI"
        ? "小程序注册"
        : row.registerSource || "—"
  },
  { label: "微信标识（脱敏）", prop: "openidMasked", minWidth: 180 },
  { label: "AppID", prop: "appId", minWidth: 180 },
  { label: "绑定时间", prop: "createdTime", minWidth: 170 },
  { label: "操作", slot: "operation", fixed: "right", width: 170 }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getWeChatIdentityPage({
      current: pagination.currentPage,
      size: pagination.pageSize,
      keyword: form.keyword || undefined,
      userId: form.userId || undefined
    });
    dataList.value = res?.data?.records ?? [];
    pagination.total = res?.data?.total ?? 0;
  } catch {
    dataList.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.keyword = "";
  form.userId = undefined;
  pagination.currentPage = 1;
  onSearch();
}

function handleSearch() {
  pagination.currentPage = 1;
  onSearch();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  onSearch();
}

function handleCurrentChange(current: number) {
  pagination.currentPage = current;
  onSearch();
}

/** 改挂：只改归属，不搬数据 —— 这点必须在确认框里讲清楚 */
async function handleRebind(row: WeChatIdentityRow) {
  try {
    const { value } = await ElMessageBox.prompt(
      `把这条微信（当前归属 userId=${row.userId}）改挂到哪个 Reward 用户？\n` +
        `注意：只改「登录后是谁」，历史成绩仍留在原用户名下，不会跟着搬过去。`,
      "改挂微信身份",
      {
        inputPlaceholder: "目标 userId，例如 1",
        inputPattern: /^\d+$/,
        inputErrorMessage: "请填写数字 userId"
      }
    );
    const targetUserId = Number(value);
    if (targetUserId === row.userId) {
      ElMessage.info("归属未变化");
      return;
    }
    await rebindWeChatIdentity(row.id, targetUserId);
    ElMessage.success("已改挂");
    onSearch();
  } catch (e) {
    // 取消操作会抛 'cancel'，不提示
    if (e !== "cancel") ElMessage.error("改挂失败");
  }
}

async function handleUnbind(row: WeChatIdentityRow) {
  try {
    await ElMessageBox.confirm(
      `解绑这条微信？解绑后它下次登录会重新走首次登录逻辑（可能创建新账号）。` +
        `\n当前归属：userId=${row.userId}`,
      "解绑确认",
      { type: "warning", confirmButtonText: "解绑" }
    );
    await unbindWeChatIdentity(row.id);
    ElMessage.success("已解绑");
    onSearch();
  } catch (e) {
    if (e !== "cancel") ElMessage.error("解绑失败");
  }
}

onMounted(() => {
  loadMode();
  onSearch();
});
</script>

<template>
  <div class="main">
    <!-- 开关：放最上面，因为它决定下面这份列表的语义 -->
    <el-card shadow="never" class="mode-card">
      <div class="mode-row">
        <div class="mode-text">
          <div class="mode-title">
            单用户兼容模式
            <el-tag
              v-if="mode.enabled"
              type="warning"
              size="small"
              effect="plain"
            >
              所有微信共用一份数据
            </el-tag>
            <el-tag v-else type="success" size="small" effect="plain">
              每个微信独立账号
            </el-tag>
          </div>
          <div class="mode-desc">
            开启后：任何微信首次登录都直接归属到下面的用户，不再新建账号 ——
            适合「历史数据都在 userId=1、暂时不做身份拆分」的过渡期。
            关闭后：一个微信一个账号，用户之间数据互不可见。
          </div>
        </div>
        <div v-loading="modeLoading" class="mode-actions">
          <span class="mode-label">归属用户</span>
          <el-input-number
            v-model="mode.userId"
            :min="1"
            :step="1"
            step-strictly
            :disabled="!mode.enabled"
            controls-position="right"
            style="width: 140px"
          />
          <el-switch
            v-model="mode.enabled"
            active-text="开启"
            inactive-text="关闭"
            inline-prompt
          />
          <el-button
            v-perms="'config:wechat-identity:mode'"
            type="primary"
            :loading="modeSaving"
            @click="saveMode"
          >
            保存
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 查询 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键字">
          <el-input
            v-model="form.keyword"
            placeholder="昵称 / openid 片段"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="Reward 用户">
          <el-input
            v-model.number="form.userId"
            placeholder="userId"
            clearable
            style="width: 140px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar
      title="微信用户绑定关系"
      class="w-full"
      :columns="columns"
      @refresh="onSearch"
    >
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
              @click="handleRebind(row)"
            >
              改挂
            </el-button>
            <el-popconfirm
              :title="`确认解绑这条微信（userId=${row.userId}）？`"
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

.mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
}

.mode-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
  font-weight: 600;
}

.mode-desc {
  max-width: 720px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.mode-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mode-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.search-card {
  margin-bottom: 12px;
}
</style>
