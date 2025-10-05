# 🚀 Node.js 聊天后端 部署指南

## 📋 目录

- [快速部署](#快速部署)
- [环境要求](#环境要求)
- [生产环境部署](#生产环境部署)
- [Docker容器部署](#docker容器部署)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)
- [数据库迁移](#数据库迁移)
- [SSL证书配置](#ssl证书配置)
- [负载均衡配置](#负载均衡配置)
- [备份和恢复](#备份和恢复)
- [故障排除](#故障排除)

---

## 🚀 快速部署

### 1. 环境准备

```bash
# 检查Node.js版本
node --version  # 需要 18+
npm --version   # 需要 9+

# 检查MySQL版本
mysql --version  # 需要 8.0+
```

### 2. 项目部署

```bash
# 克隆项目
git clone https://github.com/your-repo/nodejs-chat-backend.git
cd nodejs-chat-backend

# 安装依赖
npm install

# 环境配置
cp env-template.txt .env
# 编辑 .env 文件

# 启动服务
npm start
```

### 3. 验证部署

```bash
# 健康检查
curl http://localhost:8888/health

# API测试
curl http://localhost:8888/api/user/name?username=test
```

---

## 🔧 环境要求

### 硬件要求

#### 最小配置
```bash
CPU: 2核
内存: 4GB RAM
存储: 20GB SSD
网络: 100Mbps
```

#### 推荐配置  
```bash
CPU: 4核+
内存: 8GB+ RAM
存储: 50GB+ SSD
网络: 1Gbps+
```

#### 高并发配置
```bash
CPU: 8核+
内存: 16GB+ RAM
存储: 100GB+ NVMe SSD
网络: 10Gbps+
```

### 软件要求

```bash
操作系统: Ubuntu 20.04+/CentOS 8+/Debian 11+
Node.js: 18.0.0+
MySQL: 8.0.0+
Nginx: 1.18+ (可选)
Redis: 6.0+ (可选)
```

### 端口要求

| 端口 | 服务 | 说明 |
|------|------|------|
| 8888 | HTTP API | 主服务端口 |
| 4443 | HTTPS API | SSL加密端口 |
| 3306 | MySQL | 数据库端口 |
| 443 | SSL | HTTPS代理端口 |
| 80 | HTTP | HTTP代理端口 |

---

## 🏭 生产环境部署

### 1. 使用 PM2 进程管理

```bash
# 全局安装PM2
npm install -g pm2

# 创建PM2生态系统文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nodejs-chat-backend',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8888
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 2. Nginx反向代理配置

```nginx
# /etc/nginx/sites-available/chat-backend
upstream chat_backend {
    server localhost:8888;
    server localhost:8889 backup;  # 备用服务器
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # WebSocket代理
    location /socket.io/ {
        proxy_pass http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API代理
    location /api/ {
        proxy_pass http://chat_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # 静态文件
    location /uploads/ {
        alias /path/to/your/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 限制文件上传大小
    client_max_body_size 10M;

    # 安全头设置
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 3. 环境变量配置

```bash
# .env.production
NODE_ENV=production
PORT=8888
HOST=0.0.0.0

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chat_production
DB_USER=chat_user
DB_PASSWORD=secure_password_here

# 连接池配置
DB_POOL_MAX=50
DB_POOL_MIN=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=30000

# JWT配置
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 文件上传
UPLOAD_DIR=/var/www/chat/uploads/
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_PATH=/var/log/chat/chat.log

# WebSocket
WS_HEARTBEAT_INTERVAL=30000

# 性能监控
PERFORMATION_MONITOR=true
```

---

## 🐳 Docker容器部署

### 1. 创建Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S chat -u 1001

# 设置工作目录
WORKDIR /usr/src/app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY --chown=chat:nodejs . .

# 创建必要的目录
RUN mkdir -p logs uploads && \
    chown -R chat:nodejs logs uploads

# 切换到应用用户
USER chat

# 暴露端口
EXPOSE 8888

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8888/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
```

### 2. Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Node.js应用
  chat-backend:
    build: .
    ports:
      - "8888:8888"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=chat
      - DB_USER=chat_user
      - DB_PASSWORD=chat_password
      - JWT_SECRET=your_secret_key
    volumes:
      - ./uploads:/usr/src/app/uploads
      - ./logs:/usr/src/app/logs
    depends_on:
      - mysql
    restart: unless-stopped
    networks:
      - chat-network

  # MySQL数据库
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=chat
      - MYSQL_USER=chat_user
      - MYSQL_PASSWORD=chat_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - chat-network
    command: --default-authentication-plugin=mysql_native_password

  # Redis缓存 (可选)
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - chat-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./uploads:/var/www/uploads
    depends_on:
      - chat-backend
    restart: unless-stopped
    networks:
      - chat-network

volumes:
  mysql_data:
  redis_data:

networks:
  chat-network:
    driver: bridge
```

### 3. 部署命令

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.yml up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f chat-backend

# 更新服务
docker-compose pull chat-backend
docker-compose up -d chat-backend

# 停止服务
docker-compose down
```

### 4. 数据库初始化脚本

```sql
-- init.sql
CREATE DATABASE IF NOT EXISTS chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chat;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(350),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_uuid (uuid),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT,
    group_id INT,
    content TEXT NOT NULL,
    content_type TINYINT DEFAULT 1,
    message_type TINYINT DEFAULT 1,
    file_name VARCHAR(255),
    file_size BIGINT,
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_from_user (from_user_id),
    INDEX idx_to_user (to_user_id),
    INDEX idx_group (group_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 群组表
CREATE TABLE IF NOT EXISTS groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(150) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    notice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_uuid (uuid),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 群成员表
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    nickname VARCHAR(50),
    muted BOOLEAN DEFAULT FALSE,
    mute_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_user (group_id, user_id),
    INDEX idx_group (group_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 好友关系表
CREATE TABLE IF NOT EXISTS user_friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_friendship (from_user_id, to_user_id),
    INDEX idx_from_user (from_user_id),
    INDEX idx_to_user (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ⚡ 性能优化

### 1. 数据库优化

```sql
-- 优化MySQL配置 /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# 基础配置
max_connections = 500
max_connect_errors = 10000
connect_timeout = 10
wait_timeout = 28800

# InnoDB配置
innodb_buffer_pool_size = 4G
innodb_log_buffer_size = 128M
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2

# 查询缓存
query_cache_size = 128M
query_cache_type = 1
query_cache_limit = 2M

# 慢查询日志
slow_query_log = 1
long_query_time = 1
slow_query_log_file = /var/log/mysql/slow.log

# 二进制日志
log-bin = mysql-bin
expire_logs_days = 7
binlog_format = ROW

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

### 2. Node.js优化

```bash
# 启用Node.js优化
export NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=128"

# PM2集群模式
pm2 start ecosystem.config.js --instances max

# 启用JSON压缩
npm install compression
```

### 3. 缓存策略

```javascript
// Redis缓存配置
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  db: 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis服务器连接被拒绝');
    }
    if (options.times_connected > 60) {
      return new Error('重试次数过多，停止重试');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// 用户缓存
const cacheUser = async (uuid, userData) => {
  return client.setex(`user:${uuid}`, 3600, JSON.stringify(userData));
};

// 消息缓存
const cacheMessages = async (roomId, messages) => {
  return client.setex(`messages:${roomId}`, 1800, JSON.stringify(messages));
};
```

### 4. CDN静态资源

```javascript
// 静态资源CDN配置
app.use('/uploads', express.static('uploads', {
  maxAge: '30d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30天
    }
  }
}));
```

---

## 📊 监控和日志

### 1. 日志管理

```bash
# 创建日志目录
sudo mkdir -p /var/log/chat
sudo chown -R nodejs:nodejs /var/log/chat

# 配置logrotate
cat > /etc/logrotate.d/chat-backend << EOF
/var/log/chat/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 2. 监控配置

```javascript
// 性能监控中间件
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const path = req.route ? req.route.path : req.path;
    
    // 记录性能指标
    logger.info('API Performance', {
      method: req.method,
      path: path,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // 慢请求告警
    if (duration > 5000) {
      logger.warn('Slow API Request', {
        path: path,
        duration: duration,
        threshold: 5000
      });
    }
  });
  
  next();
};

app.use(performanceMonitor);
```

### 3. 健康检查端点

```javascript
// 详细健康检查
app.get('/health/detailed', authenticateToken, async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      diskSpace: await checkDiskSpace(),
      memory: process.memoryUsage()
    }
  };
  
  res.json(healthCheck);
});

const checkDatabase = async () => {
  try {
    await database.authenticate();
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

---

## 🔄 数据库迁移

### 1. 迁移脚本

```bash
# 创建迁移目录
mkdir -p migrations

# 迁移脚本示例
cat > migrations/001_create_tables.sql << EOF
-- 创建基本表结构
-- 见上面的 init.sql 内容
EOF

cat > migrations/002_add_indexes.sql << EOF
-- 添加性能索引
ALTER TABLE messages ADD INDEX idx_user_timestamp (from_user_id, created_at);
ALTER TABLE group_members ADD INDEX idx_group_user (group_id, user_id);
ALTER TABLE user_friends ADD INDEX idx_status (status);
EOF
```

### 2. 数据备份

```bash
#!/bin/bash
# backup.sh - 数据库备份脚本

BACKUP_DIR="/var/backups/chat"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="chat"
DB_USER="chat_user"

mkdir -p $BACKUP_DIR

# 全量备份
mysqldump -u $DB_USER -p$DB_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  $DB_NAME > $BACKUP_DIR/chat_backup_$DATE.sql

# 压缩备份
gzip $BACKUP_DIR/chat_backup_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "chat_back_*.sql.gz" -mtime +7 -delete

echo "备份完成: chat_backup_$DATE.sql.gz"
```

### 3. 数据恢复

```bash
#!/bin/bash
# restore.sh - 数据库恢复脚本

BACKUP_FILE=$1
DB_NAME="chat"

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <backup_file.sql.gz>"
    exit 1
fi

# 解压并恢复
gunzip -c $BACKUP_FILE | mysql -u root -p$DB_PASSWORD $DB_NAME

echo "数据恢复完成"
```

---

## 🔒 SSL证书配置

### 1. Let's Encrypt证书

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/cert-renew && /sbin/service nginx reload
```

### 2. 自签名证书 (开发环境)

```bash
# 生成私钥
openssl genrsa -out chat-key.pem 2048

# 生成证书签名请求
openssl req -new -key chat-key.pem -out chat.csr

# 生成自签名证书
openssl x509 -req -in chat.csr -signkey chat-key.pem -out chat-cert.pem -days 365

# 移动证书
sudo mv chat-cert.pem /etc/ssl/certs/
sudo mv chat-key.pem /etc/ssl/private/
```

### 3. Nginx SSL配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/chat-cert.pem;
    ssl_certificate_file /etc/ssl/private/chat-key.pem;
    
    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 其他配置...
}
```

---

## ⚖️ 负载均衡配置

### 1. Nginx负载均衡

```nginx
upstream chat_backends {
    least_conn;
    server 192.170.1.10:8888 weight=3 max_fails=3 fail_timeout=30s;
    server 192.170.1.11:8888 weight=2 max_fails=3 fail_timeout=30s;
    server 192.170.1.12:8888 weight=1 max_fails=3 fail_timeout=30s;
    server 192.170.1.13:8888 backup;
}

server {
    listen 80;
    location / {
        proxy_pass http://chat_backends;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket升级
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. HAProxy负载均衡

```bash
# HAProxy配置 /etc/haproxy/haproxy.cfg
global
    daemon
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend chat_frontend
    bind *:80
    redirect scheme https if !{ ssl_fc }
    
    acl www hdr(host) -i your-domain.com
    use_backend chat_backend if www

frontend chat_frontend_ssl
    bind *:443 ssl crt /etc/ssl/private/chatapp.pem
    default_backend chat_backend

backend chat_backend
    balance roundrobin
    option httpchk GET /health
    
    server web1 192.170.1.10:8888 check
    server web2 192.170.1.11:8888 check
    server web3 192.170.1.12:8888 check
```

---

## 💾 备份和恢复

### 1. 完整备份策略

```bash
#!/bin/bash
# full-backup.sh - 完整备份脚本

BACKUP_DIR="/var/backups/chat/full"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="chat"

mkdir -p $BACKUP_DIR

# 1. 数据库备份
mysqldump -u root -p$DB_PASSWORD \
  --single-transaction \
  --master-data=2 \
  --routines \
  --triggers \
  --all-databases > $BACKUP_DIR/all_databases_$DATE.sql

# 2. 应用文件备份
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/
tar -czf $BACKUP_DIR/configs_$DATE.tar.gz src/config/ *.json

# 表结构备份
mysqldump -u root -p$DB_PASSWORD \
  --no-data \
  --routines \
  --triggers \
  $DB_NAME > $BACKUP_DIR/schema_$DATE.sql

# 3. 创建备份索引
cat > $BACKUP_DIR/backup_$DATE.txt << EOF
备份时间: $(date)
备份类型: 完整备份
数据库: $DB_NAME
文件大小: $(du -sh $BACKUP_DIR/)
备份文件:
- all_databases_$DATE.sql
- uploads_$DATE.tar.gz
- configs_$DATE.tar.gz
- schema_$DATE.sql
EOF

# 4. 压缩整个备份
tar -czf /var/backups/chat/full_backup_$DATE.tar.gz -C $BACKUP_DIR .

echo "完整备份完成: full_backup_$DATE.tar.gz"
```

### 2. 增量备份

```bash
#!/bin/bash
# incremental-backup.sh - 增量备份脚本

BACKUP_DIR="/var/backups/chat/incremental"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="chat"

mkdir -p $BACKUP_DIR

# 增量备份只包含新数据和变化
mysqlbinlog --start-datetime="$(date -d '1 day ago')" \
  --stop-datetime="$(date)" \
  /var/lib/mysql/mysql-bin.* > $BACKUP_DIR/binlog_$DATE.sql

echo "增量备份完成: binlog_$DATE.sql"
```

### 3. 自动备份

```bash
# 添加到crontab
# 每周日凌晨2点完整备份
0 2 * * 0 /opt/chat/scripts/full-backup.sh >> /var/log/chat-backup.log 2>&1

# 每日凌晨3点增量备份
0 3 * * 1-6 /opt/chat/scripts/incremental-backup.sh >> /var/log/chat-backup.log 2>&1

# 每月1号清理30天前的备份
0 4 1 * * find /var/backups/chat -name "*.tar.gz" -mtime +30 -delete
```

---

## 🚨 故障排除

### 1. 常见问题诊断

```bash
# 检查服务状态
systemctl status chat-backend
pm2 status
docker ps

# 检查端口占用
netstat -tlnp | grep 8888
lsof -i :8888

# 检查磁盘空间
df -h
du -sh /var/log/chat/
du -sh uploads/

# 检查数据库连接
mysql -u chat_user -p -e "SHOW PROCESSLIST;"
mysql -u chat_user -p -e "SHOW STATUS LIKE 'Connections';"

# 检查日志
tail -f /var/log/chat/chat.log
journalctl -u chat-backend -f
```

### 2. 性能问题排查

```bash
# CPU使用率
top -p $(pgrep -f "node.*server.js")

# 内存使用
ps aux | grep node
free -h

# 数据库连接
mysql -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -e "SHOW PROCESSLIST;" | grep -v Sleep

# 慢查询分析
mysql -e "SHOW VARIABLES LIKE 'slow_query_log%';"
tail -f /var/log/mysql/slow.log
```

### 3. WebSocket连接问题

```bash
# 检查WebSocket连接
netstat -an | grep 8888 | grep ESTABLISHED | wc -l

# 检查防火墙
ufw status
iptables -L

# 测试连接
websocat ws://localhost:8888/socket.io/?EIO=4&transport=websocket
```

### 4. 故障恢复步骤

```bash
# 1. 停止服务
pm2 stop chat-backend
systemctl stop nginx

# 2. 检查错误日志
tail -100 /var/log/chat/error.log

# 3. 数据库问题恢复
mysql -u root -p -e "FLUSH TABLES;"
mysql -u root -p -e "SHOW ENGINE INNODB STATUS\G"

# 4. 重启服务
pm2 restart chat-backend
systemctl restart nginx

# 5. 验证服务
curl http://localhost:8888/health
```

---

## 📞 技术支持

### 联系方式

- 📧 **技术支持**: support@example.com
- 📖 **文档更新**: docs@example.com  
- 🐛 **Bug报告**: bugs@example.com
- 💼 **商务合作**: business@example.com

### 服务级别协议

| 优先级 | 响应时间 | 解决时间 |
|--------|----------|----------|
| 紧急 (P1) | 15分钟 | 2小时 |
| 高 (P2) | 1小时 | 4小时 |
| 中 (P3) | 4小时 | 1工作日 |
| 低 (P4) | 1工作日 | 3工作日 |

---

**文档版本**: v1.0.0  
**更新日期**: 2024年12月  
**适用版本**: Node.js Chat Backend v1.0.0+  
**维护团队**: DevOps Team
