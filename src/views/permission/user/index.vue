<script setup lang="tsx">
import { ref, reactive, onMounted } from "vue";
import { message } from "@/utils/message";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { PureTableBar } from "@/components/RePureTableBar";
import type { PaginationProps } from "@pureadmin/table";
import {
  getUserPage,
  addUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getRoleAll,
  getUserDetail,
  type SysUserVo,
  type SysUserReq,
  type SysRoleVo
} from "@/api/rbac";

import Delete from "~icons/ep/delete";
import EditPen from "~icons/ep/edit-pen";
import Refresh from "~icons/ep/refresh";
import AddFill from "~icons/ri/add-circle-line";
import Lock from "~icons/ri/lock-password-line";

defineOptions({ name: "SysUser" });

const formRef = ref();
const loading = ref(true);
const dataList = ref<SysUserVo[]>([]);
const submitDialog = ref(false);
const submitTitle = ref("新增");
const submitting = ref(false);
const pwdDialog = ref(false);
const pwdSubmitting = ref(false);
const roleOptions = ref<SysRoleVo[]>([]);
const currentUserId = ref<number>();
const pwdForm = reactive({ password: "", confirm: "" });

const search = reactive<SysUserReq>({
  username: "",
  nickname: "",
  phone: "",
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

const defaultForm = (): SysUserReq => ({
  id: undefined,
  username: "",
  password: "",
  nickname: "",
  avatar: "",
  phone: "",
  email: "",
  status: 1,
  remark: "",
  roleIds: []
});
const form = reactive<SysUserReq>(defaultForm());

const columns: TableColumnList = [
  { label: "用户名", prop: "username", minWidth: 120 },
  { label: "昵称", prop: "nickname", minWidth: 120 },
  { label: "手机号", prop: "phone", minWidth: 120 },
  { label: "邮箱", prop: "email", minWidth: 160 },
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
  { label: "备注", prop: "remark", minWidth: 120 },
  { label: "创建时间", prop: "createdTime", minWidth: 160 },
  { label: "操作", fixed: "right", width: 250, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const { data } = await getUserPage(search);
    dataList.value = data.records ?? [];
    pagination.total = data.total;
    pagination.pageSize = data.size;
    pagination.currentPage = data.current;
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  if (roleOptions.value.length === 0) {
    const { data } = await getRoleAll();
    roleOptions.value = data ?? [];
  }
}

function resetForm() {
  Object.assign(form, defaultForm());
}

async function openSubmit(title = "新增", row?: SysUserVo) {
  await loadRoles();
  submitTitle.value = title;
  if (row) {
    const { data: detail } = await getUserDetail(row.id);
    Object.assign(form, {
      id: detail.id,
      username: detail.username,
      password: "",
      nickname: detail.nickname ?? "",
      avatar: detail.avatar ?? "",
      phone: detail.phone ?? "",
      email: detail.email ?? "",
      status: detail.status ?? 1,
      remark: detail.remark ?? "",
      roleIds: detail.roleIds ?? []
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
        await updateUser(form);
      } else {
        await addUser(form);
      }
      message(`${submitTitle.value}成功`, { type: "success" });
      submitDialog.value = false;
      onSearch();
    } finally {
      submitting.value = false;
    }
  });
}

async function handleDelete(row: SysUserVo) {
  await deleteUser(row.id);
  message("删除成功", { type: "success" });
  onSearch();
}

function openPwd(row: SysUserVo) {
  currentUserId.value = row.id;
  pwdForm.password = "";
  pwdForm.confirm = "";
  pwdDialog.value = true;
}

async function handleResetPwd() {
  if (!pwdForm.password) {
    message("请输入新密码", { type: "warning" });
    return;
  }
  if (pwdForm.password !== pwdForm.confirm) {
    message("两次密码不一致", { type: "warning" });
    return;
  }
  pwdSubmitting.value = true;
  try {
    await resetUserPassword({
      id: currentUserId.value!,
      password: pwdForm.password
    });
    message("密码重置成功", { type: "success" });
    pwdDialog.value = false;
  } finally {
    pwdSubmitting.value = false;
  }
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
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }]
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
      <el-form-item label="用户名：">
        <el-input
          v-model="search.username"
          placeholder="请输入用户名"
          clearable
          class="w-[180px]!"
        />
      </el-form-item>
      <el-form-item label="昵称：">
        <el-input
          v-model="search.nickname"
          placeholder="请输入昵称"
          clearable
          class="w-[180px]!"
        />
      </el-form-item>
      <el-form-item label="手机号：">
        <el-input
          v-model="search.phone"
          placeholder="请输入手机号"
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

    <PureTableBar title="系统用户管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button
          v-perms="'system:user:add'"
          type="primary"
          :icon="useRenderIcon(AddFill)"
          @click="openSubmit()"
        >
          新增用户
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
              v-perms="'system:user:edit'"
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
              v-perms="'system:user:reset-pwd'"
              class="reset-margin"
              link
              type="primary"
              :size="size"
              :icon="useRenderIcon(Lock)"
              @click="openPwd(row)"
            >
              重置密码
            </el-button>
            <el-popconfirm
              :title="`是否确认删除用户「${row.username}」`"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button
                  v-perms="'system:user:delete'"
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
      :title="`${submitTitle}用户`"
      width="46%"
      draggable
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="82px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            :disabled="!!form.id"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item v-if="!form.id" label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="留空则默认 123456"
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="form.roleIds"
            multiple
            clearable
            class="w-full"
            placeholder="请选择角色"
          >
            <el-option
              v-for="r in roleOptions"
              :key="r.id"
              :label="r.roleName"
              :value="r.id"
            />
          </el-select>
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

    <!-- 重置密码弹窗 -->
    <el-dialog
      v-model="pwdDialog"
      title="重置密码"
      width="36%"
      draggable
      destroy-on-close
    >
      <el-form label-width="82px">
        <el-form-item label="新密码">
          <el-input
            v-model="pwdForm.password"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="pwdForm.confirm"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="pwdSubmitting"
          @click="handleResetPwd"
        >
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

.search-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}
</style>
