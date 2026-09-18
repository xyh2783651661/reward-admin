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
import { h, ref } from "vue";
import { IconifyIconOnline } from "@/components/ReIcon";

const menuTypeText = (t: MenuType) => ({ 0: "目录", 1: "菜单", 2: "按钮" })[t];

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
    {
      label: "图标",
      prop: "icon",
      width: 70,
      align: "center",
      cellRenderer: ({ row }) =>
        row.icon
          ? h(IconifyIconOnline, {
              icon: row.icon,
              width: "18px",
              height: "18px"
            })
          : ""
    },
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
      width: "720px",
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
    onSearch,
    exportExcel,
    openDialog,
    handleDelete
  };
}
