# 项目架构总览

## 项目定位

`we-chat` 是一个 Spring Boot 3 / JDK 17 后端服务，核心是微信公众号服务，同时扩展了 AI 调用、奖励计算、恋爱空间、邮件任务、系统配置、缓存监控、日志审计和公告通知等能力。

代码采用按业务模块分包的方式组织，每个核心业务模块大体遵循：

| 层         | 目录             | 职责                                               |
| ---------- | ---------------- | -------------------------------------------------- |
| 接口层     | `interfaces`     | Controller、DTO、VO、WebSocket 入口                |
| 应用层     | `application`    | 用例编排、事务边界、应用服务                       |
| 领域层     | `domain`         | 领域模型、规则、领域服务                           |
| 基础设施层 | `infrastructure` | 持久化、第三方 API、任务、消息队列、文件和工具适配 |

并非所有模块都完整包含四层。简单 CRUD 模块会更轻量，优先保持实现直接。

## 模块边界

| 模块             | 说明                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `content`        | 微信服务器验证、消息接收与回复、诗词/名言内容、每日图片、公众号素材上传和群发任务                      |
| `ai`             | AI Provider 路由、模型调用、Prompt 模板、调用记录、WebSocket 流式对话                                  |
| `reward`         | 学生成绩奖励计算、奖励规则、用户/科目/配置管理、PDF 报告、APK 版本下载                                 |
| `love`           | 恋爱空间记录、媒体、位置、纪念日、统计、导出、Android 同步                                             |
| `mail`           | 邮件接收人、订阅配置、发送记录，以及生日、节气、节假日、月报、成绩总结等定时邮件                       |
| `system`         | 系统配置、节假日配置、缓存管理、工作台与通知面板                                                       |
| `log`            | 访问日志、任务日志、IP 归属地刷新                                                                      |
| `notice`         | 系统公告与用户已读状态                                                                                 |
| `shared`         | 通用响应、分页、异常处理、AOP 注解、拦截器、缓存抽象、运行时配置抽象、工具类                           |
| `infrastructure` | 跨模块基础设施实现，包括缓存实现、文件、图片、HTTP、MQ、PDF、FFmpeg、TTS、WebSocket、YouTube、Excel 等 |
| `generator`      | DDD/MyBatis Plus 模块生成辅助工具                                                                      |
| `test`           | 测试、演示接口和本地示例工具，不属于正式业务 API                                                       |

## 主要入口

| 类型            | 入口                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| HTTP Controller | `src/main/java/org/xyh/modules/**/interfaces/controller`                                                  |
| WebSocket       | `/ws/ai`，处理器位于 `ai/interfaces/websocket`，注册配置位于 `ai/infrastructure/websocket`                |
| XXL-JOB 任务    | `@XxlJob` 标注的方法，按业务分布在 `content`、`mail`、`log`、`ai` 等模块                                  |
| RabbitMQ 消费   | 业务消费位于对应业务模块，例如 `content/infrastructure/mq`；通用死信处理位于 `infrastructure/mq/consumer` |
| MyBatis Mapper  | `src/main/java/org/xyh/modules/**/infrastructure/persistence/mapper` 和 `src/main/resources/mapper`       |
| 全局异常        | `shared/handler/GlobalExceptionHandler.java`                                                              |
| 通用响应        | `shared/base/Result.java`                                                                                 |
| 缓存抽象        | `shared/cache/CacheService.java`，实现位于 `infrastructure/cache`                                         |
| 运行时配置抽象  | `shared/config/SysConfigAccessor.java`，由 `system/infrastructure/config` 注入数据库配置提供者            |

## 关键业务链路

### 微信公众号每日推送

1. `WeChatTask#sendDailyMessages` 由 XXL-JOB 触发。
2. 下载并归档每日图片，生成缩略图，记录图片信息。
3. 通过 `WeChatMediaUtil` 上传临时素材。
4. 组装图文、诗词、语音等消息并调用微信 API 群发。
5. 执行结果写入任务日志，异常由全局任务日志/AOP 机制记录。

### AI 调用

1. HTTP 接口或 WebSocket 接收用户输入。
2. 应用层根据场景选择 AI Provider。
3. Prompt 模板和上下文由 `ai/domain/prompt` 相关组件渲染。
4. 调用结果写入 AI 调用记录。
5. WebSocket 场景通过 `WsStreamHandle` 推送增量文本、完成信号和错误信号。

### 奖励计算

1. Web 或 APK 端提交成绩和配置。
2. 应用层组装 `RewardContext`。
3. 领域规则引擎按基础规则、额外规则、特殊规则计算奖励。
4. 结果可查询、对比、删除，并可生成 PDF 报告。

### 恋爱空间同步

1. Web 和 Android 共用记录、媒体、纪念日、统计等接口。
2. Android 通过 `/sync/bootstrap` 做首次全量同步。
3. 后续通过 `/sync/changes` 拉取增量，通过 `/sync/push` 回传离线变更。
4. 客户端来源由请求头和客户端信息解析逻辑处理。

### 邮件任务

1. XXL-JOB 触发生日、节气、节假日、月报、成绩总结等任务。
2. 任务读取接收人和订阅配置。
3. 必要时调用 AI 生成内容，使用模板渲染 HTML。
4. 通过邮件发送器发送并记录发送结果。

## 运行依赖

| 依赖            | 用途                             |
| --------------- | -------------------------------- |
| MySQL           | 业务数据、配置、日志、记录持久化 |
| Redis           | 分布式缓存                       |
| Caffeine        | 本地缓存                         |
| RabbitMQ        | TTS/视频等异步流水线             |
| XXL-JOB         | 定时任务调度                     |
| FFmpeg          | 视频生成                         |
| 外部地图服务    | IP 归属地、逆地理编码、地点搜索  |
| 微信公众号 API  | 素材上传、群发、消息交互         |
| AI Provider API | 多模型文本生成                   |
| 邮件服务        | HTML 邮件发送                    |

## 配置入口

| 文件                                        | 说明                                         |
| ------------------------------------------- | -------------------------------------------- |
| `src/main/resources/application.yml`        | 公共配置入口                                 |
| `src/main/resources/application-dev.yml`    | 开发环境配置，默认服务端口 `86`              |
| `src/main/resources/application-prod.yml`   | 生产环境配置，当前服务端口 `8888`            |
| `src/main/resources/application-docker.yml` | Docker 环境配置，默认服务端口 `86`           |
| `docker-compose.yml`                        | 本地容器化启动 MySQL、Redis、RabbitMQ 和应用 |

## 依赖方向约束

| 约束                      | 说明                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `shared` 不依赖业务模块   | 通用注解、AOP、响应、分页、缓存抽象和配置抽象必须保持可复用，不能 import `system`、`reward`、`content` 等业务模块 |
| `infrastructure` 提供实现 | 基础设施实现可以依赖 `shared` 抽象；业务模块通过抽象或明确的基础设施服务使用能力                                  |
| 业务模块之间避免直接穿透  | 跨模块调用优先走 application service 或抽象端口，避免 Controller/DTO 层被其他模块反向依赖                         |
| 接口 DTO 不下沉业务逻辑   | `interfaces/dto` 和 `interfaces/vo` 面向 HTTP/WebSocket 入参出参，不作为公共基础设施模型                          |
| 演示与生成工具隔离        | `test`、`generator`、本地 `main` 工具不应成为业务运行链路的必需依赖；依赖具体业务 DTO 的示例放入 `test` 模块      |

## 文档维护原则

1. 接口字段、路径、请求方法以 Controller 和 DTO 为准。
2. 通用行为写在 [COMMON.md](COMMON.md)，不要在每个模块重复描述。
3. 模块文档只写该模块的接口、数据结构和联调注意事项。
4. 业务链路和模块边界写在本文档，避免散落到接口文档中。
5. 部署、环境变量和排障写在 [DEPLOYMENT.md](DEPLOYMENT.md)。
