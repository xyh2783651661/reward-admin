<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { getMailRecipientList } from "@/api/system";
import type { PaginationProps } from "@pureadmin/table";

defineOptions({
  name: "MailRecipientSelector"
});

interface RecipientRow {
  id: number;
  email: string;
  name: string;
  enabled: boolean;
}

const props = defineProps<{
  modelValue: number[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();

const visible = ref(false);
const loading = ref(false);
const keyword = ref("");
const dataList = ref<RecipientRow[]>([]);
const selectedRows = ref<RecipientRow[]>([]);
const selectedIds = ref<number[]>(props.modelValue ?? []);
const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const selectedCount = computed(() => selectedIds.value.length);

function open() {
  visible.value = true;
  selectedIds.value = [...(props.modelValue ?? [])];
  onSearch();
}

function close() {
  visible.value = false;
}

async function onSearch() {
  loading.value = true;
  try {
    const { data } = await getMailRecipientList({
      name: keyword.value || undefined,
      email: keyword.value || undefined,
      enabled: true,
      current: pagination.currentPage,
      size: pagination.pageSize
    });
    dataList.value = (data.records ?? []) as unknown as RecipientRow[];
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;
  } finally {
    loading.value = false;
  }
}

function handleSizeChange(val: number) {
  pagination.pageSize = val;
  pagination.currentPage = 1;
  onSearch();
}

function handleCurrentChange(val: number) {
  pagination.currentPage = val;
  onSearch();
}

function handleSelectionChange(rows: RecipientRow[]) {
  selectedRows.value = rows;
}

function confirm() {
  // 合并：已选的跨页 id + 当前页勾选行
  const currentPageIds = selectedRows.value.map(r => r.id);
  const merged = new Set<number>([...selectedIds.value, ...currentPageIds]);
  selectedIds.value = Array.from(merged);
  emit("update:modelValue", selectedIds.value);
  visible.value = false;
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    title="选择业务好友"
    width="720px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="mb-2 flex items-center gap-2">
      <el-input
        v-model="keyword"
        placeholder="按姓名 / 邮箱搜索"
        clearable
        class="w-[280px]!"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" @click="onSearch">搜索</el-button>
    </div>

    <el-table
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

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="text-gray-500">已选择 {{ selectedCount }} 人</span>
        <div>
          <el-button @click="close">取消</el-button>
          <el-button type="primary" @click="confirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
