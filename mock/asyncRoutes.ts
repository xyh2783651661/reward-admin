import { defineFakeRoute } from "vite-plugin-fake-server/client";

const title = (zh: string, en: string) => ({ zh, en });

/**
 * 菜单结构设计：
 *
 * 1. 业务配置 (Business Config) - 核心业务配置
 *    ├── 奖励体系 - 奖励、科目、零花钱规则
 *    ├── 用户管理 - 用户配置
 *    └── 通知配置 - 邮件、系统参数
 *
 * 2. 消息中心 (Message Center) - 消息通知
 *    └── 系统通知
 *
 * 3. 恋爱空间 (Love Space) - 恋爱相关
 *    ├── 恋爱记录
 *    ├── 纪念日管理
 *    └── 媒体文件
 *
 * 4. 系统监控 (System Monitor) - 运行状态和日志
 *    ├── 运行状态 - 在线用户、缓存监控
 *    ├── 日志管理 - 系统/登录/操作/邮件/版本日志
 *    ├── 缓存管理 - 缓存Key管理
 *    └── AI调用记录
 *
 * 5. 任务调度 (Task Center) - 定时任务
 *    └── 定时调度
 */

// ==================== 业务配置 ====================
const businessConfigRouter = {
  path: "/config",
  meta: {
    icon: "ri:settings-4-line",
    title: title("业务配置", "Business Config"),
    rank: 10
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
        title: title("零花钱规则", "Pocket Money"),
        roles: ["admin"]
      }
    },
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
    },
    {
      path: "/config/system-config",
      component: "config/system-config/index",
      name: "SystemConfig",
      meta: {
        icon: "ri:settings-5-line",
        title: "menus.configSystemConfig",
        roles: ["admin"]
      }
    },
    {
      path: "/config/holiday",
      component: "config/holiday/index",
      name: "HolidayConfig",
      meta: {
        icon: "ri:calendar-line",
        title: title("节假日配置", "Holiday Config"),
        roles: ["admin"]
      }
    }
  ]
};

// ==================== 消息中心 ====================
const messageCenterRouter = {
  path: "/message",
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
        keepAlive: true
      }
    }
  ]
};

// ==================== 恋爱空间 ====================
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
        icon: "ri:gift-line",
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

// ==================== 每日图片 ====================
const dailyImageRouter = {
  path: "/daily-image",
  meta: {
    icon: "ri:image-line",
    title: title("每日图片", "Daily Image"),
    rank: 27
  },
  children: [
    {
      path: "/daily-image/manage",
      component: "daily-image/manage/index",
      name: "DailyImageManage",
      meta: {
        icon: "ri:gallery-line",
        title: title("图片管理", "Image Manage"),
        roles: ["admin"]
      }
    }
  ]
};

// ==================== 系统监控 ====================
const systemMonitorRouter = {
  path: "/monitor",
  meta: {
    icon: "ri:radar-line",
    title: title("系统监控", "System Monitor"),
    rank: 30
  },
  children: [
    {
      path: "/monitor/online",
      component: "monitor/online/index",
      name: "OnlineUser",
      meta: {
        icon: "ri:user-shared-2-line",
        title: "menus.pureOnlineUser",
        roles: ["admin"],
        showLink: false
      }
    },
    {
      path: "/monitor/cache-monitor",
      component: "monitor/cache-monitor/index",
      name: "CacheMonitor",
      meta: {
        icon: "ri:dashboard-3-line",
        title: title("缓存监控", "Cache Monitor"),
        roles: ["admin"]
      }
    },
    {
      path: "/monitor/cache",
      component: "monitor/cache/index",
      name: "CacheManage",
      meta: {
        icon: "ri:database-2-line",
        title: title("缓存管理", "Cache Manage"),
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

// ==================== 日志管理 ====================
const logManageRouter = {
  path: "/log",
  meta: {
    icon: "ri:file-list-3-line",
    title: title("日志管理", "Log Management"),
    rank: 35
  },
  children: [
    {
      path: "/log/system",
      component: "monitor/logs/system/index",
      name: "SystemLog",
      meta: {
        icon: "ri:file-search-line",
        title: "menus.pureSystemLog",
        roles: ["admin"]
      }
    },
    {
      path: "/log/login",
      component: "monitor/logs/login-log/index",
      name: "LoginLog",
      meta: {
        icon: "ri:login-box-line",
        title: title("登录日志", "Login Logs"),
        roles: ["admin"],
        showLink: false
      }
    },
    {
      path: "/log/operation",
      component: "monitor/logs/operation/index",
      name: "OperationLog",
      meta: {
        icon: "ri:file-edit-line",
        title: "menus.pureOperationLog",
        roles: ["admin"]
      }
    },
    {
      path: "/log/mail",
      component: "monitor/logs/login/index",
      name: "MailLog",
      meta: {
        icon: "ri:mail-open-line",
        title: "menus.pureMailLog",
        roles: ["admin"]
      }
    },
    {
      path: "/log/version",
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

// ==================== 任务调度 ====================
const taskCenterRouter = {
  path: "/task",
  name: "TaskCenter",
  meta: {
    icon: "ri:calendar-todo-line",
    title: title("任务调度", "Task Center"),
    rank: 40
  },
  children: [
    {
      path: "/task/scheduling",
      name: "https://xxl-job.xiaoyh.top/",
      meta: {
        icon: "ri:timer-line",
        title: "menus.pureScheduling",
        roles: ["admin", "common"]
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
          dailyImageRouter,
          systemMonitorRouter,
          logManageRouter,
          taskCenterRouter
        ]
      };
    }
  }
]);
