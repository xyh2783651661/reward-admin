/**
 * 分析中心的「发现」条目类型。
 *
 * <p>单独放一个 .ts 而不是写在 {@code FindingList.vue} 的 {@code <script setup>} 里：
 * {@code <script setup>} 不允许 `export`，类型不会被当作模块成员导出，
 * 于是 {@code utils/findings.ts} 里 `import type { Finding } from ".../FindingList.vue"`
 * 会报 TS2614（模块没有导出成员），整个 typecheck 门禁挂在这一行上。</p>
 */
export interface Finding {
  level: "critical" | "warning" | "info";
  /** 来源模块，例如「AI 调用」 */
  module?: string;
  title: string;
  /** 触发依据：必须包含真实数据与阈值 */
  evidence: string;
  actionLabel?: string;
  onAction?: () => void;
}
