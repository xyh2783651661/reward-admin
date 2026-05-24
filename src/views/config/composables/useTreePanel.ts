import { handleTree } from "@/utils/tree";
import { message } from "@/utils/message";
import { transformI18n } from "@/plugins/i18n";
import type { Ref } from "vue";
import { ref, watch, onMounted } from "vue";
import { getKeyList } from "@pureadmin/utils";

export interface TreePanelConfig {
  treeRef: Ref;
  loadTreeData: () => Promise<any>;
  getCheckedIds?: (row: any) => Promise<any>;
  savePermission?: (row: any, checkedIds: any[]) => Promise<any>;
  treeProps?: { value: string; label: string; children: string };
}

export function useTreePanel(config: TreePanelConfig) {
  const {
    treeRef,
    loadTreeData,
    getCheckedIds,
    savePermission,
    treeProps = { value: "id", label: "title", children: "children" }
  } = config;

  const curRow = ref();
  const isShow = ref(false);
  const treeIds = ref([]);
  const treeData = ref([]);
  const isLinkage = ref(false);
  const isExpandAll = ref(false);
  const isSelectAll = ref(false);
  const treeSearchValue = ref();

  async function handleMenu(row?: any) {
    if (row?.id) {
      curRow.value = row;
      isShow.value = true;
      if (getCheckedIds) {
        const { data } = await getCheckedIds(row);
        treeRef.value.setCheckedKeys(data);
      }
    } else {
      curRow.value = null;
      isShow.value = false;
    }
  }

  function rowStyle({ row: { id } }: { row: { id: any } }) {
    return {
      cursor: "pointer",
      background: id === curRow.value?.id ? "var(--el-fill-color-light)" : ""
    };
  }

  async function handleSave() {
    if (!curRow.value) return;
    const { name } = curRow.value;
    const checkedKeys = treeRef.value.getCheckedKeys();

    if (savePermission) {
      const r = await savePermission(curRow.value, checkedKeys);
      if (r.code === 200) {
        message(`${name}的权限配置${r.msg}`, { type: "success" });
      } else {
        message(`${name}的权限配置${r.msg}`, { type: "error" });
      }
    } else {
      message(`${name}的权限修改成功`, { type: "success" });
    }
  }

  function onQueryChanged(query: string) {
    treeRef.value?.filter(query);
  }

  function filterMethod(query: string, node: any) {
    return transformI18n(node.title)?.includes(query);
  }

  onMounted(async () => {
    const { data } = await loadTreeData();
    treeIds.value = getKeyList(data, "id");
    treeData.value = handleTree(data);
  });

  watch(isExpandAll, val => {
    val
      ? treeRef.value.setExpandedKeys(treeIds.value)
      : treeRef.value.setExpandedKeys([]);
  });

  watch(isSelectAll, val => {
    val
      ? treeRef.value.setCheckedKeys(treeIds.value)
      : treeRef.value.setCheckedKeys([]);
  });

  return {
    curRow,
    isShow,
    treeData,
    treeIds,
    treeProps,
    isLinkage,
    isExpandAll,
    isSelectAll,
    treeSearchValue,
    handleMenu,
    handleSave,
    rowStyle,
    onQueryChanged,
    filterMethod
  };
}
