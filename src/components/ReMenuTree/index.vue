<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { MenuTreeNodeType } from "./types";
import { IconifyIconOnline } from "@/components/ReIcon";

defineOptions({
  name: "ReMenuTree"
});

interface Props {
  /** 树数据（children 已构建完成的完整树） */
  data?: any[];
  /**
   * 已授权的节点 id 集合，含「全选」与「半选」（`v-model`）。
   *
   * 注意它对应的就是后端要保存的那份 id 列表：联动模式下勾选下级时，
   * 上级会以半选状态一并计入，否则后端拿到子菜单却拿不到父级目录，
   * 前端会因为缺少上级节点而渲染不出这条菜单。
   */
  modelValue?: number[];
  /** 节点唯一标识字段 */
  nodeKey?: string;
  /** 节点显示名字段 */
  labelKey?: string;
  /** 子节点字段 */
  childrenKey?: string;
  /** 节点类型字段，配合 typeMap 渲染类型标签 */
  typeKey?: string;
  /** 权限标识字段，有值时在节点名后以等宽字体展示 */
  permsKey?: string;
  /** 图标字段，有值时在节点名前渲染对应图标 */
  iconKey?: string;
  /** 节点类型 → 标签映射，传 `{}` 可关闭类型标签 */
  typeMap?: Record<string | number, MenuTreeNodeType>;
  /** 父子联动：勾选上级同时授权其全部下级；关闭后各级独立勾选 */
  linkage?: boolean;
  /** 是否显示工具栏（搜索 / 展开折叠 / 全选 / 计数） */
  showToolbar?: boolean;
  /** 树区域最大高度，超出滚动 */
  maxHeight?: string;
  /** 搜索框占位文案 */
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  modelValue: () => [],
  nodeKey: "id",
  labelKey: "menuName",
  childrenKey: "children",
  typeKey: "menuType",
  permsKey: "perms",
  iconKey: "icon",
  typeMap: () => ({
    0: { label: "目录", tag: "info" },
    1: { label: "菜单", tag: "success" },
    2: { label: "按钮", tag: "warning" }
  }),
  linkage: true,
  showToolbar: true,
  maxHeight: "420px",
  placeholder: "请输入菜单名称或权限标识"
});

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();

const treeRef = ref();
const keyword = ref("");
const expandAll = ref(true);
/** 当前「将被保存」的 id 集合（全选 + 半选），仅用于界面计数 */
const grantedIds = ref<number[]>([]);
/** 最近一次由组件自身发出的值，用于跳过 v-model 回流引起的重复回显 */
let lastEmitted: number[] = [];

function getChildren(node: any): any[] {
  const children = node?.[props.childrenKey];
  return Array.isArray(children) ? children : [];
}

function walkTree(nodes: any[], callback: (node: any) => void) {
  for (const node of nodes ?? []) {
    callback(node);
    walkTree(getChildren(node), callback);
  }
}

/** 收集某节点的全部后代 id（不含自身） */
function collectDescendantIds(node: any, acc: number[] = []): number[] {
  for (const child of getChildren(node)) {
    acc.push(child[props.nodeKey]);
    collectDescendantIds(child, acc);
  }
  return acc;
}

function allNodeKeys(): number[] {
  const keys: number[] = [];
  walkTree(props.data, node => keys.push(node[props.nodeKey]));
  return keys;
}

function readGrantedIds(): number[] {
  const tree = treeRef.value;
  if (!tree) return [];
  const checked: number[] = tree.getCheckedKeys() ?? [];
  // 联动模式下被部分勾选的下级会把上级置为半选，上级同样属于授权范围
  const half: number[] = props.linkage ? (tree.getHalfCheckedKeys() ?? []) : [];
  return [...checked, ...half];
}

function isSameSet(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  const set = new Set(right);
  return left.every(id => set.has(id));
}

/**
 * 用外部传入的已授权 id 回显勾选态。
 *
 * 这里不能直接 `setCheckedKeys(ids)`：联动模式下勾选父级会向下级联，
 * 会把「父级已授权、但只有部分子级授权」的情况误判成整棵子树都授权，
 * 白白放开权限。因此按子树是否已全部授权分别处理：
 * - 子树已全部授权 → 级联勾选，正常带出下级；
 * - 子树完全未授权（历史数据可能出现「只授权了父级」）→ 非级联勾选，
 *   只保留该父级，不凭空放开它的下级；
 * - 子树部分授权 → 不动，交给已勾选的下级自动置为半选。
 */
async function syncCheckedFromModel(granted: number[]) {
  await nextTick();
  const tree = treeRef.value;
  if (!tree) return;

  tree.setCheckedKeys([]);
  const grantedSet = new Set(granted);

  walkTree(props.data, node => {
    const key = node[props.nodeKey];
    if (!grantedSet.has(key)) return;

    const descendants = collectDescendantIds(node);
    if (descendants.every(id => grantedSet.has(id))) {
      tree.getNode(key)?.setChecked(true, true);
    } else if (!descendants.some(id => grantedSet.has(id))) {
      tree.getNode(key)?.setChecked(true, false);
    }
  });

  await nextTick();
  grantedIds.value = readGrantedIds();
}

function emitGranted() {
  const granted = readGrantedIds();
  lastEmitted = granted;
  grantedIds.value = granted;
  emit("update:modelValue", granted);
}

function handleCheck() {
  emitGranted();
}

function onQueryChanged(query: string) {
  treeRef.value?.filter(query);
  // 命中的节点可能在折叠的枝干里，搜索时先展开，否则搜到了也看不见
  if (query) {
    expandAll.value = true;
    setExpandAll(true);
  }
}

function filterNode(query: string, node: any) {
  const keywordValue = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!keywordValue) return true;
  const label = String(node?.[props.labelKey] ?? "").toLowerCase();
  const perms = String(node?.[props.permsKey] ?? "").toLowerCase();
  return label.includes(keywordValue) || perms.includes(keywordValue);
}

function setExpandAll(expand: boolean) {
  const tree = treeRef.value;
  if (!tree) return;
  for (const key of allNodeKeys()) {
    const node = tree.getNode(key);
    if (!node) continue;
    expand ? node.expand() : node.collapse();
  }
}

function toggleExpandAll() {
  expandAll.value = !expandAll.value;
  setExpandAll(expandAll.value);
}

function handleSelectAll(checked: boolean) {
  treeRef.value?.setCheckedKeys(checked ? allNodeKeys() : []);
  emitGranted();
}

const isAllChecked = computed(() => {
  const total = allNodeKeys().length;
  return total > 0 && grantedIds.value.length >= total;
});

onMounted(() => {
  syncCheckedFromModel(props.modelValue ?? []);
});

watch(
  () => props.modelValue,
  value => {
    const next = value ?? [];
    if (isSameSet(next, lastEmitted)) return;
    syncCheckedFromModel(next);
  }
);

watch(
  () => props.data,
  () => {
    lastEmitted = [];
    syncCheckedFromModel(props.modelValue ?? []);
  }
);

watch(
  () => props.linkage,
  () => {
    lastEmitted = [];
    syncCheckedFromModel(props.modelValue ?? []);
  }
);
</script>

<template>
  <div class="re-menu-tree">
    <div v-if="showToolbar" class="flex flex-wrap items-center gap-2 mb-2">
      <el-input
        v-model="keyword"
        class="w-64!"
        clearable
        :placeholder="placeholder"
        @input="onQueryChanged"
      />
      <el-button size="small" @click="toggleExpandAll">
        {{ expandAll ? "折叠全部" : "展开全部" }}
      </el-button>
      <el-checkbox :model-value="isAllChecked" @change="handleSelectAll">
        全选
      </el-checkbox>
      <div class="flex-1" />
      <el-tooltip content="含联动模式下自动计入的上级节点" placement="top">
        <span class="text-sm text-gray-500">
          已选
          <span class="font-medium">{{ grantedIds.length }}</span>
          项
        </span>
      </el-tooltip>
    </div>

    <p v-if="linkage" class="mb-2 text-xs text-gray-400">
      勾选上级会同时授权其全部下级；下级被部分勾选时，上级按半选一并计入授权。
    </p>

    <slot name="tip" :count="grantedIds.length" />

    <div class="re-menu-tree__body" :style="{ maxHeight }">
      <el-tree
        v-if="data.length"
        ref="treeRef"
        show-checkbox
        default-expand-all
        :node-key="nodeKey"
        :data="data"
        :props="{ label: labelKey, children: childrenKey }"
        :check-strictly="!linkage"
        :filter-node-method="filterNode"
        @check="handleCheck"
      >
        <template #default="{ data: node }">
          <span class="flex items-center gap-2 min-w-0">
            <IconifyIconOnline
              v-if="node[iconKey]"
              :icon="node[iconKey]"
              class="w-[18px] h-[18px] shrink-0"
            />
            <el-tag
              v-if="typeMap[node[typeKey]]"
              size="small"
              effect="plain"
              :type="typeMap[node[typeKey]].tag || 'info'"
            >
              {{ typeMap[node[typeKey]].label }}
            </el-tag>
            <span class="truncate">{{ node[labelKey] }}</span>
            <span
              v-if="node[permsKey]"
              class="text-xs text-gray-400 font-mono truncate"
            >
              {{ node[permsKey] }}
            </span>
          </span>
        </template>
      </el-tree>
      <el-empty v-else :image-size="60" description="暂无菜单数据" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.re-menu-tree__body {
  min-height: 200px;
  padding: 4px 8px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;

  :deep(.el-tree-node__content) {
    height: 30px;
  }
}
</style>
