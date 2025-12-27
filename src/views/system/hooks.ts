// 抽离可公用的工具函数等用于系统管理页面逻辑
import { computed } from "vue";
import { useDark } from "@pureadmin/utils";

export function usePublicHooks() {
  const { isDark } = useDark();

  const switchStyle = computed(() => {
    return {
      "--el-switch-on-color": "#6abe39",
      "--el-switch-off-color": "#e84749"
    };
  });

  const tagStyle = computed(() => {
    return (status: number) => {
      // 成功
      if (status === 1) {
        return {
          "--el-tag-text-color": isDark.value ? "#6abe39" : "#389e0d",
          "--el-tag-bg-color": isDark.value ? "#172412" : "#f6ffed",
          "--el-tag-border-color": isDark.value ? "#274a17" : "#b7eb8f"
        };
      }

      // 待发送 / 处理中
      if (status === 0) {
        return {
          "--el-tag-text-color": isDark.value ? "#ffd666" : "#d48806",
          "--el-tag-bg-color": isDark.value ? "#2b2411" : "#fffbe6",
          "--el-tag-border-color": isDark.value ? "#594214" : "#ffe58f"
        };
      }

      // 失败（默认）
      return {
        "--el-tag-text-color": isDark.value ? "#e84749" : "#cf1322",
        "--el-tag-bg-color": isDark.value ? "#2b1316" : "#fff1f0",
        "--el-tag-border-color": isDark.value ? "#58191c" : "#ffa39e"
      };
    };
  });

  return {
    /** 当前网页是否为`dark`模式 */
    isDark,
    /** 表现更鲜明的`el-switch`组件  */
    switchStyle,
    /** 表现更鲜明的`el-tag`组件  */
    tagStyle
  };
}
