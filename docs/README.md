# 文档中心

本文档目录面向后端维护、前端联调和部署运维。项目是一个基于 Spring Boot 3 / JDK 17 的微信公众号后端，按模块组织业务能力，主要覆盖公众号内容推送、AI、奖励计算、恋爱空间、邮件、系统配置、缓存、日志和公告。

## 推荐阅读顺序

1. [ARCHITECTURE.md](ARCHITECTURE.md)：了解项目模块、分层方式、异步任务和外部依赖。
2. [COMMON.md](COMMON.md)：了解接口响应、分页、时间格式、请求头、安全注解和图片预览规则。
3. 按业务模块阅读对应接口文档。
4. 部署或排障时阅读 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 文档地图

| 分类        | 文档                               | 说明                                             |
| ----------- | ---------------------------------- | ------------------------------------------------ |
| 总览        | [ARCHITECTURE.md](ARCHITECTURE.md) | 项目结构、模块边界、关键链路、运行依赖           |
| 总览        | [COMMON.md](COMMON.md)             | 通用接口约定、分页、时间、安全、图片预览         |
| 部署        | [DEPLOYMENT.md](DEPLOYMENT.md)     | Docker Compose、手动部署、环境变量、常见问题     |
| 认证        | [AUTH.md](AUTH.md)                 | 登录、登出、当前用户、修改密码                   |
| 内容/公众号 | [DAILY_IMAGE.md](DAILY_IMAGE.md)   | 每日图片上传、分页、下载、预览、缩略图、同步任务 |
| 内容/公众号 | [FRAMEWORK.md](FRAMEWORK.md)       | 工作台首页、顶部通知中心                         |
| AI          | [AI.md](AI.md)                     | AI 调用记录分页和详情                            |
| 奖励        | [REWARD.md](REWARD.md)             | 奖励计算、用户、科目、配置、零花钱规则、APK 版本 |
| 恋爱空间    | [LOVE.md](LOVE.md)                 | 记录、媒体、位置、纪念日、统计、导出、同步       |
| 恋爱空间    | [ANDROID.md](ANDROID.md)           | Android 客户端约定和同步接口                     |
| 系统        | [SYSTEM.md](SYSTEM.md)             | 系统配置管理                                     |
| 系统        | [HOLIDAY.md](HOLIDAY.md)           | 节假日配置管理                                   |
| 系统        | [CACHE.md](CACHE.md)               | 缓存管理、监控、健康检查、Redis 信息             |
| 运维        | [LOG.md](LOG.md)                   | 访问日志、任务日志                               |
| 通知        | [NOTICE.md](NOTICE.md)             | 公告管理、用户已读                               |
| 邮件        | [MAIL.md](MAIL.md)                 | 邮件接收人、用户订阅配置、发送记录               |

## 代码模块对应关系

| 代码目录                                       | 主要职责                                                                        | 相关文档                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/main/java/org/xyh/modules/content`        | 微信接入、诗词内容、每日图片、公众号推送任务                                    | [DAILY_IMAGE.md](DAILY_IMAGE.md), [ARCHITECTURE.md](ARCHITECTURE.md)                                 |
| `src/main/java/org/xyh/modules/ai`             | AI 调用、Prompt、调用记录、WebSocket 流式对话                                   | [AI.md](AI.md), [ARCHITECTURE.md](ARCHITECTURE.md)                                                   |
| `src/main/java/org/xyh/modules/reward`         | 奖励计算、学生/科目/配置、PDF、APK                                              | [REWARD.md](REWARD.md), [AUTH.md](AUTH.md)                                                           |
| `src/main/java/org/xyh/modules/love`           | 恋爱记录、媒体、纪念日、统计、同步                                              | [LOVE.md](LOVE.md), [ANDROID.md](ANDROID.md)                                                         |
| `src/main/java/org/xyh/modules/mail`           | 邮件接收人、发送记录、定时邮件任务                                              | [MAIL.md](MAIL.md), [ARCHITECTURE.md](ARCHITECTURE.md)                                               |
| `src/main/java/org/xyh/modules/system`         | 系统配置、节假日、缓存、工作台                                                  | [SYSTEM.md](SYSTEM.md), [HOLIDAY.md](HOLIDAY.md), [CACHE.md](CACHE.md), [FRAMEWORK.md](FRAMEWORK.md) |
| `src/main/java/org/xyh/modules/log`            | 访问日志、任务日志、IP 归属地刷新                                               | [LOG.md](LOG.md)                                                                                     |
| `src/main/java/org/xyh/modules/notice`         | 公告、用户已读状态                                                              | [NOTICE.md](NOTICE.md)                                                                               |
| `src/main/java/org/xyh/modules/shared`         | 通用响应、分页、异常、AOP、安全注解、缓存抽象、配置抽象、工具类                 | [COMMON.md](COMMON.md), [ARCHITECTURE.md](ARCHITECTURE.md)                                           |
| `src/main/java/org/xyh/modules/infrastructure` | 缓存实现、文件、图片、HTTP、MQ、PDF、FFmpeg、TTS、WebSocket、YouTube 等基础设施 | [ARCHITECTURE.md](ARCHITECTURE.md), [DEPLOYMENT.md](DEPLOYMENT.md)                                   |

## 外部资源

| 路径                                                                 | 说明                     |
| -------------------------------------------------------------------- | ------------------------ |
| [../dbsql/](../dbsql/)                                               | 数据库表结构和初始化脚本 |
| [../src/main/resources/mapper/](../src/main/resources/mapper/)       | MyBatis XML 映射         |
| [../src/main/resources/templates/](../src/main/resources/templates/) | 邮件和 PDF 模板          |
| [../src/main/resources/ai/prompt/](../src/main/resources/ai/prompt/) | AI Prompt 模板           |
