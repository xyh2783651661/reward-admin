import { h, ref, type Component } from "vue";
import { deviceDetection } from "@pureadmin/utils";
import { addDialog } from "@/components/ReDialog";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";

export type CrudDialogMode = "新增" | "修改";
export type CrudDialogWidth = "480px" | "680px" | "800px";

interface ApiResult {
  code: number;
  msg?: string;
}

export interface CrudDialogConfig<T extends Record<string, any>> {
  /** 业务名称，不带「新增/修改」前缀，如「配置」「科目」 */
  title: string;
  formComponent: Component;
  width?: CrudDialogWidth;
  /** 生成初始表单值（新增时使用；修改且未提供 beforeOpen 时也会以此为基础合并 row） */
  defaultForm: (row?: any) => T;
  /** 提交接口；根据 mode 选择新增 / 修改 */
  submitApi: (payload: T, mode: CrudDialogMode) => Promise<ApiResult>;
  /** 修改时拉取详情等异步准备工作，返回值作为表单初始值 */
  beforeOpen?: (row?: any) => Promise<T> | T;
  /** 提交前加工（如 JSON 序列化 / trim），可抛出 Error 阻止提交 */
  buildPayload?: (form: T, mode: CrudDialogMode) => T | Promise<T>;
  /** 传给表单组件的额外 props（如 formOptions），支持函数以读取最新值 */
  extraProps?: Record<string, any> | (() => Record<string, any>);
}

/**
 * 统一 addDialog 的可靠性封装：
 * 1. sureBtnLoading 防重复提交
 * 2. 校验失败 / 请求失败：关 loading、不关窗、弹错误提示
 * 3. 仅 code === 200 才关窗并回调 onSuccess
 */
export function useCrudDialog<T extends Record<string, any>>(
  config: CrudDialogConfig<T>
) {
  const formRef = ref();

  function resolveExtraProps() {
    return typeof config.extraProps === "function"
      ? config.extraProps()
      : (config.extraProps ?? {});
  }

  async function open(mode: CrudDialogMode, row?: any, onSuccess?: () => void) {
    let initial: T;
    try {
      initial =
        mode === "修改" && config.beforeOpen
          ? await config.beforeOpen(row)
          : config.defaultForm(mode === "修改" ? row : undefined);
    } catch (error) {
      message(getErrorMessage(error, `${mode}数据加载失败`), {
        type: "error"
      });
      return;
    }

    const extraProps = resolveExtraProps();

    addDialog({
      title: `${mode}${config.title}`,
      props: { formInline: initial, ...extraProps },
      width: config.width ?? "680px",
      draggable: true,
      fullscreen: deviceDetection(),
      fullscreenIcon: true,
      closeOnClickModal: false,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(config.formComponent, {
          ref: formRef,
          formInline: initial,
          ...extraProps
        }),
      beforeSure: async (done, { options, closeLoading }) => {
        const FormRef = formRef.value?.getRef?.();
        const curData = options.props.formInline as T;

        if (!FormRef) {
          closeLoading();
          return;
        }

        try {
          const valid = await FormRef.validate().catch(() => false);
          if (!valid) {
            closeLoading();
            return;
          }

          const payload = config.buildPayload
            ? await config.buildPayload(curData, mode)
            : curData;
          const result = await config.submitApi(payload, mode);

          if (result.code !== 200) {
            throw new Error(result.msg || `${mode}${config.title}失败`);
          }

          message(`${mode}${config.title}成功`, { type: "success" });
          done();
          onSuccess?.();
        } catch (error) {
          closeLoading();
          message(getErrorMessage(error, `${mode}${config.title}失败`), {
            type: "error"
          });
        }
      }
    });
  }

  return { open, formRef };
}
