<script setup lang="tsx">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getMenuTree,
  addMenu,
  updateMenu,
  deleteMenu,
  type SysMenuVo,
  type SysMenuReq,
  type MenuType
} from "@/api/rbac";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({ name: "SysMenu" });

const loading = ref(true);
const dataList = ref<SysMenuVo[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref("新增");
const formRef = ref();
const submitting = ref(false);

const defaultForm = (): SysMenuReq => ({
  id: undefined,
  parentId: 0,
  menuName: "",
  menuType: 1,
  path: "",
  component: "",
  routeName: "",
  perms: "",
  icon: "",
  titleZh: "",
  titleEn: "",
  rank: 0,
  keepAlive: 0,
  showLink: 1,
  frameSrc: "",
  status: 1
});
const form = reactive<SysMenuReq>(defaultForm());

const menuTypeText = (t: MenuType) => ({ 0: "目录", 1: "菜单", 2: "按钮" })[t];

const columns: TableColumnList = [
  { label: "菜单名称", prop: "menuName", minWidth: 160 },
  {
    label: "类型",
    prop: "menuType",
    width: 80,
    cellRenderer: ({ row }) => (
      <el-tag
        type={
          ({ 0: "info", 1: "success", 2: "warning" }[row.menuType] ||
            "info") as any
        }
        effect="plain"
      >
        {menuTypeText(row.menuType)}
      </el-tag>
    )
  },
  { label: "图标", prop: "icon", width: 120 },
  { label: "路由路径", prop: "path", minWidth: 160 },
  { label: "组件路径", prop: "component", minWidth: 180 },
  { label: "权限标识", prop: "perms", width: 120 },
  { label: "排序", prop: "rank", width: 70 },
  {
    label: "状态",
    prop: "status",
    width: 80,
    cellRenderer: ({ row }) => (
      <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
        {row.status === 1 ? "启用" : "禁用"}
      </el-tag>
    )
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { data } = await getMenuTree();
    dataList.value = data ?? [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, defaultForm());
}

function openDialog(title = "新增", row?: SysMenuVo) {
  dialogTitle.value = title;
  if (row) {
    Object.assign(form, {
      id: row.id,
      parentId: row.parentId,
      menuName: row.menuName,
      menuType: row.menuType,
      path: row.path ?? "",
      component: row.component ?? "",
      routeName: row.routeName ?? "",
      perms: row.perms ?? "",
      icon: row.icon ?? "",
      titleZh: row.titleZh ?? "",
      titleEn: row.titleEn ?? "",
      rank: row.rank ?? 0,
      keepAlive: row.keepAlive ?? 0,
      showLink: row.showLink ?? 1,
      frameSrc: row.frameSrc ?? "",
      status: row.status ?? 1
    });
  } else {
    resetForm();
  }
  dialogVisible.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (form.id) {
        await updateMenu(form);
      } else {
        await addMenu(form);
      }
      message(`${dialogTitle.value}成功`, { type: "success" });
      dialogVisible.value = false;
      onSearch();
    } finally {
      submitting.value = false;
    }
  });
}

async function handleDelete(row: SysMenuVo) {
  await deleteMenu(row.id);
  message("删除成功", { type: "success" });
  onSearch();
}

const formRules = {
  menuName: [{ required: true, message: "请输入菜单名称", trigger: "blur" }],
  menuType: [{ required: true, message: "请选择类型", trigger: "change" }]
};

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <PureTableBar title="菜单管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'system:menu:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openDialog()"
        >
          新增菜单
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          row-key="id"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          default-expand-all
          :loading="loading"
          :size="size"
          adaptive
          :data="dataList"
          :columns="dynamicColumns"
          :tree-props="{
            children: 'children',
            hasChildren: 'hasChildren',
            checkStrictly: false
          }"
          :header-cell-style="{
            background: 'var(--el-fill-color-light)',
            color: 'var(--el-text-color-primary)'
          }"
        >
          <template #operation="{ row }">
            <el-button
              v-perms="'system:menu:edit'"
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
              :title="`是否确认删除菜单「${row.menuName}」`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'system:menu:delete'"
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
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="`${dialogTitle}菜单`"
      width="46%"
      draggable
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="父菜单">
          <el-tree-select
            v-model="form.parentId"
            :data="[{ id: 0, menuName: '顶级菜单', children: dataList }]"
            :props="{ value: 'id', label: 'menuName', children: 'children' }"
            check-strictly
            clearable
            default-expand-all
            class="w-full"
            placeholder="请选择父菜单"
          />
        </el-form-item>
        <el-form-item label="类型" prop="menuType">
          <el-radio-group v-model="form.menuType">
            <el-radio :value="0">目录</el-radio>
            <el-radio :value="1">菜单</el-radio>
            <el-radio :value="2">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="中文标题">
          <el-input v-model="form.titleZh" placeholder="请输入中文标题" />
        </el-form-item>
        <el-form-item label="英文标题">
          <el-input v-model="form.titleEn" placeholder="请输入英文标题" />
        </el-form-item>
        <template v-if="form.menuType !== 2">
          <el-form-item label="路由路径">
            <el-input v-model="form.path" placeholder="如 /config/reward" />
          </el-form-item>
          <el-form-item label="组件路径">
            <el-input
              v-model="form.component"
              placeholder="如 config/reward/index（目录可留空）"
            />
          </el-form-item>
          <el-form-item label="路由name">
            <el-input v-model="form.routeName" placeholder="如 Reward" />
          </el-form-item>
          <el-form-item label="图标">
            <el-input v-model="form.icon" placeholder="如 ri:medal-2-line" />
          </el-form-item>
          <el-form-item label="外链地址">
            <el-input
              v-model="form.frameSrc"
              placeholder="外链地址，无则留空"
            />
          </el-form-item>
        </template>
        <el-form-item v-if="form.menuType === 2" label="权限标识">
          <el-input v-model="form.perms" placeholder="如 btn:add" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="form.rank"
            :min="0"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="是否缓存">
          <el-switch
            v-model="form.keepAlive"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch
            v-model="form.showLink"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  margin: 24px 24px 0 !important;
}
</style>
