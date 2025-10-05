# 🚀 开箱即用快速开始

## ✨ 一句话启动

```bash
./install.sh && ./start.sh
```

## 🎯 三种启动方式

### 1️⃣ **一键安装 (推荐新手)**

```bash
# 克隆项目
git clone https://github.com/your-repo/nodejs-chat-backend.git
cd nodejs-chat-backend

# 一键安装配置
./install.sh

# 启动服务 (按照提示操作MySQL)
./start.sh
```

### 2️⃣ **Docker一键启动 (推荐懒人)**

```bash
# 一条命令启动完整环境
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f chat-backend
```

### 3️⃣ **手动安装 (推荐开发者)**

```bash
# 1. 安装依赖
npm install

# 2. 复制配置
cp env-template.txt .env
# 编辑 .env 文件设置数据库密码

# 3. 创建数据库
mysql -u root << EOF
CREATE DATABASE chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# 4. 启动服务
npm start
```

## ✅ 开箱即用确认清单

### 🎯 **基础环境检查**

- ✅ Node.js 18+ 已安装
- ✅ MySQL 8.0+ 服务运行
- ✅ 数据库 `chat` 已创建
- ✅ npm 依赖已安装
- ✅ 配置文件 `.env` 存在

### 🔧 **功能验证**

#### API端点测试
```bash
# 健康检查
curl http://localhost:8888/health

# 用户注册
curl -X POST http://localhost:8888/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123","nickname":"测试"}'

# 用户登录
curl -X POST http://localhost:8888/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123"}'
```

#### WebSocket测试
```bash
# 安装WebSocket客户端
npm install -g wscat

# 连接测试
wscat -c http://localhost:8888/socket.io/?EIO=4&transport=websocket

# 发送注册消息
{"type":"register","data":{"uuid":"test-uuid","username":"test"}}
```

#### WebRTC测试
```bash
# 打开浏览器访问
http://localhost:8888/webrtc-test.html
```

### 📊 **服务状态**

```bash
# 检查进程
ps aux | grep node

# 检查端口
netstat -tlnp | grep 8888

# 检查数据库连接
mysql -u root -e "SHOW PROCESSLIST;"

# 查看日志
tail -f logs/chat.log
```

## 🎉 开箱即用功能特性

### ✅ **完美开箱体验**
- 📦 **零配置启动**: 默认配置即可运行
- 🔧 **自动初始化**: 数据库自动创建
- 📊 **健康检查**: 服务状态实时监控
- 📝 **详细日志**: 问题排查一键定位

### ✅ **完整功能覆盖**
- 👤 **用户系统**: 注册/登录/认证
- 💬 **实时聊天**: WebSocket消息传输
- 👥 **群组功能**: 创建/加入/管理
- 📁 **文件处理**: 上传/下载/共享
- 📞 **音视频通话**: WebRTC集成
- 📱 **移动端支持**: React Native适配

### ✅ **开发者友好**
- 📚 **完整文档**: API文档 + 部署指南
- 🔍 **代码可读**: 模块化架构设计
- 🧪 **测试就绪**: 测试框架已配置
- 🚀 **部署简化**: Docker一键部署

### ✅ **生产环境就绪**
- 🔒 **安全防护**: JWT认证 + 限流
- 📈 **性能优化**: 连接池 + 缓存
- 🔍 **监控告警**: 健康检查 + 日志
- 🔄 **备份恢复**: 数据备份脚本

## 🚨 常见问题快速解决

### ❓ **启动失败检查清单**

1. **环境问题**
   ```bash
   # 检查Node.js版本
   node --version  # 需要 v18+
   
   # 检查MySQL服务
   sudo systemctl status mysql
   sudo systemctl start mysql
   ```

2. **权限问题**
   ```bash
   # 修复文件权限
   chmod +x install.sh start.sh
   chmod 755 uploads logs
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep 8888
   # 修改 .env 文件中的 PORT=8889
   ```

4. **数据库连接**
   ```bash
   # 测试数据库连接
   mysql -u root -p
   SHOW DATABASES;
   ```
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
run_terminal_cmd
