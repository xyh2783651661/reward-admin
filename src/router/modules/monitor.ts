const Layout = () => import("@/layout/index.vue");

export default {
  path: "/monitor",
  name: "Monitor",
  component: Layout,
  redirect: "/monitor/ai-provider-health",
  meta: {
    icon: "ep/monitor",
    title: "系统监控",
    rank: 10
  },
  children: [
    {
      path: "/monitor/ai-provider-health",
      name: "AiProviderHealth",
      component: () => import("@/views/monitor/ai-provider-health/index.vue"),
      meta: {
        title: "AI供应商健康",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
