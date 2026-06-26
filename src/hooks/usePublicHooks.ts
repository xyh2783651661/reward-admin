import { computed } from "vue";
import { useDark } from "@pureadmin/utils";

export function useIconClass() {
  return computed(() => {
    return [
      "w-[22px]",
      "h-[22px]",
      "flex",
      "justify-center",
      "items-center",
      "outline-hidden",
      "rounded-[4px]",
      "cursor-pointer",
      "transition-colors",
      "hover:bg-[#0000000f]",
      "dark:hover:bg-[#ffffff1f]",
      "dark:hover:text-[#ffffffd9]"
    ];
  });
}

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
      if (status === 1) {
        return {
          "--el-tag-text-color": isDark.value ? "#6abe39" : "#389e0d",
          "--el-tag-bg-color": isDark.value ? "#172412" : "#f6ffed",
          "--el-tag-border-color": isDark.value ? "#274a17" : "#b7eb8f"
        };
      }

      if (status === 0) {
        return {
          "--el-tag-text-color": isDark.value ? "#ffd666" : "#d48806",
          "--el-tag-bg-color": isDark.value ? "#2b2411" : "#fffbe6",
          "--el-tag-border-color": isDark.value ? "#594214" : "#ffe58f"
        };
      }

      return {
        "--el-tag-text-color": isDark.value ? "#e84749" : "#cf1322",
        "--el-tag-bg-color": isDark.value ? "#2b1316" : "#fff1f0",
        "--el-tag-border-color": isDark.value ? "#58191c" : "#ffa39e"
      };
    };
  });

  return {
    isDark,
    switchStyle,
    tagStyle
  };
}
