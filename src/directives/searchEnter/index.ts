import { useEventListener } from "@vueuse/core";
import { isFunction } from "@pureadmin/utils";
import type { Directive, DirectiveBinding } from "vue";

/**
 * `v-search-enter="onSearch"` —— 绑定在搜索表单（el-form）根元素上，
 * 在表单内任意输入控件按下 Enter 时触发搜索回调。
 *
 * 统一处理的边界（业务侧无需关心）：
 * 1. 中文输入法组合期守卫：keydown 的 isComposing 为 true 时忽略，
 *    避免用户按 Enter 确认拼音上屏时误触发搜索；
 * 2. 非单行输入场景忽略：textarea / contentEditable 中 Enter 是换行，
 *    按钮/链接上的 Enter 属于原生激活行为，均不触发搜索；
 * 3. 仅响应无修饰键的 Enter（Ctrl/Shift/Alt/.Meta + Enter 不触发），
 *    避免与浏览器或输入控件的组合快捷键冲突。
 *
 * 事件绑定在表单根元素上（冒泡捕获），因此：
 * - el-dialog 等挂在 body 下的弹窗不在表单 DOM 内，Enter 不会串场；
 * - 同一页面多个搜索表单各自绑定，互不干扰。
 */
/**
 * 下拉类弹出面板（select / date-picker / cascader / autocomplete / dropdown）。
 * 面板展开时其中的 Enter 是「确认选中」语义，不应触发搜索。
 */
const DROPDOWN_POPPER_SELECTOR = [
  ".el-select__popper",
  ".el-picker__popper",
  ".el-cascader__dropdown",
  ".el-autocomplete-suggestion",
  ".el-dropdown__popper"
].join(", ");

function isDropdownPanelOpen(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>(DROPDOWN_POPPER_SELECTOR)
  ).some(
    panel =>
      panel.style.display !== "none" && panel.getBoundingClientRect().height > 0
  );
}

export const searchEnter: Directive<HTMLElement, Function> = {
  mounted(el, binding: DirectiveBinding<Function>) {
    const cb = binding.value;

    if (!cb || !isFunction(cb)) {
      throw new Error(
        '[Directive: searchEnter]: need callback and callback must be a function! Like v-search-enter="onSearch"'
      );
    }

    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.key !== "Enter") return;

      // 输入法组合中（含确认上屏的那次 Enter），忽略
      if (ev.isComposing) return;

      // 带修饰键的组合键不触发
      if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) return;

      const target = ev.target as HTMLElement | null;
      if (!target) return;

      // textarea / 可编辑区域中 Enter 为换行语义
      const tag = target.tagName;
      if (tag === "TEXTAREA" || target.isContentEditable) return;

      // 按钮类元素上的 Enter 走原生激活，不拦截
      if (
        tag === "BUTTON" ||
        (tag === "A" && (target as HTMLAnchorElement).href) ||
        target.closest("button, a, [role='button']")
      ) {
        return;
      }

      // 下拉面板展开时（select 选中项、日期面板等），Enter 属于确认选中语义
      if (isDropdownPanelOpen()) return;

      ev.preventDefault();
      cb();
    };

    useEventListener(el, "keydown", onKeydown);
  }
};
