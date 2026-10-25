import { RA_DIALOG_WIDTH } from "@/constants";
import editForm from "../form.vue";
import { message } from "@/utils/message";
import { addDialog } from "@/components/ReDialog";
import { DownloadError, useDownload } from "@/hooks/useDownload";
import { deviceDetection } from "@pureadmin/utils";
import {
  getMenuTree,
  addMenu,
  updateMenu,
  deleteMenu,
  exportMenuExcel,
  type SysMenuVo,
  type SysMenuReq,
  type MenuType
} from "@/api/rbac";
import { computed, h, ref } from "vue";
import { IconifyIconOnline } from "@/components/ReIcon";

const menuTypeText = (t: MenuType) => ({ 0: "目录", 1: "菜单", 2: "按钮" })[t];

const fallbackIcon: Record<MenuType, string> = {
  0: "ep:folder",
  1: "ep:document",
  2: "ep:pointer"
};

/** 默认只展开目录，菜单下的按钮权限保持折叠，避免列表被按钮行淹没 */
function collectDirectoryIds(nodes: SysMenuVo[], ids: number[] = []) {
  for (const node of nodes) {
    if (node.menuType === 0) ids.push(node.id);
    if (node.children?.length) collectDirectoryIds(node.children, ids);
  }
  return ids;
}

function cloneDefaultForm(): SysMenuReq {
  return {
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
  };
}

export function useMenu() {
  const formRef = ref();
  const loading = ref(true);
  const dataList = ref<SysMenuVo[]>([]);
  const expandedKeys = computed(() => collectDirectoryIds(dataList.value));

  const columns: TableColumnList = [
    {
      label: "菜单名称",
      prop: "menuName",
      minWidth: 280,
      align: "left",
      headerAlign: "left",
      cellRenderer: ({ row }) => {
        const isDir = row.menuType === 0;
        const isButton = row.menuType === 2;
        const childCount = row.children?.length ?? 0;
        return (
          <span class="inline-flex max-w-full items-center gap-2 align-middle">
            {h(IconifyIconOnline, {
              icon: row.icon || fallbackIcon[row.menuType as MenuType],
              width: "16px",
              height: "16px",
              class: isButton ? "opacity-50" : isDir ? "text-primary" : ""
            })}
            <span
              class={[
                "truncate",
                isDir ? "font-semibold" : "",
                isButton
                  ? "text-[13px] text-[var(--el-text-color-secondary)]"
                  : ""
              ]}
            >
              {row.menuName}
            </span>
            {isDir && childCount > 0 ? (
              <span class="shrink-0 rounded-full bg-[var(--el-fill-color)] px-1.5 text-xs leading-5 text-[var(--el-text-color-secondary)]">
                {childCount}
              </span>
            ) : null}
            {!isButton && row.showLink === 0 ? (
              <el-tag size="small" type="info" effect="plain">
                隐藏
              </el-tag>
            ) : null}
          </span>
        );
      }
    },
    {
      label: "类型",
      prop: "menuType",
      width: 80,
      align: "center",
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
    {
      label: "路由路径",
      prop: "path",
      minWidth: 180,
      align: "left",
      formatter: ({ path }) => path || "-"
    },
    {
      label: "组件路径",
      prop: "component",
      minWidth: 200,
      align: "left",
      formatter: ({ component }) => component || "-"
    },
    {
      label: "权限标识",
      prop: "perms",
      minWidth: 200,
      align: "left",
      formatter: ({ perms }) => perms || "-"
    },
    { label: "排序", prop: "rank", width: 70, align: "center" },
    {
      label: "状态",
      prop: "status",
      width: 80,
      align: "center",
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
    } catch {
      dataList.value = [];
    } finally {
      loading.value = false;
    }
  }

  const { loading: exportLoading, runExport } = useDownload();

  /**
   * 导出全量菜单 Excel（后端把树拍平成行）
   *
   * 后端在「没有菜单数据」时是直接 `return`，没有写响应流，HTTP 仍是 200，
   * 前端拿到的是一个 0 字节 Blob。若不拦截就会落盘一个打不开的空 xlsx，
   * 页面还提示「导出成功」——所以这里显式抛错，走统一的失败提示。
   */
  function exportExcel() {
    return runExport(async () => {
      const data = await exportMenuExcel();

      if (data instanceof Blob && data.size === 0) {
        throw new DownloadError("没有菜单数据可导出");
      }

      return data;
    }, "系统菜单.xlsx");
  }

  function openDialog(title = "新增", row?: SysMenuVo) {
    const isEdit = title !== "新增" && row?.id !== undefined;
    const formInline: SysMenuReq = isEdit
      ? {
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
        }
      : cloneDefaultForm();

    addDialog({
      title: `${title}菜单`,
      props: {
        formInline,
        menuTree: dataList.value
      },
      width: RA_DIALOG_WIDTH.md,
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(editForm, {
          ref: formRef,
          formInline,
          menuTree: dataList.value
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef();
        const curData = options.props.formInline as SysMenuReq;

        if (!FormRef) {
          closeLoading();
          return;
        }

        FormRef.validate(async (valid: boolean) => {
          if (!valid) {
            closeLoading();
            return;
          }

          try {
            const result = isEdit
              ? await updateMenu(curData)
              : await addMenu(curData);

            if (result.code !== 200) {
              throw new Error(result.msg || `${title}失败`);
            }

            message(`${title}菜单成功`, { type: "success" });
            done();
            await onSearch();
          } catch (error) {
            closeLoading();
            message(
              error instanceof Error && error.message
                ? error.message
                : `${title}失败`,
              { type: "error" }
            );
          }
        });
      }
    });
  }

  async function handleDelete(row: SysMenuVo) {
    try {
      const result = await deleteMenu(row.id);
      if (result.code !== 200) {
        throw new Error(result.msg || "删除失败");
      }
      message("删除成功", { type: "success" });
      await onSearch();
    } catch (error) {
      message(
        error instanceof Error && error.message ? error.message : "删除失败",
        { type: "error" }
      );
    }
  }

  void onSearch();

  return {
    loading,
    exportLoading,
    columns,
    dataList,
    expandedKeys,
    onSearch,
    exportExcel,
    openDialog,
    handleDelete
  };
}
