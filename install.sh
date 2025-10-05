#!/bin/bash

# Node.js 聊天后端 - 开箱即用安装脚本
# 一键安装配置，完成即可运行

echo "🚀 Node.js 聊天后端 - 开箱即用安装脚本"
echo "=========================================="

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node --version 2>/dev/null || echo "未安装")
echo "Node.js版本: $node_version"

if [[ ! "$node_version" =~ ^v18\. ]]; then
    echo "❌ 需要Node.js 18+版本"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

# 检查MySQL
echo "📋 检查MySQL..."
mysql_version=$(mysql --version 2>/dev/null || echo "未安装")
echo "MySQL版本: $mysql_version"

if [[ "$mysql_version" == "未安装" ]]; then
    echo "⚠️  未检测到MySQL，请在本地安装MySQL 8.0+"
    echo "安装命令 (Ubuntu/Debian): sudo apt install mysql-server"
    echo "安装命令 (CentOS/RHEL): sudo yum install mysql-server"
    echo "安装命令 (macOS): brew install mysql"
    echo ""
    echo "创建数据库: CREATE DATABASE chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

echo ""
echo "🔧 安装依赖包..."

# 安装npm依赖
if npm install; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "📁 创建必要目录..."

# 创建必要目录
mkdir -p uploads
mkdir -p logs
mkdir -p proto

# 设置权限
chmod 755 uploads logs proto

echo "✅ 目录创建成功"

echo ""
echo "⚙️  配置环境变量..."

# 创建环境配置文件
cat > .env << EOF
# Node.js 聊天后端 - 开箱即用配置

# 应用配置
NODE_ENV=development
PORT=8888
HOST=localhost

# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=chat
DB_USER=root
DB_PASSWORD=root1234

# 连接池配置
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000

# JWT配置
JWT_SECRET=nodejs_chat_backend_supersecretkey_2024
JWT_EXPIRES_IN=7d

# 文件上传
UPLOAD_DIR=uploads/
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=debug
LOG_PATH=logs/chat.log

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
EOF

echo "✅ 环境配置完成"

echo ""
echo "📊 创建数据库初始化脚本..."

# 创建数据库初始化脚本
cat > init_database.sql << EOF
-- 创建聊天数据库
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
    deleted_at TIM:



ESTAMP NULL DEFAULT NULL,
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
    UNIQUE KEY unique_friendship (from_user_id, to_user_id)s,
    INDEX idx_from_user (from_user_id),
    INDEX idx_to_user (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF

echo "✅ 数据库脚本创建成功"

echo ""
echo "📝 创建启动脚本..."

# 创建快速启动脚本
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 启动 Node.js 聊天后端..."

# 检查环境文件
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 配置文件"
    echo "请先运行 ./install.sh 安装"
    exit 1
fi

# 检查数据库连接
echo "🔍 检查数据库连接..."
mysql -h 127.0.0.1 -P 3306 -u root -proot1234 -e "SELECT 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    echo "请检查:"
    echo "1. MySQL服务是否启动"
    echo "2. 数据库用户名密码是否正确"
    echo "3. .env 文件中的数据库配置"
    exit 1
fi

# 检查数据库是否存在
echo "📊 检查数据库..."
mysql -h 127.0.0.1 -P 3306 -u root -proot1234 -e "USE chat;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库 chat 已存在"
else
    echo "📈 创建数据库..."
    mysql -h 127.0.0.1 -P 3306 -u root -proot1234 < init_database.sql
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功"
    else
        echo "❌ 数据库初始化失败"
        exit 1
    fi
fi

# 启动服务
echo "🎉 启动聊天服务..."
echo "服务地址: http://localhost:8888"
echo "API文档: http://localhost:8888/api"
echo "健康检查: http://localhost:8888/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm start
EOF

chmod +x start.sh

echo "✅ 启动脚本创建成功"

echo ""
echo "📋 安装完成！"
echo "=========================================="
echo "✅ 依赖包安装完成"
echo "✅ 目录结构创建完成"
echo "✅ 环境配置完成"
echo "✅ 数据库脚本准备完成"
echo "✅ 启动脚本创建完成"
echo ""

echo "🚀 下一步："
echo "1. 确保MySQL服务已启动"
echo "2. 运行数据库初始化: mysql -u root -p < init_database.sql"
echo "3. 启动服务: ./start.sh"
echo "4. 访问: http://localhost:8888/health"
echo ""

echo "📖 更多信息:"
echo "- API文档: API_DOCUMENTATION.md"
echo "- 快速开始: QUICK_START.md"
echo "- 部署指南: DEPLOYMENT_GUIDE.md"
echo ""

echo "🎉 恭喜！Node.js 聊天后端已准备就绪！"
