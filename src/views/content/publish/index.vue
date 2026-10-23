<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  usePublishPackage,
  PACKAGE_STATUS_LABELS,
  SELECT_MODE_LABELS,
  TASK_PLATFORM_LABELS
} from "./hook";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { message } from "@/utils/message";
import { PureTableBar } from "@/components/RePureTableBar";
import ReSearchBar from "@/components/ReSearchBar/index.vue";
import { preparePublishPackage } from "@/api/publish-package";

import View from "~icons/ep/view";
import ArrowLeft from "~icons/ep/arrow-left";
import Refresh from "~icons/ep/refresh";
import MagicStick from "~icons/ep/magic-stick";
import Picture from "~icons/ep/picture";
import CircleCheck from "~icons/ep/circle-check";
import DocumentCopy from "~icons/ep/document-copy";
import Check from "~icons/ep/check";
import Download from "~icons/ep/download";

defineOptions({
  name: "PublishPackage"
});

const tableRef = ref();
const router = useRouter();

/**
 * 跳到发布记录页，看该「包 × 平台」的完整尝试历史。
 *
 * 这里只展示最后一次结果的快照，失败后被重试成功的话，前面的失败原因会被覆盖。
 * 追问「之前失败过几次、为什么」必须去流水页，且带上包与平台的过滤条件，
 * 免得用户过去还要重新筛一遍。
 */
function gotoPublishHistory(platformCode: string) {
  router.push({
    path: "/publish/record",
    query: {
      packageId: String(detail.value?.id ?? ""),
      platformCode
    }
  });
}

const {
  loading,
  dataList,
  columns,
  searchFields,
  form,
  pagination,
  onSearch,
  handleStatusChange,
  resetForm,
  handleSizeChange,
  handleCurrentChange,
  view,
  detail,
  detailLoading,
  enabledPlatforms,
  loadPlatforms,
  openDetail,
  backToList,
  taskState,
  watchTask,
  generating,
  handleGenerate,
  handleForceRegenerate,
  confirming,
  handleConfirm,
  downloading,
  handleDownload,
  handleExportJson,
  saving,
  contentOf,
  saveContent,
  copyContent,
  pickerVisible,
  pickerLoading,
  pickerImages,
  pickerDate,
  pickerSelected,
  openPicker,
  togglePickerImage,
  submitPicker,
  pickerSubmitting,
  dayImageMap,
  formatDateTime,
  getDailyImageThumbnailUrl
} = usePublishPackage();

/** 文案状态中文标签 */
const CONTENT_STATUS_LABELS: Record<string, string> = {
  pending: "待生成",
  generated: "已生成",
  failed: "生成失败"
};

type TagType = "primary" | "success" | "warning" | "danger" | "info";

function contentStatusType(status?: string): TagType {
  const map: Record<string, TagType> = {
    pending: "info",
    generated: "success",
    failed: "danger"
  };
  return status ? (map[status] ?? "info") : "info";
}

/** 平台级发布状态：与包级状态分开，因为三个平台是分别发布的 */
const PUBLISH_STATUS_LABELS: Record<string, string> = {
  pending: "待发布",
  success: "已发布",
  failed: "发布失败"
};

function publishStatusType(status?: string): TagType {
  const map: Record<string, TagType> = {
    pending: "info",
    success: "success",
    failed: "danger"
  };
  return status ? (map[status] ?? "info") : "info";
}

/**
 * 任务进行中时，某平台在本次任务里的实时状态；无任务时返回 null。
 *
 * 与 contentOf(p.code).status 的区别：后者是落库结果，要等任务跑完刷新才有；
 * 这个是 SSE 推回来的即时状态，生成途中就能看到「谁在跑、谁已好」。
 */
function taskPlatformStatus(code: string): string | null {
  return taskState.value?.platforms?.find(p => p.code === code)?.status ?? null;
}

function taskPlatformTagType(status: string | null): TagType {
  const map: Record<string, TagType> = {
    pending: "info",
    running: "primary",
    success: "success",
    failed: "danger",
    skipped: "info"
  };
  return status ? (map[status] ?? "info") : "info";
}

/** 进度条配色：失败标红、成功标绿，进行中保持默认蓝。 */
function taskProgressStatus(): "success" | "exception" | undefined {
  const status = taskState.value?.status;
  if (status === "FAILED") return "exception";
  if (status === "SUCCESS") return "success";
  return undefined;
}

function packageStatusType(status?: string): TagType {
  const map: Record<string, TagType> = {
    draft: "info",
    generated: "primary",
    ready: "success",
    publishing: "warning",
    published: "success",
    failed: "danger"
  };
  return status ? (map[status] ?? "info") : "info";
}

// ========== 文案编辑草稿 ==========
type ContentDraft = { title: string; content: string; tags: string };

/** key = platformCode；先落到草稿，保存成功后再回写详情，避免直接改脏数据 */
const drafts = ref<Record<string, ContentDraft>>({});

/**
 * 草稿初始化时的后端值快照。
 * 用于刷新详情后判断「这份草稿用户到底改没改过」——
 * 只有与快照一致（即未编辑）才允许用后端新值覆盖，
 * 否则会把用户还没保存的修改无声吞掉。
 */
const draftBaseline = ref<Record<string, ContentDraft>>({});

function draftOf(code: string) {
  const c = contentOf(code);
  if (!drafts.value[code]) {
    const init: ContentDraft = {
      title: c?.title ?? "",
      content: c?.content ?? "",
      tags: (c?.tags ?? []).map(t => t.replace(/^#/, "")).join(" ")
    };
    drafts.value[code] = init;
    draftBaseline.value[code] = { ...init };
  }
  return drafts.value[code];
}

/** 切换内容包时清空草稿，防止残留上一个包的编辑内容 */
function resetDrafts() {
  drafts.value = {};
  draftBaseline.value = {};
}

/**
 * 详情刷新后同步草稿。
 * <p>
 * 草稿是惰性初始化的，一旦建好就不再跟随后端数据变化：
 * 进详情时文案还是空的 → 草稿被缓存成空串 → 生成完刷新详情，
 * 输入框依旧是空的，看起来就像「生成了但没回显」。
 * 这里把未编辑的草稿丢弃，下次渲染时 draftOf 会重新取后端值；
 * 已编辑的则原样保留。
 */
function syncDrafts() {
  for (const code of Object.keys(drafts.value)) {
    const base = draftBaseline.value[code];
    const cur = drafts.value[code];
    if (
      base &&
      cur.title === base.title &&
      cur.content === base.content &&
      cur.tags === base.tags
    ) {
      delete drafts.value[code];
      delete draftBaseline.value[code];
    }
  }
}

// 详情被替换即视为刷新（生成、保存、确认、换图都会走到），统一同步草稿
watch(
  () => detail.value,
  () => syncDrafts()
);

function parseTags(text: string) {
  return text
    .split(/[\s,，#]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

async function handleSave(code: string) {
  const d = draftOf(code);
  await saveContent(code, {
    title: d.title,
    content: d.content,
    tags: parseTags(d.tags)
  });
  // 已落库，丢弃草稿与快照，下次渲染直接取后端值
  delete drafts.value[code];
  delete draftBaseline.value[code];
}

// ========== 准备内容包 ==========
const createVisible = ref(false);
const createDate = ref<string>("");
const createSubmitting = ref(false);

function openCreate() {
  createDate.value = "";
  createVisible.value = true;
}

/**
 * 不传 imageIds，由 AI 从当日图片中选举。
 * 想自己挑就先进详情再用「换一批图」勾选——后端按空集合判断，
 * 传空数组同样走 AI 选举，��以这里不提供"不选图"的选项。
 */
async function submitCreate() {
  createSubmitting.value = true;
  try {
    // 接口返回的是异步任务而非内容包：选图是一次真实的 LLM 调用。
    // 包 ID 要等任务跑完从状态里回读，因���这里订阅进度而不是直接取 data.id。
    const { data } = await preparePublishPackage({
      date: createDate.value || undefined
    });
    createVisible.value = false;
    if (!data?.taskId) return;

    const final = await watchTask(data.taskId);
    if (final?.status === "FAILED") {
      message(`准备失败：${final.error ?? "未知错误"}`, { type: "error" });
    } else if (final?.packageId) {
      await viewDetail(final.packageId);
      message("内容包已准备", { type: "success" });
    }
  } finally {
    createSubmitting.value = false;
  }
}

// ========== 详情视图 ==========
const activeTab = ref("");
const detailPlatforms = computed(() => enabledPlatforms());

/** 进入详情：清空上次草稿，并把 Tab 定位到第一个平台 */
async function viewDetail(id: number) {
  resetDrafts();
  await openDetail(id);
  activeTab.value = detailPlatforms.value[0]?.code ?? "";
}

onMounted(async () => {
  await loadPlatforms();
  await onSearch();
});
</script>

<template>
  <div class="main">
    <!-- ==================== 列表视图 ==================== -->
    <template v-if="view === 'list'">
      <ReSearchBar
        v-model="form"
        :fields="searchFields"
        :loading="loading"
        @search="handleStatusChange"
        @reset="resetForm"
      />

      <PureTableBar title="发布内容包" :columns="columns" @refresh="onSearch">
        <template #buttons>
          <el-button
            v-perms="'publishPackage:index:prepare'"
            type="primary"
            :icon="useRenderIcon(MagicStick)"
            @click="openCreate"
          >
            准备内容包
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
            :loading="loading"
            :data="dataList"
            :columns="dynamicColumns"
            :pagination="{ ...pagination, size }"
            :header-cell-style="{
              background: 'var(--el-fill-color-light)'
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
                @click="viewDetail(row.id)"
              >
                详情
              </el-button>
              <el-button
                v-perms="'publishPackage:index:download'"
                class="reset-margin outline-hidden!"
                link
                type="warning"
                :size="size"
                :icon="useRenderIcon(Download)"
                @click="handleDownload(row)"
              >
                下载
              </el-button>
            </template>
          </pure-table>
        </template>
      </PureTableBar>
    </template>

    <!-- ==================== 详情视图 ==================== -->
    <el-card v-else v-loading="detailLoading" shadow="never">
      <template #header>
        <div class="detail-header">
          <div class="detail-title">
            <el-button
              link
              :icon="useRenderIcon(ArrowLeft)"
              @click="backToList"
            >
              返回
            </el-button>
            <span class="date">{{ detail?.bizDate || "-" }}</span>
            <el-tag
              size="small"
              :type="packageStatusType(detail?.status)"
              effect="plain"
            >
              {{ PACKAGE_STATUS_LABELS[detail?.status] || "草稿" }}
            </el-tag>
            <el-tag size="small" type="info" effect="plain">
              {{ SELECT_MODE_LABELS[detail?.selectMode] || "-" }}
            </el-tag>
            <span v-if="detail?.theme" class="theme">{{ detail.theme }}</span>
          </div>
          <!--
            生成 / 选图进行中的实时进度。
            这两类任务都要调 LLM，是分钟级耗时，没有进度提示界面看起来像卡死，
            且用户无法判断是慢还是已经挂了。
          -->
          <div v-if="taskState" class="task-progress">
            <el-progress
              :percentage="taskState.percent ?? 0"
              :status="taskProgressStatus()"
              :stroke-width="6"
            />
            <div class="task-message">{{ taskState.message }}</div>
          </div>
          <div class="detail-actions">
            <el-button
              v-perms="'publishPackage:index:prepare'"
              :icon="useRenderIcon(Picture)"
              @click="openPicker()"
            >
              换一批图
            </el-button>
            <el-button
              v-perms="'publishPackage:index:generate'"
              type="primary"
              :loading="generating"
              :icon="useRenderIcon(Refresh)"
              @click="handleGenerate()"
            >
              生成文案
            </el-button>
            <el-button
              v-perms="'publishPackage:index:generate'"
              :loading="generating"
              :icon="useRenderIcon(MagicStick)"
              @click="handleForceRegenerate"
            >
              强制重生成
            </el-button>
            <el-button
              v-perms="'publishPackage:index:confirm'"
              type="success"
              :loading="confirming"
              :disabled="detail?.status === 'ready'"
              :icon="useRenderIcon(CircleCheck)"
              @click="handleConfirm"
            >
              {{ detail?.status === "ready" ? "已确认" : "确认发布" }}
            </el-button>
            <el-button
              v-perms="'publishPackage:index:download'"
              type="warning"
              :loading="downloading"
              :icon="useRenderIcon(Download)"
              @click="handleDownload()"
            >
              下载资源包
            </el-button>
            <el-button
              v-perms="'publishPackage:index:download'"
              :icon="useRenderIcon(DocumentCopy)"
              @click="handleExportJson()"
            >
              复制清单 JSON
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="detail" class="detail-body">
        <!-- 左：图片序列 -->
        <div class="image-col">
          <div class="col-title">发布图序</div>
          <div
            v-for="(img, idx) in detail.images ?? []"
            :key="img.id"
            class="image-item"
          >
            <div class="order-badge">{{ idx + 1 }}</div>
            <el-image
              :src="getDailyImageThumbnailUrl(img.dailyImageId)"
              :preview-src-list="
                (detail.images ?? []).map(i =>
                  getDailyImageThumbnailUrl(i.dailyImageId)
                )
              "
              :initial-index="idx"
              fit="cover"
              class="thumb"
            />
            <div class="image-meta">
              <div class="name">
                {{ dayImageMap[img.dailyImageId]?.originalName || "-" }}
              </div>
              <div v-if="img.selectReason" class="reason">
                {{ img.selectReason }}
              </div>
              <div
                v-if="dayImageMap[img.dailyImageId]?.authorName"
                class="author"
              >
                {{ dayImageMap[img.dailyImageId]?.authorName }}
              </div>
            </div>
          </div>
          <el-empty
            v-if="!(detail.images ?? []).length"
            description="包内暂无图片"
            :image-size="60"
          />
        </div>

        <!-- 右：平台文案 -->
        <div class="content-col">
          <div class="col-title">平台文案</div>
          <el-tabs v-model="activeTab">
            <el-tab-pane
              v-for="p in detailPlatforms"
              :key="p.code"
              :label="p.name"
              :name="p.code"
            >
              <template #label>
                <span>
                  {{ p.name }}
                  <el-tag
                    size="small"
                    :type="contentStatusType(contentOf(p.code)?.status)"
                    effect="plain"
                  >
                    {{
                      CONTENT_STATUS_LABELS[
                        contentOf(p.code)?.status ?? "pending"
                      ]
                    }}
                  </el-tag>
                  <el-tag
                    v-if="contentOf(p.code)?.edited === 1"
                    size="small"
                    type="warning"
                    effect="plain"
                  >
                    已改
                  </el-tag>
                  <el-tag
                    v-if="
                      contentOf(p.code)?.publishStatus &&
                      contentOf(p.code)?.publishStatus !== 'pending'
                    "
                    size="small"
                    :type="publishStatusType(contentOf(p.code)?.publishStatus)"
                    effect="dark"
                  >
                    {{
                      PUBLISH_STATUS_LABELS[
                        contentOf(p.code)?.publishStatus ?? ""
                      ] || contentOf(p.code)?.publishStatus
                    }}
                  </el-tag>
                  <!-- 任务进行中：平台级实时状态，让用户看清每个平台各自到哪一步 -->
                  <el-tag
                    v-if="taskPlatformStatus(p.code)"
                    size="small"
                    :type="taskPlatformTagType(taskPlatformStatus(p.code))"
                    effect="dark"
                  >
                    {{ TASK_PLATFORM_LABELS[taskPlatformStatus(p.code)] }}
                  </el-tag>
                </span>
              </template>

              <div class="pane">
                <div class="hint">
                  标题 ≤ {{ p.titleMax }} 字 · 正文 {{ p.contentMin }}–{{
                    p.contentMax
                  }}
                  字 · 标签 {{ p.tagMin }}–{{ p.tagMax }} 个
                </div>

                <div class="field">
                  <div class="field-label">标题</div>
                  <el-input
                    v-model="draftOf(p.code).title"
                    :maxlength="p.titleMax"
                    show-word-limit
                    placeholder="尚未生成"
                  />
                </div>

                <div class="field">
                  <div class="field-label">正文</div>
                  <el-input
                    v-model="draftOf(p.code).content"
                    type="textarea"
                    :rows="8"
                    :maxlength="p.contentMax"
                    show-word-limit
                    placeholder="尚未生成"
                  />
                </div>

                <div class="field">
                  <div class="field-label">话题标签（空格分隔）</div>
                  <el-input
                    v-model="draftOf(p.code).tags"
                    placeholder="尚未生成"
                  />
                </div>

                <div v-if="contentOf(p.code)?.creditLine" class="credit-line">
                  {{ contentOf(p.code)?.creditLine }}
                </div>
                <div v-else class="credit-missing">
                  无图片版权信息，发布时不会附带署名
                </div>

                <!--
                  发布结果：自动发布跑在无人值守的 Windows 机器上，这里是第一时间
                  看到「到底发出去了没有」的地方。注意这里展示的是【最后一次】结果的
                  快照——之前失败过的记录会被覆盖，完整历史要点「发布历史」去流水页看。
                -->
                <div
                  v-if="
                    contentOf(p.code)?.publishStatus &&
                    contentOf(p.code)?.publishStatus !== 'pending'
                  "
                  class="publish-result"
                >
                  <div class="result-head">
                    <span class="field-label">发布结果</span>
                    <el-tag
                      size="small"
                      :type="
                        publishStatusType(contentOf(p.code)?.publishStatus)
                      "
                      effect="dark"
                    >
                      {{
                        PUBLISH_STATUS_LABELS[
                          contentOf(p.code)?.publishStatus ?? ""
                        ] || contentOf(p.code)?.publishStatus
                      }}
                    </el-tag>
                    <span
                      v-if="contentOf(p.code)?.publishTime"
                      class="result-time"
                    >
                      {{ formatDateTime(contentOf(p.code)?.publishTime) }}
                    </span>
                    <el-button
                      link
                      type="primary"
                      @click="gotoPublishHistory(p.code)"
                    >
                      发布历史
                    </el-button>
                  </div>
                  <div
                    v-if="contentOf(p.code)?.publishStatus === 'failed'"
                    class="result-reason"
                  >
                    {{
                      contentOf(p.code)?.publishMessage ||
                      "（外部程序未上报原因）"
                    }}
                  </div>
                  <el-link
                    v-if="contentOf(p.code)?.externalUrl"
                    class="result-link"
                    :href="contentOf(p.code)?.externalUrl"
                    target="_blank"
                    type="primary"
                  >
                    {{ contentOf(p.code)?.externalUrl }}
                  </el-link>
                </div>

                <div class="pane-actions">
                  <el-button
                    v-perms="'publishPackage:index:edit'"
                    :loading="saving[p.code]"
                    :icon="useRenderIcon(Check)"
                    @click="handleSave(p.code)"
                  >
                    保存修改
                  </el-button>
                  <el-button
                    type="primary"
                    :icon="useRenderIcon(DocumentCopy)"
                    @click="copyContent(p.code)"
                  >
                    一键复制
                  </el-button>
                  <el-button
                    v-perms="'publishPackage:index:generate'"
                    :loading="generating"
                    :icon="useRenderIcon(Refresh)"
                    @click="handleGenerate([p.code], true)"
                  >
                    重生成该平台
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-card>

    <!-- ==================== 换图抽屉 ==================== -->
    <el-drawer
      v-model="pickerVisible"
      :title="`选择发布图片 · ${pickerDate || '今日'}`"
      size="60%"
    >
      <div v-loading="pickerLoading">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="picker-tip"
          description="勾选顺序即发布图序。确认后仅重建选图，已人工修改的文案不会被覆盖。"
        />
        <div class="picker-grid">
          <div
            v-for="img in pickerImages"
            :key="img.id"
            class="picker-item"
            :class="{ selected: pickerSelected.includes(img.id) }"
            @click="togglePickerImage(img.id)"
          >
            <el-image
              :src="getDailyImageThumbnailUrl(img.id)"
              fit="cover"
              class="picker-thumb"
            />
            <div class="picker-meta">
              <div class="picker-name">{{ img.originalName || "-" }}</div>
              <div class="picker-sub">
                <el-tag
                  v-if="pickerSelected.includes(img.id)"
                  size="small"
                  type="success"
                  effect="dark"
                >
                  {{ pickerSelected.indexOf(img.id) + 1 }}
                </el-tag>
                <span v-if="img.authorName">{{ img.authorName }}</span>
                <span v-if="img.visionStatus !== 1" class="warn">
                  无视觉描述
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <span class="count">已选 {{ pickerSelected.length }} 张</span>
          <div>
            <el-button @click="pickerVisible = false">取消</el-button>
            <el-button
              type="primary"
              :loading="pickerSubmitting"
              :disabled="!pickerSelected.length"
              @click="submitPicker"
            >
              确认选图
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 准备内容包 ==================== -->
    <el-dialog v-model="createVisible" title="准备内容包" width="440px">
      <el-form label-width="88px">
        <el-form-item label="业务日期">
          <el-date-picker
            v-model="createDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="留空表示今天"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createSubmitting"
          @click="submitCreate"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.main {
  margin: 12px;
}

.detail-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.detail-title {
  display: flex;
  gap: 10px;
  align-items: center;

  .date {
    font-size: 16px;
    font-weight: 500;
  }

  .theme {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-body {
  display: flex;
  gap: 20px;
  align-items: flex-start;

  @media (width <= 1100px) {
    flex-direction: column;
  }
}

.image-col {
  flex: 0 0 260px;
}

.content-col {
  flex: 1;
  min-width: 0;
}

.col-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.image-item {
  position: relative;
  margin-bottom: 14px;
}

.order-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: #fff;
  text-align: center;
  background: rgb(0 0 0 / 55%);
  border-radius: 50%;
}

.thumb {
  width: 100%;
  height: 160px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.image-meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reason {
    margin-top: 2px;
    color: var(--el-color-primary);
  }

  .author {
    margin-top: 2px;
    color: var(--el-text-color-tertiary);
  }
}

.pane {
  .hint {
    margin-bottom: 14px;
    font-size: 12px;
    color: var(--el-text-color-tertiary);
  }

  .field {
    margin-bottom: 14px;
  }

  .field-label {
    margin-bottom: 6px;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }
}

.credit-line {
  padding: 8px 10px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-radius: 6px;
}

.credit-missing {
  padding: 8px 10px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--el-text-color-tertiary);
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.pane-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 发布结果区块：失败时用红色底强调，因为它需要人立刻处理 */
.publish-result {
  padding: 10px 12px;
  margin-bottom: 14px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.result-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.result-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.result-reason {
  max-height: 160px;
  padding: 8px;
  margin-top: 8px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-color-danger);
  word-break: break-all;
  white-space: pre-wrap;
  background: var(--el-color-danger-light-9);
  border-radius: 4px;
}

.result-link {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  word-break: break-all;
}

.picker-tip {
  margin-bottom: 14px;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.picker-item {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s;

  &.selected {
    border-color: var(--el-color-primary);
  }
}

.picker-thumb {
  width: 100%;
  height: 120px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.picker-meta {
  margin-top: 4px;
  font-size: 12px;
}

.picker-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-sub {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-tertiary);

  .warn {
    color: var(--el-color-warning);
  }
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .count {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

/* 异步任务进度条：生成/选图期间显示，避免在分钟级等待中看起来像卡死 */
.task-progress {
  margin-bottom: 12px;

  .task-message {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>
