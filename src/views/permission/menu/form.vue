<script setup lang="ts">
import { ref } from "vue";
import { formRules } from "./utils/rule";
import type { FormProps } from "./utils/types";

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
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
  }),
  menuTree: () => []
});

const ruleFormRef = ref();
const newFormInline = ref(props.formInline);
const treeData = ref(props.menuTree);

function getRef() {
  return ruleFormRef.value;
}

defineExpose({ getRef });
</script>

<template>
  <el-form
    ref="ruleFormRef"
    :model="newFormInline"
    :rules="formRules"
    label-width="90px"
  >
    <el-form-item label="父菜单" prop="parentId">
      <el-tree-select
        v-model="newFormInline.parentId"
        :data="[{ id: 0, menuName: '顶级菜单', children: treeData }]"
        :props="{ value: 'id', label: 'menuName', children: 'children' }"
        check-strictly
        clearable
        default-expand-all
        class="w-full"
        placeholder="请选择父菜单"
      />
    </el-form-item>
    <el-form-item label="类型" prop="menuType">
      <el-radio-group v-model="newFormInline.menuType">
        <el-radio :value="0">目录</el-radio>
        <el-radio :value="1">菜单</el-radio>
        <el-radio :value="2">按钮</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="菜单名称" prop="menuName">
      <el-input v-model="newFormInline.menuName" placeholder="请输入菜单名称" />
    </el-form-item>
    <el-form-item label="中文标题">
      <el-input v-model="newFormInline.titleZh" placeholder="请输入中文标题" />
    </el-form-item>
    <el-form-item label="英文标题">
      <el-input v-model="newFormInline.titleEn" placeholder="请输入英文标题" />
    </el-form-item>
    <template v-if="newFormInline.menuType !== 2">
      <el-form-item label="路由路径">
        <el-input
          v-model="newFormInline.path"
          placeholder="如 /config/reward"
        />
      </el-form-item>
      <el-form-item label="组件路径">
        <el-input
          v-model="newFormInline.component"
          placeholder="如 config/reward/index（目录可留空）"
        />
      </el-form-item>
      <el-form-item label="路由name">
        <el-input v-model="newFormInline.routeName" placeholder="如 Reward" />
      </el-form-item>
      <el-form-item label="图标">
        <el-input
          v-model="newFormInline.icon"
          placeholder="如 ri:medal-2-line"
        />
      </el-form-item>
      <el-form-item label="外链地址">
        <el-input
          v-model="newFormInline.frameSrc"
          placeholder="外链地址，无则留空"
        />
      </el-form-item>
    </template>
    <el-form-item v-if="newFormInline.menuType === 2" label="权限标识">
      <el-input v-model="newFormInline.perms" placeholder="如 btn:add" />
    </el-form-item>
    <el-form-item label="排序">
      <el-input-number
        v-model="newFormInline.rank"
        :min="0"
        controls-position="right"
      />
    </el-form-item>
    <el-form-item label="是否缓存">
      <el-switch
        v-model="newFormInline.keepAlive"
        :active-value="1"
        :inactive-value="0"
      />
    </el-form-item>
    <el-form-item label="是否显示">
      <el-switch
        v-model="newFormInline.showLink"
        :active-value="1"
        :inactive-value="0"
      />
    </el-form-item>
    <el-form-item label="状态">
      <el-switch
        v-model="newFormInline.status"
        :active-value="1"
        :inactive-value="0"
      />
    </el-form-item>
  </el-form>
</template>
