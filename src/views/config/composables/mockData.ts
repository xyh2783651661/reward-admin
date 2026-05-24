/** Mock tree menu data for role-menu (backend API not ready yet) */
export const mockRoleMenuData = [
  {
    id: 1,
    title: "系统管理",
    children: [
      { id: 11, title: "用户管理" },
      { id: 12, title: "角色管理" },
      { id: 13, title: "菜单管理" },
      { id: 14, title: "部门管理" }
    ]
  },
  {
    id: 2,
    title: "系统监控",
    children: [
      { id: 21, title: "在线用户" },
      { id: 22, title: "系统日志" },
      { id: 23, title: "操作日志" },
      { id: 24, title: "登录日志" },
      { id: 25, title: "AI通话记录" }
    ]
  },
  {
    id: 3,
    title: "配置管理",
    children: [
      { id: 31, title: "奖励配置" },
      { id: 32, title: "科目配置" },
      { id: 33, title: "邮件配置" },
      { id: 34, title: "用户管理" },
      { id: 35, title: "零花钱规则" },
      { id: 36, title: "系统配置" }
    ]
  }
];

/** Mock checked menu IDs for a given row */
export const mockRoleMenuCheckedIds = (_row: any) => {
  return Promise.resolve({ data: [] });
};

/** Mock load tree data */
export const mockLoadTreeData = () => {
  return Promise.resolve({ data: mockRoleMenuData });
};
