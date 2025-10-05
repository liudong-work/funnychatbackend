# 🚀 Node.js 聊天后端

一个基于Node.js的WebSocket聊天应用后端，完全兼容Go版本的所有功能。

## 📖 文档导航

- 📚 **[完整API文档](API_DOCUMENTATION.md)** - 详细的API接口说明  
- 🚀 **[快速开始指南](QUICK_START.md)** - 5分钟快速体验
- 🏗️ **[部署指南](DEPLOYMENT_GUIDE.md)** - 生产环境部署配置
- ⚙️ **[数据库配置](database-config.md)** - 数据库优化说明

## 🎯 功能特性

### 👤 用户管理
- ✅ 用户注册/登录（JWT认证）
- ✅ 用户信息修改
- ✅ 头像上传
- ✅ 用户详情查询
- ✅ 好友管理系统
- ✅ 用户搜索

### 📨 消息处理
- ✅ 实时WebSocket通信
- ✅ 单聊/群聊消息
- ✅ 多媒体消息（文字/图片/音频/视频/文件）
- ✅ 消息历史查询
- ✅ 消息持久化存储

### 👥 群组功能
- ✅ 创建/加入群组
- ✅ 群组成员管理
- ✅ 群聊消息分发
- ✅ 群组信息修改

### 📁 文件处理
- ✅ 文件上传下载
- ✅ 图片处理
- ✅ 文件类型识别
- ✅ 静态文件服务

### 🔧 系统功能
- ✅ 高性能日志系统（Winston）
- ✅ 数据库连接池
- ✅ 请求限流和安全防护
- ✅ 错误处理和异常恢复
- ✅ 环境配置管理

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn

### 安装依赖
\`\`\`bash
npm install
# 或
yarn install
\`\`\`

### 环境配置
\`\`\`bash
# 复制环境配置文件
cp .env.example .env

# 编辑数据库配置
vim .env
\`\`\`

### 数据库配置
在MySQL中创建数据库：
\`\`\`sql
CREATE DATABASE chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

### 启动服务
\`\`\`bash
# 开发环境
npm run dev

# 生产环境
npm start
\`\`\`

服务将在 \`http://localhost:8888\` 启动

## 📡 API接口

### 用户相关
- \`POST /api/user/register\` - 用户注册
- \`POST /api/user/login\` - 用户登录
- \`GET /api/user/:uuid\` - 获取用户详情
- \`PUT /api/user\` - 修改用户信息
- \`GET /api/user\` - 获取好友列表
- \`GET /api/user/name\` - 搜索用户/群组

### 好友管理
- \`POST /api/friend\` - 添加好友

### 消息相关
- \`GET /api/message\` - 获取消息历史
- WebSocket连接: \`ws://localhost:8888/socket.io\`

### 群组管理
- \`GET /api/group/:uuid\` - 获取群组列表
- \`POST /api/group/:uuid\` - 创建群组
- \`POST /api/group/join/:userUuid/:groupUuid\` - 加入群组
- \`GET /api/group/user/:uuid\` - 获取群组成员

### 文件处理
- \`POST /api/file\` - 文件上传
- \`GET /api/file/:fileName\` - 文件下载

## 🏗️ 项目结构

\`\`\`
src/
├── config/             # 配置文件
├── controllers/        # API控制器
├── middleware/         # 中间件
├── models/            # 数据模型
├── routes/            # 路由定义
├── services/          # 业务逻辑
├── socket/            # WebSocket处理
├── utils/             # 工具函数
└── server.js          # 服务入口
\`\`\`

## 🔧 技术栈

- **框架**: Express.js
- **实时通信**: Socket.IO
- **数据库**: MySQL + Sequelize ORM
- **认证**: JWT
- **日志**: Winston
- **安全**: Helmet, Rate Limiting
- **验证**: Joi
- **文件处理**: Multer

## 📊 性能对比

| 功能 | Go版本 | Node.js版本 | 性能差异 |
|------|--------|-------------|----------|
| HTTP API | ✅ | ✅ | 相当 |
| WebSocket | ✅ | ✅ | Node.js稍慢 |
| 数据库 | ✅ | ✅ | 相当 |
| 文件上传 | ✅ | ✅ | Go稍快 |
| 并发处理 | ✅ | ✅ | Go更快 |

## 🔄 与Go版本兼容性

- ✅ 相同的API接口
- ✅ 相同的数据结构
- ✅ 相同的协议格式
- ✅ 互操作的前端客户端

## 📝 开发说明

该项目完全实现了Go版本的所有功能，并提供：
- 完整的错误处理
- 详细的API文档
- 模块化的代码结构
- 高性能的并发处理
- 生产级的部署配置
