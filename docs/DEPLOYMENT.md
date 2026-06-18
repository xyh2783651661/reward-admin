# 部署指南

本文档详细介绍如何部署微信公众号后端服务系统。

## 目录

- [环境要求](#环境要求)
- [快速启动（Docker Compose）](#快速启动docker-compose)
- [手动部署](#手动部署)
- [生产环境部署](#生产环境部署)
- [环境变量清单](#环境变量清单)
- [监控和日志](#监控和日志)
- [常见问题](#常见问题)

---

## 环境要求

| 软件     | 版本  | 说明                 |
| -------- | ----- | -------------------- |
| JDK      | 17+   | 推荐 Eclipse Temurin |
| MySQL    | 8.0+  | 需要 utf8mb4 字符集  |
| Redis    | 7.0+  | 用于缓存和会话       |
| RabbitMQ | 3.12+ | 用于消息队列         |
| FFmpeg   | 6.0+  | 视频生成需要（可选） |
| Maven    | 3.8+  | 构建工具             |

---

## 快速启动（Docker Compose）

### 1. 克隆项目

```bash
git clone <repository-url>
cd we-chat
```

### 2. 创建环境变量文件

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```bash
# MySQL
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=wechat
MYSQL_USER=reward_user
MYSQL_PASSWORD=your_user_password

# Redis
REDIS_PASSWORD=your_redis_password

# 微信公众号
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret

# AI API Keys
AI_API_KEY_DEEP_SEEK=sk-xxx
AI_API_KEY_DOU_BAO=your_key
# ... 其他 API 密钥
```

### 3. 启动服务

```bash
# 启动所有服务（MySQL + Redis + RabbitMQ + 应用）
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 查看服务状态
docker-compose ps
```

### 4. 访问服务

| 服务       | 地址                                  | 说明                    |
| ---------- | ------------------------------------- | ----------------------- |
| 应用       | http://localhost:8080                 | Spring Boot 应用        |
| Swagger UI | http://localhost:8080/swagger-ui.html | API 文档（开发环境）    |
| RabbitMQ   | http://localhost:15672                | 管理界面（guest/guest） |
| MySQL      | localhost:3306                        | 数据库                  |
| Redis      | localhost:6379                        | 缓存                    |

### 5. 停止服务

```bash
# 停止服务
docker-compose down

# 停止服务并删除数据卷
docker-compose down -v
```

---

## 手动部署

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE wechat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 执行 DDL
mysql -u root -p wechat < dbsql/wechat_schema.sql

# 导入初始数据
mysql -u root -p wechat < dbsql/wechat.sql
```

### 2. 配置文件

```bash
# 复制配置模板
cp src/main/resources/application.yml src/main/resources/application-local.yml

# 编辑配置
vim src/main/resources/application-local.yml
```

主要配置项：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/wechat?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8
    username: root
    password: your_password
  data:
    redis:
      host: localhost
      port: 6379
      password: your_redis_password
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest

server:
  port: 8080
```

### 3. 构建和运行

```bash
# 构建
mvn clean package -DskipTests

# 运行
java -jar target/wechat-0.0.1-SNAPSHOT.jar --spring.profiles.active=local

# 后台运行
nohup java -jar target/wechat-0.0.1-SNAPSHOT.jar --spring.profiles.active=local > app.log 2>&1 &
```

---

## 生产环境部署

### 方式一：使用 Jib 推送到阿里云

```bash
# 配置环境变量
export JIB_REGISTRY_USERNAME=your_username
export JIB_REGISTRY_PASSWORD=your_password

# 构建并推送镜像
mvn compile jib:build

# 使用 Jib 构建 Docker 镜像（不推送到仓库）
mvn compile jib:dockerBuild
```

### 方式二：使用 GitHub Actions 自动部署

1. **配置 GitHub Secrets**：

   | Secret 名称             | 说明                 |
   | ----------------------- | -------------------- |
   | `SERVER_SSH_KEY`        | 服务器 SSH 私钥      |
   | `SERVER_HOST`           | 服务器 IP 地址       |
   | `SERVER_USER`           | 服务器用户名         |
   | `JIB_REGISTRY_USERNAME` | 阿里云镜像仓库用户名 |
   | `JIB_REGISTRY_PASSWORD` | 阿里云镜像仓库密码   |

2. **推送到 master 分支自动触发部署**：

```bash
git push origin master
```

### 方式三：服务器手动部署

#### 3.1 创建部署目录

```bash
mkdir -p /project/java_project/wechat
cd /project/java_project/wechat
```

#### 3.2 上传 JAR 文件

```bash
scp target/wechat-0.0.1-SNAPSHOT.jar user@server:/project/java_project/wechat/
```

#### 3.3 创建部署脚本

```bash
#!/bin/bash
# deploy_wechat.sh

APP_NAME=wechat
APP_PORT=8080
JAR_FILE=/project/java_project/wechat/wechat-0.0.1-SNAPSHOT.jar
LOG_FILE=/project/java_project/wechat/logs/app.log

# 创建日志目录
mkdir -p /project/java_project/wechat/logs

# 停止旧进程
pkill -f $APP_NAME

# 备份旧版本
if [ -f "$JAR_FILE" ]; then
    cp $JAR_FILE $JAR_FILE.bak.$(date +%Y%m%d%H%M%S)
fi

# 启动新版本
nohup java -jar $JAR_FILE \
  --spring.profiles.active=prod \
  --server.port=$APP_PORT \
  > $LOG_FILE 2>&1 &

echo "Deployed $APP_NAME on port $APP_PORT"
```

#### 3.4 设置执行权限并运行

```bash
chmod +x deploy_wechat.sh
./deploy_wechat.sh
```

---

## 环境变量清单

### 必填变量

| 变量名                | 说明                 | 示例            |
| --------------------- | -------------------- | --------------- |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码      | `your_password` |
| `MYSQL_DATABASE`      | 数据库名称           | `wechat`        |
| `MYSQL_USER`          | 数据库用户           | `reward_user`   |
| `MYSQL_PASSWORD`      | 数据库密码           | `your_password` |
| `WECHAT_APP_ID`       | 微信公众号 AppID     | `wx1234567890`  |
| `WECHAT_APP_SECRET`   | 微信公众号 AppSecret | `your_secret`   |

### AI API Keys（按需配置）

| 变量名                 | 说明              | 示例                |
| ---------------------- | ----------------- | ------------------- |
| `AI_API_KEY_DEEP_SEEK` | DeepSeek API 密钥 | `sk-xxx`            |
| `AI_API_KEY_DOU_BAO`   | 豆包 API 密钥     | `your_key`          |
| `AI_API_KEY_HUN_YUAN`  | 混元 API 密钥     | `sk-xxx`            |
| `AI_API_KEY_QWEN`      | 通义千问 API 密钥 | `sk-xxx`            |
| `AI_API_KEY_XING_HUO`  | 星火 API 密钥     | `APP_ID:APP_SECRET` |
| `AI_API_KEY_ZHI_PU`    | 智谱 API 密钥     | `your_key`          |

### 可选变量

| 变量名                      | 说明                   | 默认值     |
| --------------------------- | ---------------------- | ---------- |
| `REDIS_PASSWORD`            | Redis 密码             | 空         |
| `IMAGE_PEXELS_API_KEY`      | Pexels 图片 API 密钥   | 空         |
| `IMAGE_UNSPLASH_ACCESS_KEY` | Unsplash 图片 API 密钥 | 空         |
| `SECURE_API_SECRET`         | API 签名密钥           | 内置默认值 |
| `SERVER_PORT`               | 服务端口               | `8080`     |

---

## 监控和日志

### 健康检查

```bash
# 应用健康状态
curl http://localhost:8080/actuator/health

# 详细信息
curl http://localhost:8080/actuator/info

# 指标信息
curl http://localhost:8080/actuator/metrics
```

### 日志查看

```bash
# 应用日志
tail -f /project/java_project/wechat/logs/app.log

# Docker 日志
docker-compose logs -f app

# 实时日志
docker-compose logs -f --tail=100 app
```

### 数据库备份

```bash
#!/bin/bash
# backup_db.sh

BACKUP_DIR=/backup/mysql
DATE=$(date +%Y%m%d%H%M%S)
BACKUP_FILE=$BACKUP_DIR/wechat_$DATE.sql

mkdir -p $BACKUP_DIR

mysqldump -u root -p wechat > $BACKUP_FILE

# 保留最近 7 天的备份
find $BACKUP_DIR -name "wechat_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

---

## 常见问题

### Q1: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8080
# 或
netstat -tulpn | grep 8080

# 杀死进程
kill -9 <PID>
```

### Q2: 数据库连接失败

检查：

1. MySQL 服务是否启动
2. 用户名密码是否正确
3. 数据库是否存在
4. 防火墙是否开放 3306 端口

```bash
# 测试数据库连接
mysql -u root -p -h localhost -P 3306
```

### Q3: Redis 连接失败

```bash
# 测试 Redis 连接
redis-cli ping
# 应返回 PONG

# 如果设置了密码
redis-cli -a your_password ping
```

### Q4: RabbitMQ 连接失败

```bash
# 检查 RabbitMQ 状态
rabbitmqctl status

# 检查用户权限
rabbitmqctl list_users
```

### Q5: 内存不足

调整 JVM 参数：

```bash
java -Xms512m -Xmx1024m -jar wechat-0.0.1-SNAPSHOT.jar
```

或在 Docker Compose 中设置：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Q6: 文件上传失败

检查：

1. 文件大小限制配置
2. 目标目录权限
3. 磁盘空间

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 50MB
```

---

## 更新日志

- **2026-06-01**: 初始版本
