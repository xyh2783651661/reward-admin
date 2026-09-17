<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { getMailRecipientList } from "@/api/mail";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import type { PaginationProps } from "@pureadmin/table";
import type { FriendPickerFetcher, FriendPickerItem } from "./types";

defineOptions({
  name: "ReFriendPicker"
});

interface Props {
  /**
   * 弹窗显隐。走受控模式（配合 `v-model:visible`），组件自身不持有 visible / open()，
   * 避免出现「父级以为已打开、组件内部仍是隐藏」的状态断层。
   */
  visible: boolean;
  /** 已选好友 id 列表（`v-model`） */
  modelValue?: number[];
  /** 弹窗标题 */
  title?: string;
  /** 是否只列出已启用的好友 */
  enabledOnly?: boolean;
  /** 每页条数 */
  pageSize?: number;
  /** 数据源，默认复用「邮件收件人」分页接口 */
  fetchApi?: FriendPickerFetcher;
  /**
   * 点「确定」后的回调，用于「选择即提交」的场景（父级不需要再挂保存按钮）。
   * 返回 `false` 或抛出异常时弹窗保持打开，便于失败后重试；
   * 错误提示由回调内部负责，组件不重复提示。
   */
  beforeConfirm?: (ids: number[]) => void | boolean | Promise<void | boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  title: "选择业务好友",
  enabledOnly: true,
  pageSize: 10
});

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "update:modelValue", value: number[]): void;
  /** 弹窗关闭动画结束后触发（取消 / 确定 / 右上角关闭 / ESC 都会走到这里） */
  (e: "close"): void;
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit("update:visible", value)
});

const tableRef = ref();
const loading = ref(false);
/** 确认提交中（配合 beforeConfirm 使用） */
const confirming = ref(false);
const keyword = ref("");
const dataList = ref<FriendPickerItem[]>([]);

/**
 * 已选 id 集合，跨页累计。
 * 未点「确定」前不回写父级，因此取消或直接关闭不会污染外部已选值。
 */
const pendingIds = ref<number[]>([]);

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: props.pageSize,
  currentPage: 1,
  background: true
});

const selectedCount = computed(() => pendingIds.value.length);

/** 每次打开都重置搜索与分页，并把父级当前已选 id 同步进来 */
watch(
  () => props.visible,
  visible => {
    if (!visible) return;
    keyword.value = "";
    pendingIds.value = [...props.modelValue];
    pagination.currentPage = 1;
    pagination.pageSize = props.pageSize;
    void loadList();
  }
);

async function loadList() {
  loading.value = true;
  try {
    const fetcher = props.fetchApi ?? getMailRecipientList;
    const { data } = await fetcher({
      name: keyword.value || undefined,
      email: keyword.value || undefined,
      enabled: props.enabledOnly ? true : undefined,
      current: pagination.currentPage,
      size: pagination.pageSize
    });
    dataList.value = (data?.records ?? []) as FriendPickerItem[];
    pagination.total = data?.total ?? 0;
    pagination.pageSize = data?.size ?? pagination.pageSize;
    pagination.currentPage = data?.current ?? pagination.currentPage;
    await nextTick();
    echoSelected();
  } catch (error) {
    dataList.value = [];
    pagination.total = 0;
    message(getErrorMessage(error, "加载好友列表失败"), { type: "error" });
  } finally {
    loading.value = false;
  }
}

/** el-table 换页会清空勾选，需要把当前页里已选的 id 手动补回勾选态 */
function echoSelected() {
  const table = tableRef.value;
  if (!table) return;
  dataList.value.forEach(row => {
    if (pendingIds.value.includes(row.id)) table.toggleRowSelection(row, true);
  });
}

/**
 * 勾选变化时以「当前页」为单位重建已选集合：
 * 先剔除当前页的全部 id，再并入本次实际勾选的行，其它页的选择因此得以保留。
 */
function handleSelectionChange(rows: FriendPickerItem[]) {
  const pageIds = new Set(dataList.value.map(row => row.id));
  const next = new Set(pendingIds.value.filter(id => !pageIds.has(id)));
  rows.forEach(row => next.add(row.id));
  pendingIds.value = Array.from(next);
}

function handleSearch() {
  pagination.currentPage = 1;
  void loadList();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.currentPage = 1;
  void loadList();
}

function handleCurrentChange(current: number) {
  pagination.currentPage = current;
  void loadList();
}

async function handleConfirm() {
  if (confirming.value) return;
  const ids = [...pendingIds.value];

  if (props.beforeConfirm) {
    confirming.value = true;
    let ok = false;
    try {
      ok = (await props.beforeConfirm(ids)) !== false;
    } catch {
      ok = false;
    }
    if (!ok) {
      // 提交失败：保持弹窗打开，错误提示由 beforeConfirm 内部负责
      confirming.value = false;
      return;
    }
  }

  emit("update:modelValue", ids);
  dialogVisible.value = false;
}

function handleClosed() {
  emit("close");
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    :close-on-press-escape="!confirming"
    :show-close="!confirming"
    append-to-body
    @closed="handleClosed"
  >
    <div class="mb-2 flex items-center gap-2">
      <el-input
        v-model="keyword"
        placeholder="按姓名 / 邮箱搜索"
        clearable
        class="w-[280px]!"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="dataList"
      height="360"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column label="姓名" prop="name" min-width="120">
        <template #default="{ row }">
          <span>{{ row.name || "-" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="邮箱" prop="email" min-width="220">
        <template #default="{ row }">
          <span v-if="row.email">{{ row.email }}</span>
          <el-tag v-else type="info" size="small">邮箱：未设置</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="mt-3 justify-end"
      :current-page="pagination.currentPage"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      background
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <div v-if="$slots.tip" class="mt-2 text-sm">
      <slot name="tip" :count="selectedCount" />
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="text-gray-500">已选择 {{ selectedCount }} 人</span>
        <div>
          <el-button :disabled="confirming" @click="dialogVisible = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="confirming"
            @click="handleConfirm"
          >
            确定
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
