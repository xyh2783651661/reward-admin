<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import {
  useCheckRecord,
  formatTime,
  CHECK_TYPE_LABELS,
  REASON_LABELS
} from "../hook/useCheckRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";
import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";
import ReJsonField from "@/components/ReJsonField/index.vue";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "CheckRecord"
});

const props = defineProps<{
  /** 跨 Tab 联动带入的供应商筛选 */
  initialProvider?: string;
}>();

const emit = defineEmits<{
  (e: "consumed"): void;
}>();

const formRef = ref();
const tableRef = ref();
const moreFilterVisible = ref(false);

const {
  form,
  loading,
  columns,
  dataList,
  pagination,
  dropdownOptions,
  drawerVisible,
  drawerItem,
  drawerIndex,
  hasAdvancedFilters,
  openDetail,
  navigateDetail,
  rowClassName,
  onSearch,
  onExport,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useCheckRecord(tableRef, props.initialProvider);

const { copied, update } = useCopyToClipboard();

function copyText(text?: string | null, label = "内容") {
  if (!text) return;
  update(String(text));
  if (copied.value) message(`${label}已复制`, { type: "success" });
}

/** rawPayload 尝试解析为对象供树形展示 */
const parsedPayload = computed(() => {
  const raw = drawerItem.value?.rawPayload;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

onMounted(() => {
  onSearch();
  if (props.initialProvider) emit("consumed");
});
</script>

<template>
  <div>
    <!-- 一行式筛选栏 -->
    <el-form
      ref="formRef"
      :inline="true"
      :model="form"
      class="filter-bar bg-bg_color w-full pl-4 pt-[12px] overflow-auto"
      @submit.prevent
    >
      <el-form-item label="供应商" prop="provider">
        <el-select
          v-model="form.provider"
          placeholder="全部"
          clearable
          filterable
          class="w-[150px]!"
          @change="onSearch"
        >
          <el-option
            v-for="item in dropdownOptions.providers"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="结果" prop="status">
        <el-select
          v-model="form.status"
          placeholder="全部"
          clearable
          class="w-[110px]!"
          @change="onSearch"
        >
          <el-option
            v-for="item in dropdownOptions.checkStatusList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="检测时间" prop="createdTime">
        <el-date-picker
          v-model="form.createdTime"
          :shortcuts="getPickerShortcuts()"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="结束"
          class="w-[340px]!"
          @change="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-popover
          :visible="moreFilterVisible"
          placement="bottom-start"
          :width="300"
          trigger="click"
        >
          <template #reference>
            <el-badge :is-dot="hasAdvancedFilters" class="more-filter-badge">
              <el-button
                :icon="useRenderIcon('ri:filter-3-line')"
                @click="moreFilterVisible = !moreFilterVisible"
              >
                更多筛选
              </el-button>
            </el-badge>
          </template>
          <div class="more-filter-panel">
            <el-form-item label="检测类型" prop="checkType" class="w-full!">
              <el-select
                v-model="form.checkType"
                placeholder="全部"
                clearable
                class="w-full!"
              >
                <el-option
                  v-for="item in dropdownOptions.checkTypeList"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="故障原因" prop="reason" class="w-full!">
              <el-select
                v-model="form.reason"
                placeholder="全部"
                clearable
                class="w-full!"
              >
                <el-option
                  v-for="item in dropdownOptions.failureReasonList"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <div class="more-filter-panel__footer">
              <el-button
                size="small"
                @click="
                  form.checkType = '';
                  form.reason = '';
                  moreFilterVisible = false;
                  onSearch();
                "
              >
                清空
              </el-button>
              <el-button
                size="small"
                type="primary"
                @click="
                  moreFilterVisible = false;
                  onSearch();
                "
              >
                应用
              </el-button>
            </div>
          </div>
        </el-popover>
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
        <el-button
          type="success"
          :icon="useRenderIcon('ep:download')"
          plain
          @click="onExport"
        >
          导出
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="检测流水" :columns="columns" @refresh="onSearch">
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          row-key="id"
          align-whole="center"
          table-layout="auto"
          adaptive
          showOverflowTooltip
          :adaptiveConfig="{ offsetBottom: 108 }"
          :row-class-name="rowClassName"
          :loading="loading"
          :data="dataList"
          :columns="dynamicColumns"
          :pagination="{ ...pagination, size }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
          @row-click="openDetail"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        />
      </template>
    </PureTableBar>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`检测详情 #${drawerItem?.id ?? ''}`"
      size="480px"
      destroy-on-close
    >
      <template v-if="drawerItem">
        <div class="detail-nav">
          <el-button
            size="small"
            :disabled="drawerIndex <= 0"
            @click="navigateDetail(-1)"
          >
            上一条
          </el-button>
          <span class="detail-nav__pos">
            {{ drawerIndex + 1 }} / {{ dataList.length }}
          </span>
          <el-button
            size="small"
            :disabled="drawerIndex >= dataList.length - 1"
            @click="navigateDetail(1)"
          >
            下一条
          </el-button>
        </div>

        <el-descriptions :column="2" border size="small" class="mb-3">
          <el-descriptions-item label="供应商">
            {{ drawerItem.provider }}
          </el-descriptions-item>
          <el-descriptions-item label="检测类型">
            {{
              CHECK_TYPE_LABELS[drawerItem.checkType] || drawerItem.checkType
            }}
          </el-descriptions-item>
          <el-descriptions-item label="结果">
            <el-tag
              size="small"
              :type="drawerItem.status === 'SUCCESS' ? 'success' : 'danger'"
              effect="plain"
            >
              {{ drawerItem.status === "SUCCESS" ? "成功" : "失败" }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="故障原因">
            {{
              REASON_LABELS[drawerItem.reason || ""] || drawerItem.reason || "-"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="HTTP 状态">
            {{ drawerItem.httpStatus || "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ (drawerItem.costTimeMs ?? 0) + " ms" }}
          </el-descriptions-item>
          <el-descriptions-item label="余额">
            {{
              drawerItem.balanceAmount != null
                ? `${drawerItem.balanceAmount} ${drawerItem.balanceCurrency || ""}`
                : "-"
            }}
          </el-descriptions-item>
          <el-descriptions-item label="剩余配额">
            {{ drawerItem.quotaRemaining ?? "-" }}
          </el-descriptions-item>
          <el-descriptions-item label="检测时间" :span="2">
            {{ formatTime(drawerItem.createdTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="请求 ID" :span="2">
            <div class="copy-row">
              <span class="copy-row__text">{{
                drawerItem.requestId || "-"
              }}</span>
              <el-button
                v-if="drawerItem.requestId"
                link
                type="primary"
                size="small"
                @click="copyText(drawerItem.requestId, '请求 ID')"
              >
                复制
              </el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 错误信息 -->
        <section v-if="drawerItem.errorMessage" class="detail-section">
          <header class="detail-section__head">
            <h4>错误信息</h4>
            <el-button
              link
              type="primary"
              size="small"
              @click="copyText(drawerItem.errorMessage, '错误信息')"
            >
              复制
            </el-button>
          </header>
          <pre class="detail-section__error">{{ drawerItem.errorMessage }}</pre>
        </section>

        <!-- rawPayload -->
        <section v-if="drawerItem.rawPayload" class="detail-section">
          <header class="detail-section__head">
            <h4>原始响应</h4>
            <el-button
              link
              type="primary"
              size="small"
              @click="copyText(drawerItem.rawPayload, '原始响应')"
            >
              复制
            </el-button>
          </header>
          <ReJsonField
            v-if="parsedPayload"
            :data="parsedPayload"
            readonly
            :deep="2"
            max-height="320px"
          />
          <pre v-else class="detail-section__raw">{{
            drawerItem.rawPayload
          }}</pre>
        </section>
      </template>
    </el-drawer>
  </div>
</template>

<style lang="scss" scoped>
.filter-bar {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.more-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}

.more-filter-panel__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 失败行左侧描边 */
:deep(.check-row-fail) {
  td:first-child {
    box-shadow: inset 3px 0 0 var(--el-color-danger);
  }
}

:deep(.el-table__row) {
  cursor: pointer;
}

.detail-nav {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.detail-nav__pos {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.copy-row {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.copy-row__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-section {
  margin-top: 16px;
}

.detail-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.detail-section__error {
  max-height: 200px;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-color-danger);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-color-danger-light-9);
  border-radius: 6px;
}

.detail-section__raw {
  max-height: 320px;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
