/**
 * 下拉选择统一规范：一律使用 ReSelect + options 数组，不再手写 el-option。
 * 表单内默认撑满；筛选栏传 :block="false" 并自行设置宽度。
 */
import ReSelect from "./index.vue";

export { ReSelect };
export type { SelectOption, OptionsResponse } from "./types";
export default ReSelect;
