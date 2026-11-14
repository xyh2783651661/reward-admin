-- ============================================================
-- 数据分析中心：新增「分析总览」「数据探索」菜单（幂等版）
-- 目标库：wechat
-- 前置条件：「数据分析中心」顶级菜单（path = '/analytics'）已存在
-- 执行前请备份 sys_menu / sys_role_menu，回滚 SQL 在文件底部
-- ============================================================

-- 0. 取父菜单；不存在则先补建（与原迁移脚本保持一致）
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, route_name, title_zh, `rank`, show_link, status, icon, perms)
SELECT 0, '数据分析中心', 0, '/analytics', NULL, '数据分析中心', 15, 1, 1, 'ri:bar-chart-2-line', 'analytics:data:view'
WHERE NOT EXISTS (
    SELECT 1 FROM (SELECT id FROM sys_menu WHERE path = '/analytics' AND parent_id = 0 AND deleted = 0) t
);

SET @analytics_parent_id = (
    SELECT id FROM (SELECT id FROM sys_menu WHERE path = '/analytics' AND parent_id = 0 AND deleted = 0 LIMIT 1) t
);

-- 1. 分析总览（rank = 0，排在所有专题页之前，作为分析中心入口）
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, route_name, title_zh, `rank`, show_link, status, icon, perms)
SELECT @analytics_parent_id, '分析总览', 1, '/analytics/overview/index', 'analytics/overview/index.vue', 'AnalyticsOverview', '分析总览', 0, 1, 1, 'ri:dashboard-3-line', 'analytics:overview:view'
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM sys_menu WHERE path = '/analytics/overview/index' AND deleted = 0) t);

-- 2. 数据探索（rank = 6，排在现有专题页之后）
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, route_name, title_zh, `rank`, show_link, status, icon, perms)
SELECT @analytics_parent_id, '数据探索', 1, '/analytics/explore/index', 'analytics/explore/index.vue', 'AnalyticsExplore', '数据探索', 6, 1, 1, 'ri:search-eye-line', 'analytics:explore:view'
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM sys_menu WHERE path = '/analytics/explore/index' AND deleted = 0) t);

-- 3. 补齐已存在菜单的 perms（历史插入可能缺少 perms）
UPDATE sys_menu SET perms = 'analytics:overview:view' WHERE path = '/analytics/overview/index' AND deleted = 0 AND (perms IS NULL OR perms = '');
UPDATE sys_menu SET perms = 'analytics:explore:view'  WHERE path = '/analytics/explore/index'  AND deleted = 0 AND (perms IS NULL OR perms = '');

-- 4. 为 admin 角色补齐菜单关联（幂等，仅处理这两个新菜单）
SET @admin_role_id = (SELECT id FROM sys_role WHERE role_code = 'admin' AND deleted = 0 LIMIT 1);

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT @admin_role_id, m.id
FROM sys_menu m
WHERE m.deleted = 0
  AND m.path IN ('/analytics/overview/index', '/analytics/explore/index')
  AND @admin_role_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = @admin_role_id AND rm.menu_id = m.id
  );

-- ============================================================
-- 回滚 SQL（按需手工执行）
-- ============================================================
-- DELETE FROM sys_role_menu WHERE menu_id IN (
--   SELECT id FROM (SELECT id FROM sys_menu WHERE path IN ('/analytics/overview/index', '/analytics/explore/index') AND deleted = 0) t
-- );
-- UPDATE sys_menu SET deleted = 1 WHERE path IN ('/analytics/overview/index', '/analytics/explore/index') AND deleted = 0;
