import { useRouter } from "vue-router";

export type ModuleKey =
  | "ai"
  | "access"
  | "task"
  | "publish"
  | "mail"
  | "reward";

/**
 * 专题页的菜单路径由后端动态下发，这里按「以 /analytics/<key> 结尾」在已注册路由中查找，
 * 找不到时返回 undefined，调用方据此隐藏跳转入口，避免出现死链。
 */
export function useModuleLinks() {
  const router = useRouter();

  function resolvePath(key: ModuleKey) {
    return router.getRoutes().find(r => r.path.endsWith(`/analytics/${key}`))
      ?.path;
  }

  function opener(key: ModuleKey): (() => void) | undefined {
    const path = resolvePath(key);
    return path ? () => router.push(path) : undefined;
  }

  return { opener, resolvePath };
}
