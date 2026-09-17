/**
 * 好友选择器（业务好友 / 邮件收件人）类型定义。
 *
 * 设计取向：组件只依赖「分页查询 + 行数据」这一最小契约，
 * 因此任何列表形态相近的业务（收件人、成员、白名单…）都能复用同一个选择器，
 * 只需换数据源，不必再复制一份弹窗交互。
 */

/** 可选择的好友行数据 */
export interface FriendPickerItem {
  /** 主键 */
  id: number;
  /** 姓名 */
  name?: string;
  /** 邮箱 */
  email?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 允许业务侧透传扩展字段（类型、组别、优先级…） */
  [key: string]: any;
}

/** 分页查询参数 */
export interface FriendPickerQuery {
  /** 关键字：姓名 */
  name?: string;
  /** 关键字：邮箱 */
  email?: string;
  /** 仅查询已启用 */
  enabled?: boolean;
  /** 页码，从 1 开始 */
  current?: number;
  /** 每页条数 */
  size?: number;
  [key: string]: any;
}

/** 分页返回体（与后端 ApiPageResult.data 对齐） */
export interface FriendPickerPage {
  /**
   * 接口边界处的行数据用宽松类型：
   * 后端 records 是泛型对象数组，具体字段由各业务的数据源决定，
   * 组件内部再统一收窄为 FriendPickerItem。
   */
  records?: Record<string, any>[];
  total?: number;
  size?: number;
  current?: number;
}

/**
 * 数据源签名。
 * 默认实现为「邮件收件人」分页接口，业务侧可按需覆盖。
 */
export type FriendPickerFetcher = (
  params: FriendPickerQuery
) => Promise<{ data?: FriendPickerPage }>;
