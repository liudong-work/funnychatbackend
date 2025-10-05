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
