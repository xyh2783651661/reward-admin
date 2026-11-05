import type { Router } from "vue-router";

/**
 * 发布三件套（内容包 / 发布记录 / 平台管理）之间的跳转约定。
 *
 * 三个页面互相带参跳转，路径与 query 字段集中在这里维护，
 * 避免每个页面各写一份字符串，改一处漏一处。
 */
export const PUBLISH_ROUTES = {
  record: "/publish/record",
  platform: "/publish/platform",
  /** 内容包页路径由后端菜单下发，解析不到时的兜底值 */
  packageFallback: "/publish/package"
} as const;

/**
 * 解析内容包页的实际路径。
 *
 * 菜单是后端动态下发的，内容包页的 path 不在前端写死；
 * 这里在已注册路由里找 /publish 下除记录、平台之外的叶子路由。
 */
export function resolvePackagePath(router: Router): string {
  const hit = router
    .getRoutes()
    .find(
      r =>
        r.path.startsWith("/publish/") &&
        !r.path.startsWith(PUBLISH_ROUTES.record) &&
        !r.path.startsWith(PUBLISH_ROUTES.platform) &&
        !r.children.length
    );
  return hit?.path ?? PUBLISH_ROUTES.packageFallback;
}

/** 跳到发布记录页，可按包 / 平台 / 结果预过滤 */
export function gotoPublishRecords(
  router: Router,
  filter: { packageId?: number; platformCode?: string; status?: string } = {}
) {
  const query: Record<string, string> = {};
  if (filter.packageId) query.packageId = String(filter.packageId);
  if (filter.platformCode) query.platformCode = filter.platformCode;
  if (filter.status) query.status = filter.status;
  return router.push({ path: PUBLISH_ROUTES.record, query });
}

/** 跳到内容包详情，并定位到指定平台 Tab */
export function gotoPublishPackage(
  router: Router,
  packageId: number,
  platformCode?: string
) {
  const query: Record<string, string> = { packageId: String(packageId) };
  if (platformCode) query.platformCode = platformCode;
  return router.push({ path: resolvePackagePath(router), query });
}

/** 跳到平台管理，并用关键字定位到某个平台 */
export function gotoPublishPlatform(router: Router, platformCode?: string) {
  return router.push({
    path: PUBLISH_ROUTES.platform,
    query: platformCode ? { keyword: platformCode } : {}
  });
}
