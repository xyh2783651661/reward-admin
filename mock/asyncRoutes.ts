// 模拟后端动态生成路由
import { defineFakeRoute } from "vite-plugin-fake-server/client";

/**
 * roles：页面级别权限，这里模拟二种 "admin"、"common"
 * admin：管理员角色
 * common：普通角色
 */
const permissionRouter = {
  path: "/permission",
  meta: {
    title: "menus.purePermission",
    icon: "ep:lollipop",
    rank: 10
  },
  children: [
    {
      path: "/permission/page/index",
      name: "PermissionPage",
      meta: {
        title: "menus.purePermissionPage",
        roles: ["admin", "common"]
      }
    },
    {
      path: "/permission/button",
      meta: {
        title: "menus.purePermissionButton",
        roles: ["admin", "common"]
      },
      children: [
        {
          path: "/permission/button/router",
          component: "permission/button/index",
          name: "PermissionButtonRouter",
          meta: {
            title: "menus.purePermissionButtonRouter",
            auths: [
              "permission:btn:add",
              "permission:btn:edit",
              "permission:btn:delete"
            ]
          }
        },
        {
          path: "/permission/button/login",
          component: "permission/button/perms",
          name: "PermissionButtonLogin",
          meta: {
            title: "menus.purePermissionButtonLogin"
          }
        }
      ]
    }
  ]
};

const systemMonitorRouter = {
  path: "/monitor",
  meta: {
    icon: "ep:monitor",
    title: "menus.pureSysMonitor"
  },
  children: [
    {
      path: "/monitor/online-user",
      component: "monitor/online/index",
      name: "OnlineUser",
      meta: {
        icon: "ri:user-voice-line",
        title: "menus.pureOnlineUser",
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/login-logs",
      component: "monitor/logs/login/index",
      name: "LoginLog",
      meta: {
        icon: "ri:mail-send-line",
        title: "menus.pureLoginLog",
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/operation-logs",
      component: "monitor/logs/operation/index",
      name: "OperationLog",
      meta: {
        icon: "ri:history-fill",
        title: "menus.pureOperationLog",
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/system-logs",
      component: "monitor/logs/system/index",
      name: "SystemLog",
      meta: {
        icon: "ri:file-search-line",
        title: "menus.pureSystemLog",
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/version-logs",
      component: "monitor/logs/version/index",
      name: "VersionLog",
      meta: {
        icon: "ri:file-copy-2-line",
        title: "menus.pureVersionLog",
        roles: ["admin"]
      }
    }
  ]
};

const configManagementRouter = {
  path: "/config",
  meta: {
    icon: "ep:setting",
    title: "menus.configManagement"
  },
  children: [
    {
      path: "/config/reward",
      component: "config/reward/index",
      name: "Reward",
      meta: {
        icon: "ri:medal-2-fill",
        title: "menus.configReward",
        roles: ["admin"]
      }
    },
    {
      path: "/config/subject",
      component: "config/subject/index",
      name: "Subject",
      meta: {
        icon: "fa-solid:book-open",
        title: "menus.configSubject",
        roles: ["admin"]
      }
    },
    {
      path: "/config/mail",
      component: "config/mail/index",
      name: "Mail",
      meta: {
        icon: "ri:mail-settings-fill",
        title: "menus.configMail",
        roles: ["admin"]
      }
    },
    {
      path: "/config/money",
      component: "config/money/index",
      name: "Money",
      meta: {
        icon: "ri:money-cny-box-fill",
        title: "menus.configMoney",
        roles: ["admin"]
      }
    }
  ]
};

export default defineFakeRoute([
  {
    url: "/get-async-routes",
    method: "get",
    response: () => {
      return {
        success: true,
        data: [permissionRouter, systemMonitorRouter, configManagementRouter]
      };
    }
  }
]);
