<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  useAlertRecord,
  formatTime,
  ALERT_TYPE_LABELS,
  getAlertLevelType
} from "../hook/useAlertRecord";
import { PureTableBar } from "@/components/RePureTableBar";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { getPickerShortcuts } from "../../utils";
import { useCopyToClipboard } from "@pureadmin/utils";
import { message } from "@/utils/message";

import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "AlertRecord"
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
  selectedOpenRows,
  drawerVisible,
  drawerItem,
  drawerIndex,
  hasAdvancedFilters,
  openDetail,
  navigateDetail,
  rowClassName,
  handleSelectionChange,
  onSearch,
  onExport,
  onResolve,
  onBatchResolve,
  resetForm,
  handleSizeChange,
  handleCurrentChange
} = useAlertRecord(tableRef, props.initialProvider);

const { copied, update } = useCopyToClipboard();

function copyText(text?: string | null, label = "内容") {
  if (!text) return;
  update(String(text));
  if (copied.value) message(`${label}已复制`, { type: "success" });
}

function handleRowClick(row, column) {
  // 点击勾选列或操作列不打开抽屉
  if (column?.type === "selection" || column?.label === "操作") return;
  openDetail(row);
}

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
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="form.status"
          placeholder="全部"
          clearable
          class="w-[110px]!"
          @change="onSearch"
        >
          <el-option
            v-for="item in dropdownOptions.alertStatusList"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="告警时间" prop="createdTime">
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
            <el-form-item label="告警类型" prop="alertType" class="w-full!">
              <el-select
                v-model="form.alertType"
                placeholder="全部"
                clearable
                class="w-full!"
              >
                <el-option
                  v-for="item in dropdownOptions.alertTypeList"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="告警级别" prop="alertLevel" class="w-full!">
              <el-select
                v-model="form.alertLevel"
                placeholder="全部"
                clearable
                class="w-full!"
              >
                <el-option
                  v-for="item in dropdownOptions.alertLevelList"
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
                  form.alertType = '';
                  form.alertLevel = '';
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

    <PureTableBar title="告警记录" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          type="success"
          plain
          :icon="useRenderIcon('ep:circle-check')"
          @click="onBatchResolve"
        >
          批量解决{{
            selectedOpenRows.length ? `（已选 ${selectedOpenRows.length}）` : ""
          }}
        </el-button>
      </template>
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
          @row-click="handleRowClick"
          @selection-change="handleSelectionChange"
          @page-size-change="handleSizeChange"
          @page-current-change="handleCurrentChange"
        >
          <template #operation="{ row }">
            <el-button
              v-if="row.status === 'OPEN'"
              class="reset-margin outline-hidden!"
              link
              type="success"
              :size="size"
              @click.stop="onResolve(row)"
            >
              解决
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`告警详情 #${drawerItem?.id ?? ''}`"
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

        <!-- 状态横幅 -->
        <div
          class="alert-banner"
          :class="drawerItem.status === 'OPEN' ? 'is-open' : 'is-resolved'"
        >
          <el-tag
            :type="getAlertLevelType(drawerItem.alertLevel)"
            :effect="drawerItem.alertLevel === 'CRITICAL' ? 'dark' : 'plain'"
            size="small"
          >
            {{ drawerItem.alertLevel }}
          </el-tag>
          <span class="alert-banner__status">
            {{ drawerItem.status === "OPEN" ? "未解决" : "已解决" }}
          </span>
          <div class="alert-banner__spacer" />
          <el-button
            v-if="drawerItem.status === 'OPEN'"
            type="success"
            size="small"
            @click="onResolve(drawerItem)"
          >
            解决此告警
          </el-button>
        </div>

        <el-descriptions :column="2" border size="small" class="mb-3">
          <el-descriptions-item label="供应商">
            {{ drawerItem.provider }}
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">
            {{
              ALERT_TYPE_LABELS[drawerItem.alertType] || drawerItem.alertType
            }}
          </el-descriptions-item>
          <el-descriptions-item label="发送次数">
            {{ drawerItem.sentCount ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="首次告警">
            {{ formatTime(drawerItem.firstSentTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后告警">
            {{ formatTime(drawerItem.lastSentTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="解决时间">
            {{ formatTime(drawerItem.resolvedTime) }}
          </el-descriptions-item>
        </el-descriptions>

        <section class="detail-section">
          <header class="detail-section__head">
            <h4>标题</h4>
          </header>
          <p class="detail-section__text">{{ drawerItem.title || "-" }}</p>
        </section>

        <section v-if="drawerItem.content" class="detail-section">
          <header class="detail-section__head">
            <h4>告警内容</h4>
            <el-button
              link
              type="primary"
              size="small"
              @click="copyText(drawerItem.content, '告警内容')"
            >
              复制
            </el-button>
          </header>
          <pre class="detail-section__content">{{ drawerItem.content }}</pre>
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

/* OPEN 行左侧描边；RESOLVED 行弱化 */
:deep(.alert-row-open) {
  td:first-child {
    box-shadow: inset 3px 0 0 var(--el-color-warning);
  }

  &.is-severe td:first-child {
    box-shadow: inset 3px 0 0 var(--el-color-danger);
  }
}

:deep(.alert-row-resolved) {
  color: var(--el-text-color-secondary);
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

.alert-banner {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;

  &.is-open {
    background: var(--el-color-danger-light-9);
    border: 1px solid var(--el-color-danger-light-7);
  }

  &.is-resolved {
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-7);
  }
}

.alert-banner__status {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.alert-banner__spacer {
  flex: 1;
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

.detail-section__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.detail-section__content {
  max-height: 320px;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
