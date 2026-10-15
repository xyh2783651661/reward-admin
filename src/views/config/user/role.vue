<script setup lang="ts">
import { computed, ref } from "vue";
import { AssignOptionList, AssignPanel } from "@/components/ReAssign";
import type { RoleFormProps } from "./utils/types";

const props = withDefaults(defineProps<RoleFormProps>(), {
  formInline: () => ({
    nickName: "",
    roleOptions: [],
    ids: []
  })
});

const newFormInline = ref(props.formInline);

const options = computed(() =>
  (newFormInline.value.roleOptions ?? []).map(item => ({
    id: item.id,
    label: String(item.roleName ?? item.name ?? item.id),
    description: item.roleCode ? String(item.roleCode) : undefined
  }))
);
</script>

<template>
  <AssignPanel
    subject-label="用户"
    :subject-name="newFormInline.nickName"
    target-label="角色"
    :selected-count="newFormInline.ids.length"
    :total-count="options.length"
  >
    <AssignOptionList
      v-model="newFormInline.ids"
      :options="options"
      search-placeholder="搜索角色名称或编码"
      empty-text="暂无可分配的角色"
    />
  </AssignPanel>
</template>
