<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { message } from "@/utils/message";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getAiModelPrices,
  getAiModelPriceMissing,
  saveAiModelPrices,
  type AiModelPrice
} from "@/api/ai";
import { getDropdownOptions } from "@/api/ai-provider-health";
import { getProviderModelOptions } from "@/api/ai-provider-model";

defineOptions({ name: "AiModelPrice" });

type Option = { value: string; label: string };

const rows = ref<AiModelPrice[]>([]);
const loading = ref(false);
const saving = ref(false);
const importLoading = ref(false);
const providers = ref<Option[]>([]);

/** 已存在行的键，用于导入去重与保存前查重 */
const rowKey = (r: { provider: string; model: string }) =>
  `${r.provider ?? ""}\u0000${r.model ?? ""}`;

/** 供应商下拉：空值代表「全局默认价」 */
const providerOptions = computed(() => [
  { value: "", label: "全局默认（所有供应商）" },
  ...providers.value
]);

/**
 * 模型输入候选：按供应商从 ai_provider_model 目录取。
 * 目录里没有时返回空数组，el-autocomplete 允许自由输入，不会卡住。
 */
const modelOptionsCache = new Map<string, Option[]>();

async function suggestModels(
  provider: string,
  query: string,
  cb: (items: Array<{ value: string }>) => void
) {
  try {
    const key = provider || "";
    let options = modelOptionsCache.get(key);
    if (!options) {
      // 全局默认行没有供应商上下文，取第一个供应商的目录意义不大，直接不提供候选
      const res = key ? await getProviderModelOptions(key, "TEXT") : null;
      options = (res?.data ?? []).map(i => ({
        // SelectOption.value 允许 string|number|boolean，这里统一成字符串
        value: String(i.value),
        label: i.label ?? String(i.value)
      }));
      modelOptionsCache.set(key, options);
    }
    const kw = (query || "").toLowerCase();
    cb(
      options
        .filter(i => !kw || i.value.toLowerCase().includes(kw))
        .slice(0, 20)
        .map(i => ({ value: i.value }))
    );
  } catch {
    cb([]);
  }
}

async function load() {
  loading.value = true;
  try {
    const res = await getAiModelPrices();
    rows.value = (res.data ?? []).map(i => ({
      ...i,
      provider: i.provider ?? "",
      inputPrice: Number(i.inputPrice ?? 0),
      outputPrice: Number(i.outputPrice ?? 0),
      enabled: i.enabled !== false,
      remark: i.remark ?? ""
    }));
  } catch {
    message("加载单价失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function loadProviders() {
  try {
    const res = await getDropdownOptions<{ providers: Option[] }>();
    providers.value = res.data?.providers ?? [];
  } catch {
    // 下拉取不到不影响手工填写
    providers.value = [];
  }
}

/** 一键导入「实际调用过但没配价」的组合 */
async function importMissing() {
  importLoading.value = true;
  try {
    const res = await getAiModelPriceMissing(90);
    const missing = res.data ?? [];
    const exists = new Set(rows.value.map(rowKey));
    let added = 0;
    for (const item of missing) {
      if (exists.has(rowKey(item))) continue;
      rows.value.push({
        provider: item.provider ?? "",
        model: item.model,
        currency: "CNY",
        inputPrice: 0,
        outputPrice: 0,
        enabled: true,
        remark: `近90天 ${item.calls} 次调用`
      });
      added++;
    }
    message(
      added > 0
        ? `已导入 ${added} 个待配价组合（共发现 ${missing.length} 个），请填写单价后保存`
        : "没有未配价的组合",
      { type: added > 0 ? "success" : "info" }
    );
  } catch {
    message("导入失败", { type: "error" });
  } finally {
    importLoading.value = false;
  }
}

function addRow() {
  rows.value.unshift({
    provider: "",
    model: "",
    currency: "CNY",
    inputPrice: 0,
    outputPrice: 0,
    enabled: true,
    remark: ""
  });
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
}

async function save() {
  const emptyModel = rows.value.find(r => !r.model?.trim());
  if (emptyModel) {
    message("存在模型 ID 为空的行，请填写或删除", { type: "warning" });
    return;
  }
  const keys = new Set<string>();
  for (const r of rows.value) {
    const k = rowKey(r);
    if (keys.has(k)) {
      message(
        `「${r.provider || "全局默认"} / ${r.model}」重复，同一供应商+模型只能有一条`,
        { type: "warning" }
      );
      return;
    }
    keys.add(k);
  }

  saving.value = true;
  try {
    await saveAiModelPrices(rows.value);
    message("已保存，成本将按新单价重算", { type: "success" });
    await load();
  } catch {
    message("保存失败", { type: "error" });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  load();
  loadProviders();
});
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="tip"
      title="单价按「供应商 + 模型」二维维护，单位为每百万 token"
    >
      <template #default>
        同一个模型 ID 会被多家供应商提供且价格不同（例如 glm-5.2、kimi-k3），
        因此能确定供应商时请选具体供应商；<b>供应商留空表示全局默认价</b>，
        仅在「所有供应商同价」或暂时不想逐个维护时使用。
        查价顺序：先匹配「供应商 + 模型」，没有再退回「全局默认 + 模型」。
      </template>
    </el-alert>

    <PureTableBar title="AI 模型单价" @refresh="load">
      <template #buttons>
        <el-button :loading="importLoading" @click="importMissing">
          导入未配价组合
        </el-button>
        <el-button @click="addRow">新增一行</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          保存
        </el-button>
      </template>

      <el-table v-loading="loading" :data="rows" size="small" border>
        <el-table-column label="供应商" width="200">
          <template #default="{ row }">
            <el-select
              v-model="row.provider"
              filterable
              allow-create
              default-first-option
              placeholder="留空=全局默认"
            >
              <el-option
                v-for="o in providerOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="模型 ID" min-width="260">
          <template #default="{ row }">
            <el-autocomplete
              v-model="row.model"
              :fetch-suggestions="
                (q, cb) => void suggestModels(row.provider, q, cb)
              "
              placeholder="如 deepseek-v4-pro"
              clearable
              class="w-full"
            />
          </template>
        </el-table-column>

        <el-table-column label="币种" width="100">
          <template #default="{ row }">
            <el-select v-model="row.currency">
              <el-option label="CNY" value="CNY" />
              <el-option label="USD" value="USD" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="输入单价" width="140">
          <template #default="{ row }">
            <el-input-number
              v-model="row.inputPrice"
              :min="0"
              :precision="6"
              :step="0.1"
              controls-position="right"
              class="w-full"
            />
          </template>
        </el-table-column>

        <el-table-column label="输出单价" width="140">
          <template #default="{ row }">
            <el-input-number
              v-model="row.outputPrice"
              :min="0"
              :precision="6"
              :step="0.1"
              controls-position="right"
              class="w-full"
            />
          </template>
        </el-table-column>

        <el-table-column label="启用" width="70" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" />
          </template>
        </el-table-column>

        <el-table-column label="备注" min-width="160">
          <template #default="{ row }">
            <el-input v-model="row.remark" placeholder="价格来源/生效日期" />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" link @click="removeRow($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <p class="footnote">
        共 {{ rows.length }} 条。单价为 0 表示「免费/未填」，面板会按 0
        计算金额； 未启用（关闭开关）的单价不参与成本计算。
      </p>
    </PureTableBar>
  </div>
</template>

<style scoped lang="scss">
.tip {
  margin-bottom: 12px;
}

.footnote {
  margin: 12px 0 0;
  font-size: var(--ra-font-xs);
  color: var(--el-text-color-secondary);
}

.w-full {
  width: 100%;
}
</style>
