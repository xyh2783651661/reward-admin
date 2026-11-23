import App from "./App.vue";
import router from "./router";
import { setupStore } from "@/store";
import { useI18n } from "@/plugins/i18n";
import { getPlatformConfig } from "./config";
import { MotionPlugin } from "@vueuse/motion";
import { useEcharts } from "@/plugins/echarts";
import { createApp, type Directive } from "vue";
import { useElementPlus } from "@/plugins/elementPlus";
import { injectResponsiveStorage } from "@/utils/responsive";
import { message } from "@/utils/message";
import { getErrorMessage } from "@/utils/error";
import Axios from "axios";

import Table from "@pureadmin/table";
import PureDescriptions from "@pureadmin/descriptions";

// 引入重置样式
import "./style/reset.scss";
// 导入公共样式
import "./style/index.scss";
// 一定要在main.ts中导入tailwind.css，防止vite每次hmr都会请求src/style/index.scss整体css文件导致热更新慢的问题
import "./style/tailwind.css";
import "element-plus/dist/index.css";
// 导入字体图标
import "./assets/iconfont/iconfont.js";
import "./assets/iconfont/iconfont.css";

/**
 * 未捕获的异步失败兜底提示。
 *
 * 背景：后端改为按语义返回真实 HTTP 状态（400/403/404/500）后，
 * 原先「HTTP 200 + body.code!=200」的成功回调分支不再执行，请求会直接 reject。
 * 历史页面里有一部分 `await api()` 没有 catch，失败会被静默吞掉——
 * 用户点了按钮毫无反应，比弹一个错误提示更糟。
 *
 * 只对「确实没有被任何 catch 处理」的 rejection 生效，因此不会与
 * 已有的业务提示重复；相同文案 5 秒内只提示一次，避免轮询接口刷屏。
 */
const UNHANDLED_TOAST_DEDUPE_MS = 5000;
let lastUnhandledToast = { text: "", at: 0 };
window.addEventListener("unhandledrejection", event => {
  const reason = event.reason;
  // 主动取消的请求（切路由/组件卸载）不是错误，不打扰用户
  if (reason?.isCancelRequest || Axios.isCancel?.(reason)) return;
  const text = getErrorMessage(reason, "请求失败，请稍后重试");
  const now = Date.now();
  if (
    text === lastUnhandledToast.text &&
    now - lastUnhandledToast.at < UNHANDLED_TOAST_DEDUPE_MS
  ) {
    return;
  }
  lastUnhandledToast = { text, at: now };
  message(text, { type: "error" });
});

const app = createApp(App);

// 自定义指令
import * as directives from "@/directives";
Object.keys(directives).forEach(key => {
  app.directive(key, (directives as { [key: string]: Directive })[key]);
});

// 全局注册@iconify/vue图标库
import {
  IconifyIconOffline,
  IconifyIconOnline,
  FontIcon
} from "./components/ReIcon";
app.component("IconifyIconOffline", IconifyIconOffline);
app.component("IconifyIconOnline", IconifyIconOnline);
app.component("FontIcon", FontIcon);

// 全局注册按钮级别权限组件
import { Auth } from "@/components/ReAuth";
import { Perms } from "@/components/RePerms";
app.component("Auth", Auth);
app.component("Perms", Perms);

// 全局注册vue-tippy
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import VueTippy from "vue-tippy";
app.use(VueTippy);

getPlatformConfig(app).then(async config => {
  setupStore(app);
  app.use(router);
  await router.isReady();
  injectResponsiveStorage(app, config);
  app
    .use(MotionPlugin)
    .use(useI18n)
    .use(useEcharts)
    .use(useElementPlus)
    .use(Table)
    .use(PureDescriptions);
  app.mount("#app");
});
