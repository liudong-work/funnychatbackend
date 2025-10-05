# 🚀 Node.js 聊天后端 API 使用文档

## 📋 目录

- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [用户认证](#用户认证)
- [用户管理API](#用户管理api)
- [消息系统API](#消息系统api)
- [群组管理API](#群组管理api)
- [文件处理API](#文件处理api)
- [WebSocket实时通信](#websocket实时通信)
- [WebRTC通话功能](#webrtc通话功能)
- [管理员功能API](#管理员功能api)
- [React Native集成](#react-native集成)
- [数据库监控](#数据库监控)
- [错误码说明](#错误码说明)
- [开发调试](#开发调试)

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境配置模板：
```bash
cp env-template.txt .env
```

2. 编辑 `.env` 文件，配置数据库连接：
```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=chat
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key
```

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:8888`

---

## 🔧 环境配置

### 必需配置

```bash
# 应用配置
NODE_ENV=development
PORT=8888
HOST=localhost

# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=chat
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### 可选配置

```bash
# 文件上传
UPLOAD_DIR=uploads/
MAX_FILE_SIZE=10485760

# 数据库连接池
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000

# WebSocket
WS_HEARTBEAT_INTERVAL=30000

# 日志配置
LOG_LEVEL=debug
LOG_PATH=logs/chat.log
```

---

## 🔐 用户认证

### 认证方式

所有受保护的API都需要在请求头中携带JWT Token：

```bash
Authorization: Bearer <your_jwt_token>
```

### Token获取

通过登录接口获取：

```bash
POST /api/user/login
{
  "username": "username",
  "password": "password"
}
```

响应：
```json
{
  "status": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC's...",
    "user": {
      "uuid": "user-uuid",
      "username": "username",
      "nickname": "用户昵称",
      "avatar": "avatar_url"
    }
  }
}
```

---

## 👤 用户管理API

### 用户注册

```http
POST /api/user/register
Content-Type: application/json

{
  "username": "username",
  "password": "password123",
  "nickname": "用户昵称",
  "email": "user@example.com"
}
```

### 用户登录

```http
POST /api/user/login
Content-Type: application/json

{
  "username": "username",
  "password": "password123"
}
```

### 获取用户信息

```http
GET /api/user/:uuid
Authorization: Bearer <token>
```

### 更新用户信息

```http
PUT /api/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "email": "new@example.com"
}
```

### 搜索用户

```http
GET /api/user/name?username=keyword
Authorization: Bearer <token>
```

### 好友管理

#### 添加好友
```http
POST /api/friend
Authorization: Bearer <token>
Content-Type: application/json

{
  "from_user_id": "user-uuid",
  "to_user_id": "friend-uuid"
}
```

#### 获取好友列表
```http
GET /api/user
Authorization: Bearer <token>
```

---

## 💬 消息系统API

### 发送消息（WebSocket）

```javascript
// 通过WebSocket发送实时消息
socket.emit('send_message', {
  to: 'recipient_uuid',
  content: '消息内容',
  contentType: 1,        // 1-文字, 2-图片, 3-音频, 4-视频, 5-文件
  messageType: 1          // 1-单聊, 2-群聊
});
```

### 获取消息历史

```http
GET /api/message?to=user_uuid&page=1&limit=20
Authorization: Bearer <token>
```

参数：
- `to`: 聊天对象UUID（用户或群组）
- `page`: 页码，默认1
- `limit`: 每页数量，默认20

### 搜索消息

```http
GET /api/message/search?keyword=搜索关键词&type=all
Authorization: Bearer <token>
```

### 撤回消息

```http
PUT /api/message/:id/recall
Authorization: Bearer <token>
```

### 标记消息已读

```http
PUT /api/message/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageIds": ["msg-id-1", "msg-id-2"]
}
```

### 获取未读消息统计

```http
GET /api/message/unread
Authorization: Bearer <token>
```

---

## 👥 群组管理API

### 创建群组

```http
POST /api/group
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "群组名称",
  "notice": "群公告内容"
}
```

### 获取群组信息

```http
GET /api/group/:uuid
Authorization: Bearer <token>
```

### 更新群组信息

```http
PUT /api/group/:uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新群名",
  "notice": "新群公告"
}
```

### 加入群组

```http
POST /api/group/:id/join
Authorization: Bearer <token>
```

### 退出群组

```http
DELETE /api/group/:id/members/self
Authorization: Bearer <token>
```

### 删除群组

```http
DELETE /api/group/:uuid
Authorization: Bearer <token>
```

### 群成员管理

#### 获取群成员列表
```http
GET /api/group/:uuid/members?page=1&limit=20
Authorization: Bearer <token>
```

#### 移除群成员
```http
DELETE /api/group/:uuid/members/:member_id
Authorization: Bearer <token>
```

#### 设置群成员禁言
```http
POST /api/group/:uuid/members/:id/mute
Authorization: Bearer <token>
Content-Type: application/json

{
  "muteUntil": "2024-12-31T23:59:59Z"  // 可选，不指定则永久禁言
}
```

#### 设置群昵称
```http
PUT /api/group/:uuid/nickname
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "群昵称"
}
```

---

## 📁 文件处理API

### 上传文件

```http
POST /api/file
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData: {
  file: <File>
}
```

支持的文件类型：
- **图片**: JPEG, PNG, GIF, WebP
- **视频**: MP4, WebM, AVI
- **音频**: MP3, WAV, M4A
- **文档**: PDF, DOC, DOCX, XLS, XLSX

文件大小限制：10MB

### 下载文件

```http
GET /api/file/:filename
Authorization: Bearer <token>
```

### 强制下载

```http
GET /api/file/download/:filename
Authorization: Bearer <token>
```

### 文件列表（管理员）

```http
GET /api/files?page=1&limit=20
Authorization: Bearer <token>
```

---

## 🔌 WebSocket实时通信

### 连接服务器

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:8888');
```

### 事件列表

#### 用户注册

```javascript
socket.emit('register', {
  uuid: 'user-uuid',
  username: 'username'
});
```

#### 发送消息

```javascript
socket.emit('send_message', {
  to: 'recipient-uuid',
  content: '消息内容',
  contentType: 1,       // 1-文字, 2-图片, 3-音频, 4-视频, 5-文件, 6-通话
  messageType: 1         // 1-单聊, 2-群聊
});
```

#### 加入房间

```javascript
socket.emit('join_room', {
  room: 'room-id'
});
```

#### 离开房间

```javascript
socket.emit('leave_room', {
  room: 'room-id'
});
```

#### 心跳检测

```javascript
socket.emit('ping');

// 服务器回复
socket.on('pong', () => {
  console.log('连接正常');
});
```

### 接收事件

#### 接收消息

```javascript
socket.on('message', (message) => {
  console.log('收到消息:', message);
  /*
  message: {
    from: 'sender-uuid',
    fromUsername: 'sender-username',
    to: 'recipient-uuid',
    content: '消息内容',
    contentType: 1,
    messageType: 1,
    url: 'file-url',     // 文件消息的URL
    timestamp: 1734567890123
  }
  */
});
```

#### 用户状态更新

```javascript
socket.on('user_status', (data) => {
  console.log('用户状态更新:', data);
  /*
  data: {
    uuid: 'user-uuid',
    status: 'online',    // online/offline
    timestamp: 1734567890123
  }
  */
});
```

#### 错误处理

```javascript
socket.on('error', (error) => {
  console.error('WebSocket错误:', error);
});
```

---

## 📞 WebRTC通话功能

### 基础通话设置

```javascript
// WebRTC配置
const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const peerConnection = new RTCPeerConnection(pcConfig);
```

### 发起通话

```javascript
socket.emit('call_start', {
  to: 'recipient-uuid',
  type: 'audio'  // audio/video/screen
});

// 监听呼叫响应
socket.on('call_answer', async (data) => {
  if (data.accepted) {
    // 处理接听逻辑
    await handleAcceptCall(data);
  } else {
    // 处理拒绝逻辑
    handleRejectCall(data);
  }
});
```

### 接听通话

```javascript
socket.on('call_offer', async (data) => {
  const { from, offer } = data;
  
  // 创建通话会话
  const sessionId = generateSessionId();
  
  // 设置远端的offer
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  
  // 创建answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // 发送accept响应
  socket.omit('call_answer', {
    from: from,
    sessionId: sessionId,
    accepted: true,
    answer: answer
  });
});
```

### ICE候选交换

```javascript
// 发送ICE候选
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice_candidate', {
      to: 'recipient-uuid',
      candidate: event.candidate,
      sessionId: currentSessionId
    });
  }
};

// 接收ICE候选
socket.on('ice_candidate', async (data) => {
  const { candidate } = data;
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
```

### 通话状态管理

```javascript
socket.on('call_status', (data) => {
  /*
  data: {
    sessionId: 'session-id',
    status: 'calling' | 'connected' | 'ended' | 'failed',
    duration: 120,  // 通话时长(秒)
    timestamp: 1734567890123
  }
  */
});

socket.on('call_stream', (data) => {
  /*
  data: {
    type: 'local' | 'remote',
    stream: MediaStream,
    sessionId: 'session-id'
  }
  */
});
```

### 屏幕共享

```javascript
// 开始屏幕共享
socket.emit('screen_share_start', {
  to: 'recipient-uuid',
  sessionId: currentSessionId
});

// 停止屏幕共享
socket.emit('screen_share_stop', {
  sessionId: currentSessionId
});
```

---

## 🔧 管理员功能API

### 数据库健康检查

```http
GET /api/admin/database/health
Authorization: Bearer <admin_token>
```

响应：
```json
{
  "status": true,
  "message": "数据库健康检查完成",
  "data": {
    "overallStatus": "healthy",
    "checks": [
      {
        "name": "数据库连接",
        "status": "healthy",
        "responseTime": 45,
        "message": "连接正常"
      }
    ],
    "healthyRatio": "3/3"
  }
}
```

### 连接池状态

```http
            
GET /api/admin/database/status
Authorization: Bearer <admin_token>
```

### 数据库压力测试

```http
POST /api/admin/database/stress-test
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "duration": 30000
}
```

### 慢查询分析

```http
GET /api/admin/database/slow-queries
Authorization: Bearer <admin_token>
```

### 连接池监控

```http
POST /api/admin/database/monitor
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "duration": 60000,
  "interval": 5000
}
```

---

## 📱 React Native集成

### 安装依赖

```bash
npm install socket.io-client react-native-webrtc
```

### WebSocket连接配置

```javascript
import io from 'socket.io-client';

const socket = io('ws://your-server:8888', {
  transports: ['websocket'],
  timeout: 10000,
  reconnection: true,
  reconnectionDelay: 5000
});
```

### React Native WebRTC集成

```javascript
import {
  RTCPeerConnection,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
} from 'react-native-webrtc';

export default class VideoCallComponent extends React.Component {
  async initWebRTC() {
    // 移动端WebRTC初始化
    const pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      // 移动端优化配置
      audioCodecs: ['opus'],
      videoCodecs: ['VP8', 'H264'],
    };

    this.peerConnection = new RTCPeerConnection(pcConfig);
    
    // 移动端设备注册
    socket.emit('rn_client_register', {
      uuid: 'user-uuid',
      deviceType: 'mobile',
      osVersion: Platform.OS === 'ios' ? 'iOS' : 'Android',
      webrtcSupport: true
    });
  }
}
```

### 移动端优化设置

```javascript
// 移动网络优化
const mobileConfig = {
  iceTransportPolicy: 'relay',
  rtcpMuxPolicy: 'require',
  bundlePolicy: 'balanced',
  
  // 音频编码优化
  audioCodecs: ['opus'],
  audioBitrate: 12800,  // 12.8kbps
  
  // 视频编码优化  
  videoCodecs: ['VP8'],
  videoBitrate: 300000, // 300kpbs
  
  // 移动端分辨率
  videoResolution: {
    maxWidth: 720,
    maxHeight: 480
  }
};
```

### 推送通知集成

```javascript
// 离线消息推送
socket.on('push_notification', (data) => {
  /*
  data: {
    type: 'message' | 'call' | 'system',
    title: '新消息',
    body: 'content',
    sender: 'sender-name',
    badge: 1
  }
  */
  
  // 展示本地推送通知
  NotificationService.showNotification(data);
});
```

---

## 📊 数据库监控

### 监控工具使用

```bash
# 健康检查
node test/database-pool-test.js health

# 压力测试
node test/database-pool-test.js stress 60000

# 监控测试
node test/database-pool-test.js monitor 60000

# 慢查询分析
node test/database-pool-test.js slow

# 全部测试
node test/database-pool-test.js all 30000
```

### 性能优化建议

#### 生产环境MySQL配置

```sql
-- 查看当前连接状态
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

#### 查询优化

```sql
-- 为常用查询添加索引
ALTER TABLE messages ADD INDEX idx_user_timestamp (from_user_id, created_at);
ALTER TABLE group_members ADD INDEX idx_group_user (group_id, user_id);
ALTER TABLE user_friends ADD INDEX idx_user_friends (from_user_id, to_user_id);
```

---

## ❌ 错误码说明

### HTTP状态码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | 操作完成 |
| 201 | 创建成功 | 用户注册成功 |
| 400 | 请求参数错误 | 参数验证失败 |
| 401 | 未授权 | JWT Token无效 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 资源不存在 | 用户不存在 |
| 409 | 资源冲突 | 用户名已存在 |
| 413 | 文件过大 | 上传文件超过限制 |
| 429 | 请求频率限制 | API调用过于频繁 |
| 500 | 服务器内部错误 | 数据库连接失败 |

### 业务错误码

```json
{
  "status": false,
  "code": "USER_NOT_FOUND",
  "message": "用户不存在",
  "details": "用户UUID不存在或已被删除"
}
```

常见业务错误码：
- `USER_NOT_FOUND`: 用户不存在
- `INVALID_TOKEN`: JWT Token无效
- `PERMISSION_DENIED`: 权限不足
- `GROUP_NOT_FOUND`: 群组不存在
- `FILE_TOO_LARGE`: 文件过大
- `NETWORK_ERROR`: 网络连接错误
- `DATABASE_ERROR`: 数据库错误

---

## 🐛 开发调试

### 开发环境调试

```bash
# 启用详细日志
NODE_ENV=development LOG_LEVEL=debug npm run dev

# 数据库连接调试
DB_LOGGING=true npm run dev

# WebSocket调试
WS_DEBUG=true npm run dev
```

### 测试工具

```bash
# 单元测试
npm test

# API测试
npm run test:api

# 压力测试
npm run test:stress
```

### 日志配置

日志文件位置：`logs/chat.log`

日志级别：
- `error`: 错误信息
- `warn`: 警告信息  
- `info`: 一般信息
- `debug`: 调试信息

### 性能监控

```bash
# 启用性能监控
PERFORMANCE_MONITOR=true npm start

# 查看性能指标
curl http://localhost:8888/api/admin/database/status
```

---

## 📞 技术支持

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否启动
   - 验证数据库配置参数
   - 确认用户权限

2. **WebSocket连接失败**
   - 检查端口8888是否被占用
   - 验证防火墙设置
   - 确认CORS配置

3. **文件上传失败**
   - 检查uploads目录权限
   - 验证文件大小限制
   - 确认文件类型支持

4. **WebRTC连接失败**
   - 检查STUN/TURN服务器
   - 验证ICE候选收集
   - 确认网络配置

### 联系信息

- 📧 邮箱: support@example.com
- 📖 文档: 本文档
- 🐛 问题反馈: GitHub Issues
- 💬 技术支持: 在线客服

---

**版本**: v1.0.0  
**最后更新**: 2024年12月  
**兼容性**: Node.js 18+, MySQL 8.0+
