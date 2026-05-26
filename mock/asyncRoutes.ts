import { defineFakeRoute } from "vite-plugin-fake-server/client";

const title = (zh: string, en: string) => ({ zh, en });

const permissionRouter = {
  path: "/permission",
  meta: {
    title: title("权限示例", "Permission Demo"),
    icon: "ri:shield-keyhole-line",
    rank: 90
  },
  children: [
    {
      path: "/permission/page/index",
      component: "permission/page/index",
      name: "PermissionPage",
      meta: {
        icon: "ri:pages-line",
        title: "menus.purePermissionPage",
        roles: ["admin", "common"]
      }
    },
    {
      path: "/permission/button",
      meta: {
        icon: "ri:cursor-line",
        title: "menus.purePermissionButton",
        roles: ["admin", "common"]
      },
      children: [
        {
          path: "/permission/button/router",
          component: "permission/button/index",
          name: "PermissionButtonRouter",
          meta: {
            icon: "ri:route-line",
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
            icon: "ri:key-2-line",
            title: "menus.purePermissionButtonLogin"
          }
        }
      ]
    }
  ]
};

const businessConfigRouter = {
  path: "/config",
  meta: {
    icon: "ri:stack-line",
    title: title("业务配置", "Business Config"),
    rank: 10
  },
  children: [
    {
      path: "/config/reward-suite",
      meta: {
        icon: "ri:medal-line",
        title: title("奖励体系", "Reward Suite"),
        roles: ["admin"]
      },
      children: [
        {
          path: "/config/reward",
          component: "config/reward/index",
          name: "Reward",
          meta: {
            icon: "ri:medal-2-line",
            title: "menus.configReward",
            roles: ["admin"]
          }
        },
        {
          path: "/config/subject",
          component: "config/subject/index",
          name: "Subject",
          meta: {
            icon: "ri:book-open-line",
            title: "menus.configSubject",
            roles: ["admin"]
          }
        },
        {
          path: "/config/pocket-money",
          component: "config/pocket-money/index",
          name: "PocketMoney",
          meta: {
            icon: "ri:money-cny-box-line",
            title: title("零花钱规则", "Pocket Money Rule"),
            roles: ["admin"]
          }
        }
      ]
    },
    {
      path: "/config/delivery-suite",
      meta: {
        icon: "ri:team-line",
        title: title("人员与通知", "People & Notify"),
        roles: ["admin"]
      },
      children: [
        {
          path: "/config/user",
          component: "config/user/index",
          name: "User",
          meta: {
            icon: "ri:user-settings-line",
            title: "menus.configUser",
            roles: ["admin"]
          }
        },
        {
          path: "/config/mail",
          component: "config/mail/index",
          name: "Mail",
          meta: {
            icon: "ri:mail-settings-line",
            title: "menus.configMail",
            roles: ["admin"]
          }
        }
      ]
    },
    {
      path: "/config/platform-suite",
      meta: {
        icon: "ri:server-line",
        title: title("平台参数", "Platform Settings"),
        roles: ["admin"]
      },
      children: [
        {
          path: "/config/system-config",
          component: "config/system-config/index",
          name: "SystemConfig",
          meta: {
            icon: "ri:settings-5-line",
            title: "menus.configSystemConfig",
            roles: ["admin"],
            showParent: true
          }
        }
      ]
    }
  ]
};

const messageCenterRouter = {
  path: "/message-center",
  meta: {
    icon: "ri:notification-4-line",
    title: title("消息中心", "Message Center"),
    rank: 20
  },
  children: [
    {
      path: "/notice/sysNotice",
      component: "notice/sysNotice/index",
      name: "SystemNotice",
      meta: {
        icon: "ri:notification-3-line",
        title: title("系统通知", "System Notice"),
        roles: ["admin", "common"],
        keepAlive: true,
        showParent: true
      }
    },
    {
      path: "/monitor/mail-logs",
      component: "monitor/logs/login/index",
      name: "MailLog",
      meta: {
        icon: "ri:mail-open-line",
        title: "menus.pureMailLog",
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/version-logs",
      component: "monitor/logs/version/index",
      name: "VersionLog",
      meta: {
        icon: "ri:git-commit-line",
        title: "menus.pureVersionLog",
        roles: ["admin"]
      }
    }
  ]
};

const loveSpaceRouter = {
  path: "/love",
  meta: {
    icon: "ri:heart-3-line",
    title: title("恋爱空间", "Love Space"),
    rank: 25
  },
  children: [
    {
      path: "/love/records",
      component: "love/records/index",
      name: "LoveRecords",
      meta: {
        icon: "ri:quill-pen-line",
        title: title("恋爱记录", "Love Records"),
        roles: ["admin"],
        keepAlive: true
      }
    },
    {
      path: "/love/anniversaries",
      component: "love/anniversaries/index",
      name: "LoveAnniversaries",
      meta: {
        icon: "ri:calendar-heart-line",
        title: title("纪念日管理", "Anniversaries"),
        roles: ["admin"]
      }
    },
    {
      path: "/love/media",
      component: "love/media/index",
      name: "LoveMedia",
      meta: {
        icon: "ri:gallery-line",
        title: title("媒体文件", "Media Gallery"),
        roles: ["admin"]
      }
    }
  ]
};

const taskCenterRouter = {
  path: "/task-center",
  meta: {
    icon: "ri:calendar-todo-line",
    title: title("任务调度", "Task Center"),
    rank: 30
  },
  children: [
    {
      path: "/timer/logs",
      component: "monitor/logs/operation/index",
      name: "OperationLog",
      meta: {
        icon: "ri:file-list-3-line",
        title: "menus.pureOperationLog",
        roles: ["admin"]
      }
    },
    {
      path: "/timer/scheduling",
      name: "https://xxl-job.xiaoyh.top/",
      meta: {
        icon: "ri:git-merge-line",
        title: "menus.pureScheduling",
        roles: ["admin", "common"],
        showParent: true
      }
    }
  ]
};

const runtimeAuditRouter = {
  path: "/runtime-audit",
  meta: {
    icon: "ri:pulse-line",
    title: title("运行审计", "Runtime Audit"),
    rank: 40
  },
  children: [
    {
      path: "/monitor/online-user",
      component: "monitor/online/index",
      name: "OnlineUser",
      meta: {
        icon: "ri:user-shared-2-line",
        title: "menus.pureOnlineUser",
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
      path: "/monitor/ai-call-records",
      component: "monitor/ai-call-record/index",
      name: "AiCallRecord",
      meta: {
        icon: "ri:robot-2-line",
        title: title("AI调用记录", "AI Call Records"),
        roles: ["admin"],
        keepAlive: true
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
        data: [
          businessConfigRouter,
          messageCenterRouter,
          loveSpaceRouter,
          taskCenterRouter,
          runtimeAuditRouter,
          permissionRouter
        ]
      };
    }
  }
]);
