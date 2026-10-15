export interface AssignOption {
  id: number | string;
  label: string;
  /** 辅助说明，如角色编码 */
  description?: string;
  disabled?: boolean;
}
