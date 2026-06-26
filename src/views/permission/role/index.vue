<script setup lang="tsx">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { PureTableBar } from "@/components/RePureTableBar";
import type { PaginationProps } from "@pureadmin/table";
import {
  getRolePage,
  addRole,
  updateRole,
  deleteRole,
  getMenuTree,
  getRoleDetail,
  assignRoleMenus,
  type SysRoleVo,
  type SysRoleReq,
  type SysMenuVo
} from "@/api/rbac";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import Menu from "~icons/ep/menu";
import AddFill from "~icons/ri/add-circle-line";

defineOptions({ name: "SysRole" });

const formRef = ref();
const loading = ref(true);
const dataList = ref<SysRoleVo[]>([]);
const submitDialog = ref(false);
const submitTitle = ref("新增");
const submitting = ref(false);
const permDialog = ref(false);
const permLoading = ref(false);
const treeRef = ref();
const menuTree = ref<SysMenuVo[]>([]);
const currentRoleId = ref<number>();

const search = reactive<SysRoleReq>({
  roleName: "",
  roleCode: "",
  status: undefined,
  current: 1,
  size: 10
});

const pagination = reactive<PaginationProps>({
  total: 0,
  pageSize: 10,
  currentPage: 1,
  background: true
});

const defaultForm = (): SysRoleReq => ({
  id: undefined,
  roleCode: "",
  roleName: "",
  status: 1,
  remark: ""
});
const form = reactive<SysRoleReq>(defaultForm());

const columns: TableColumnList = [
  { label: "角色编码", prop: "roleCode", minWidth: 120 },
  { label: "角色名称", prop: "roleName", minWidth: 120 },
  {
    label: "状态",
    prop: "status",
    width: 90,
    cellRenderer: ({ row }) => (
      <el-tag type={row.status === 1 ? "success" : "danger"} effect="plain">
        {row.status === 1 ? "启用" : "禁用"}
      </el-tag>
    )
  },
  { label: "备注", prop: "remark", minWidth: 160 },
  { label: "创建时间", prop: "createdTime", minWidth: 160 },
  { label: "操作", fixed: "right", width: 220, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { data } = await getRolePage(search);
    dataList.value = data.records ?? [];
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, defaultForm());
}

function openSubmit(title = "新增", row?: SysRoleVo) {
  submitTitle.value = title;
  if (row) {
    Object.assign(form, {
      id: row.id,
      roleCode: row.roleCode,
      roleName: row.roleName,
      status: row.status ?? 1,
      remark: row.remark ?? ""
    });
  } else {
    resetForm();
  }
  submitDialog.value = true;
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (form.id) {
        await updateRole(form);
      } else {
        await addRole(form);
      }
      message(`${submitTitle.value}成功`, { type: "success" });
      submitDialog.value = false;
      onSearch();
    } finally {
      submitting.value = false;
    }
  });
}

async function handleDelete(row: SysRoleVo) {
  await deleteRole(row.id);
  message("删除成功", { type: "success" });
  onSearch();
}

async function openPerm(row: SysRoleVo) {
  currentRoleId.value = row.id;
  permDialog.value = true;
  permLoading.value = true;
  try {
    if (menuTree.value.length === 0) {
      const { data } = await getMenuTree();
      menuTree.value = data ?? [];
    }
    const { data: detail } = await getRoleDetail(row.id);
    // 等待树渲染
    setTimeout(() => {
      treeRef.value?.setCheckedKeys(detail.menuIds ?? []);
    }, 50);
  } finally {
    permLoading.value = false;
  }
}

async function handleSavePerm() {
  const checked = treeRef.value?.getCheckedKeys() ?? [];
  const half = treeRef.value?.getHalfCheckedKeys() ?? [];
  await assignRoleMenus({
    roleId: currentRoleId.value!,
    menuIds: [...checked, ...half]
  });
  message("权限保存成功", { type: "success" });
  permDialog.value = false;
}

function handleSizeChange(val: number) {
  search.size = val;
  onSearch();
}
function handleCurrentChange(val: number) {
  search.current = val;
  onSearch();
}

const formRules = {
  roleCode: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  roleName: [{ required: true, message: "请输入角色名称", trigger: "blur" }]
};

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      :model="search"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="角色名称：">
        <el-input
          v-model="search.roleName"
          placeholder="请输入角色名称"
          clearable
          class="w-[180px]!"
        />
      </el-form-item>
      <el-form-item label="角色编码：">
        <el-input
          v-model="search.roleCode"
          placeholder="请输入角色编码"
          clearable
          class="w-[180px]!"
        />
      </el-form-item>
      <el-form-item label="状态：">
        <el-select
          v-model="search.status"
          placeholder="请选择状态"
          clearable
          class="w-[180px]!"
        >
          <el-option label="已启用" :value="1" />
          <el-option label="已停用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri/search-line')"
          :loading="loading"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="onSearch">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="角色管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'system:role:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openSubmit()"
        >
          新增角色
        </el-button>
      </template>
      <template v-slot="{ size, dynamicColumns }">
        <pure-table
          row-key="id"
          align-whole="center"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          adaptive
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
              v-perms="'system:role:edit'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(EditPen)"
              @click="openSubmit('修改', row)"
            >
              修改
            </el-button>
            <el-button
              v-perms="'system:role:perm'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Menu)"
              @click="openPerm(row)"
            >
              权限
            </el-button>
            <el-popconfirm
              :title="`是否确认删除角色「${row.roleName}」`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'system:role:delete'"
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

    <!-- 新增/修改弹窗 -->
    <el-dialog
      v-model="submitDialog"
      :title="`${submitTitle}角色`"
      width="40%"
      draggable
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="82px"
      >
        <el-form-item label="角色编码" prop="roleCode">
          <el-input
            v-model="form.roleCode"
            :disabled="!!form.id"
            placeholder="如 admin / common"
          />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 菜单权限弹窗 -->
    <el-dialog
      v-model="permDialog"
      title="分配菜单权限"
      width="40%"
      draggable
      destroy-on-close
    >
      <div v-loading="permLoading">
        <el-tree
          ref="treeRef"
          show-checkbox
          node-key="id"
          :data="menuTree"
          :props="{ label: 'menuName', children: 'children' }"
          check-strictly
          default-expand-all
        />
      </div>
      <template #footer>
        <el-button @click="permDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSavePerm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  margin: 24px 24px 0 !important;
}

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
