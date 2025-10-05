# 🚀 Node.js 聊天后端 快速开始指南

## 📋 目录
- [5分钟快速体验](#5分钟快速体验)
- [API快速测试](#api快速测试)
- [WebSocket连接测试](#websocket连接测试)
- [React Native客户端示例](#react-native客户端示例)
- [WebRTC通话测试](#webrtc通话测试)
- [常见问题](#常见问题)

---

## ⚡ 5分钟快速体验

### 1. 准备环境

```bash
# 检查环境
node --version  # 需要 18+
npm --version   # 需要 9+
mysql --version  # 需要 8.0+
```

### 2. 一键启动

```bash
# 克隆项目
git clone https://github.com/your-repo/nodejs-chat-backend.git
cd nodejs-chat-backend

# 安装依赖
npm install

# 快速配置
echo "DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=chat
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=my_secret_key
NODE_ENV=development
PORT=8888" > .env

# 启动服务
npm start
```

### 3. 验证服务

```bash
# 健康检查
curl http://localhost:8888/health

# 预期输出
{
  "status": "healthy",
  "timestamp": "2024-12-20T10:00:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

**🎉 恭喜！你的聊天服务已经成功启动！**

---

## 🔌 API快速测试

### 用户注册测试

```bash
curl -X POST http://localhost:8888/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "nickname": "测试用户",
    "email": "test@example.com"
  }'

# 预期响应
{
  "status": true,
  "message": "用户注册成功",
  "data": {
    "uuid": "generated-uuid",
    "username": "testuser",
    "nickname": "测试用户"
  }
}
```

### 用户登录测试

```bash
curl -X POST http://localhost:8888/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# 预期响应
{
  "status": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "uuid": "user-uuid",
      "username": "testuser",
      "nickname": "测试用户",
      "avatar": null
    }
  }
}
```

### 使用Token访问API

```bash
# 保存token
TOKEN="your_jwt_token_here"

# 获取用户信息
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8888/api/user/the-user-uuid

# 搜索用户
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8888/api/user/name?username=test"
```

---

## 🔌 WebSocket连接测试

### Node.js客户端测试

```javascript
// test-websocket.js
import io from 'socket.io-client';

const socket = io('http://localhost:8888');

socket.on('connect', () => {
  console.log('✅ WebSocket连接成功!');
  
  // 用户注册
  socket.emit('register', {
    uuid: 'test-user-uuid',
    username: 'testuser'
  });
  
  // 发送测试消息
  socket.emit('send_message', {
    to: 'another-user-uuid',
    content: '你好，这是一条测试消息！',
    contentType: 1,  // 文字消息
    messageType: 1    // 单聊
  });
});

// 监听消息
socket.on('message', (message) => {
  console.log('📨 收到消息:', message);
});

socket.on('error', (error) => {
  console.error('❌ WebSocket错误:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 WebSocket连接断开');
});
```

### 运行测试

```bash
# 安装socket.io-client
npm install socket.io-client

# 运行测试
node test-websocket.js
```

### 浏览器客户端测试

```html
<!-- websocket-test.html -->
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket测试</title>
    <script src="https://cdn.jsdelivr.net/npm/socket.io-client@4/dist/socket.io.js"></script>
</head>
<body>
    <div id="status">连接中...</div>
    <div id="messages"></div>
    
    <script>
        const socket = io('http://localhost:8888');
        const status = document.getElementById('status');
        const messages = document.getElementById('messages');
        
        socket.on('connect', () => {
            status.innerHTML = '✅ 连接成功';
            
            // 注册用户
            socket.emit('register', {
                uuid: 'test-browser-user',
                username: 'browser-user'
            });
        });
        
        socket.on('message', (msg) => {
            const div = document.createElement('div');
            div.innerHTML = `📨 收到: ${msg.content}`;
            messages.appendChild(div);
        });
        
        socket.on('error', (err) => {
            status.innerHTML = '❌ 连接错误';
            console.error(err);
        });
        
        // 测试发送消息
        function sendTestMessage() {
            socket.emit('send_message', {
                to: 'target-user-uuid',
                content: 'Hello from browser!',
                contentType: 1,
                commandType: 1
            });
        }
        
        // 5秒后发送测试消息
        setTimeout(sendTestMessage, 5000);
    </script>
</body>
</html>
```

---

## 📱 React Native客户端示例

### 基础React Native客户端

```jsx
// ReactNativeClient.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import io from 'socket.io-client';

const ChatClient = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // 初始化Socket连接
    const socketConnection = io('http://localhost:8888', {
      transports: ['websocket'],
      timeout: 10000,
    });

    // 连接事件
    socketConnection.on('connect', () => {
      console.log('✅ Socket连接成功');
      setConnected(true);
      
      // 用户注册
      socketConnection.emit('register', {
        uuid: 'rn-user-' + Date.now(),
        username: 'ReactNative用户'
      });
    });

    socketConnection.on('register_success', (data) => {
      console.log('用户注册成功:', data);
      setUserInfo(data);
    });

    // 接收消息
    socketConnection.on('message', (message) => {
      console.log('收到消息:', message);
      setMessages(prev => [...prev, message]);
    });

    // 错误处理
    socketConnection.on('error', (error) => {
      console.error('Socket错误:', error);
      Alert.alert('错误', error.message);
    });

    // 断开连接
    socketConnection.on('disconnect', () => {
      console.log('Socket连接断开');
      setConnected(false);
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // 发送消息
  const sendMessage = () => {
    if (!socket || !inputText.trim()) return;

    socket.emit('send_message', {
      to: 'target-user-uuid',
      content: inputText.trim(),
      contentType: 1, // 文字消息
      messageType: 1   // 单聊
    });

    setInputText('');
  };

  // 连接状态指示器
  const ConnectionStatus = () => (
    <View style={{padding: 10, backgroundColor: connected ? '#4CAF50' : '#F44336'}}>
      <Text style={{color: 'white', textAlign: 'center'}}>
        {connected ? '🟢 已连接' : '🔴 连接断开'}
      </Text>
    </View>
  );

  return (
    <View style={{flex: 1}}>
      <ConnectionStatus />
      
      {/* 用户信息 */}
      {userInfo && (
        <Text style={{padding: 10, backgroundColor: '#f0f0f0'}}>
          👤 用户: {userInfo.username} ({userInfo.uuid})
        </Text>
      )}
      
      {/* 消息列表 */}
      <ScrollView style={{flex: 1, padding: 10}}>
        {messages.map((msg, index) => (
          <View key={index} style={{
            padding: 10,
            backgroundColor: msg.fromUsername === 'ReactNative用户' ? '#E3F2FD' : '#F5F5F5',
            marginVertical: 2,
            borderRadius: 5
          }}>
            <Text style={{fontWeight: 'bold'}}>{msg.fromUsername}</Text>
            <Text>{msg.content}</Text>
            <Text style={{fontSize: 12, color: '#666'}}>
              {new Date(msg.timestamp).toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 输入框 */}
      <View style={{
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc'
      }}>
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 8,
            marginRight: 10
          }}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: '#2196F3',
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 8,
            justifyContent: 'center'
          }}
          disabled={!connected || !inputText.trim()}
        >
          <Text style={{color: 'white', fontWeight: 'bold'}}>发送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatClient;
```

### package.json依赖

```json
{
  "dependencies": {
    "socket.io-client": "^4.7.4",
    "react": "^18.0.0",
    "react-native": "^0.72.0"
  }
}
```

---

## 📞 WebRTC通话测试

### Web端WebRTC测试

```html
<!-- webrtc-test.html -->
<!DOCTYPE html>
<html>
<head>
    <title>WebRTC通话测试</title>
    <script src="https://cdn.jsdelivr.net/npm/socket.io-client@4/dist/socket.io.js"></script>
</head>
<body>
    <div>
        <h3>WebRTC通话测试</h3>
        <div>
            <input type="text" id="targetUser" placeholder="目标用户UUID" />
            <button onclick="startCall()">开始音频通话</button>
            <button onclick="startVideoCall()">开始视频通话</button>
            <button onclick="endCall()">结束通话</button>
        </div>
        
        <div>
            <video id="localVideo" autoplay muted style="width:300px;"></video>
            <video id="remoteVideo" autoplay style="width:300px;"></video>
        </div>
        
        <div id="status">未连接</div>
        <div id="messages"></div>
    </div>

    <script>
        const socket = io('http://localhost:8888');
        let peerConnection = null;
        let localStream = null;
        let currentSessionId = null;

        // WebRTC配置
        const pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        socket.on('connect', () => {
            document.getElementById('status').textContent = '已连接';
            
            // 注册用户
            socket.emit('register', {
                uuid: 'webrtc-test-user-' + Date.now(),
                username: 'WebRTC测试用户'
            });
        });

        // 处理呼叫请求
        socket.on('call_offer', async (data) => {
            const { from, offer, sessionId } = data;
            document.getElementById('status').textContent = `来电: ${from}`;
            
            const accept = confirm(`用户 ${from} 邀请您通话，是否接受？`);
            
            if (accept) {
                await handleIncomingCall(data);
            } else {
                socket.emit('call_answer', {
                    from: from,
                    sessionId: sessionId,
                    accepted: false
                });
            }
        });

        // 处理呼叫响应
        socket.on('call_answer', async (data) => {
            if (data.accepted) {
                document.getElementById('status').textContent = '通话已建立';
                await peerConnection.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            } else {
                document.getElementById('status').textContent = '通话被拒绝';
            }
        });

        // 处理ICE候选
        socket.on('ice_candidate', async (data) => {
            if (peerConnection && currentSessionId === data.sessionId) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        });

        // 处理通话状态
        socket.on('call_status', (data) => {
            document.getElementById('status').textContent = 
                `通话状态: ${data.status}, 时长: ${data.duration}秒`;
        });

        async function startCall() {
            await initiateCall('audio');
        }

        async function startVideoCall() {
            await initiateCall('video');
        }

        async function initiateCall(type) {
            const targetUser = document.getElementById('targetUser').value;
            if (!targetUser) {
                alert('请输入目标用户UUID');
                return;
            }

            try {
                // 获取媒体流
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: type === 'video'
                });

                document.getElementById('localVideo').srcObject = localStream;

                // 创建PeerConnection
                peerConnection = new RTCPeerConnection(pcConfig);
                
                // 添加本地流
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });

                // 处理远程流
                peerConnection.ontrack = (event) => {
                    document.getElementById('remoteVideo').srcObject = event.streams[0];
                };

                // ICE候选处理
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('ice_candidate', {
                            to: targetUser,
                            candidate: event.candidate,
                            sessionId: currentSessionId
                        });
                    }
                };

                // 创建Offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                currentSessionId = 'session_' + Date.now();

                // 发送通话邀请
                socket.emit('call_start', {
                    to: targetUser,
                    type: type,
                    sessionId: currentSessionId,
                    offer: offer
                });

                document.getElementById('status').text = '正在呼叫...';

            } catch (error) {
                console.error('启动通话失败:', error);
                alert('启动通话失败: ' + error.message);
            }
        }

        async function handleIncomingCall(data) {
            const { from, offer, sessionId } = data;

            try {
                // 获取媒体流
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: offer.sdp.includes('video') // 判断是否为视频通话
                });

                document.getElementById('localVideo').srcObject = localStream;

                // 创建PeerConnection
                peerConnection = new RTCPeerConnection(pcConfig);
                currentSessionId = sessionId;

                // 添加本地流
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });

                // 处理远程流
                peerConnection.ontrack = (event) => {
                    document.getElementById('remoteVideo').srcObject = event.streams[0];
                };

                // ICE候选处理
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('ice_candidate', {
                            to: from,
                            candidate: event.candidate,
                            sessionId: sessionId
                        });
                    }
                };

                // 设置远程描述
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

                // 创建Answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                // 发送接听响应
                socket.emit('call_answer', {
                    from: from,
                    sessionId: sessionId,
                    accepted: true,
                    answer: answer
                });

                document.getElementById('status').textContent = '通话已接听';

            } catch (error) {
                console.error('接听通话失败:', error);
                
                socket.emit('call_answer', {
                    from: from,
                    sessionId: sessionId,
                    accepted: false
                });
            }
        }

        async function endCall() {
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }

            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }

            if (currentSessionId) {
                socket.emit('call_end', {
                    sessionId: currentSessionId
                });
                currentSessionId = null;
            }

            document.getElementById('status').textContent = '通话已结束';
            document.getElementById('localVideo').srcObject = null;
            document.getElementById('remoteVideo').srcObject = null;
        }
    </script>
</body>
</html>
```

---

## ❓ 常见问题

### Q: 数据库连接失败

```bash
# 检查MySQL服务
sudo systemctl status mysql
sudo systemctl start mysql

# 检查数据库配置
mysql -u root -p
CREATE DATABASE chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 检查.env配置
cat .env | grep DB_
```

### Q: WebSocket连接失败

```bash
# 检查端口占用
netstat -tlnp | grep 8888

# 检查防火墙
sudo ufw status
sudo ufw allow 8888

# 测试连接
telnet localhost 8888
```

### Q: 文件上传失败

```bash
# 检查uploads目录权限
ls -la uploads/
sudo chmod 755 uploads/
sudo chown -R $USER:$USER uploads/

# 检查文件大小限制
echo "上传文件大小限制: 10MB"
```

### Q: WebRTC通话无法建立

```javascript
// 检查浏览器支持
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('浏览器不支持WebRTC');
    return;
}

// 检查HTTPS (生产环境要求)
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert('WebRTC需要HTTPS环境');
    return;
}
```

### Q: 内存占用过高

```bash
# 检查Node.js内存使用
ps aux | grep node

# PM2集群模式
pm2 start ecosystem.config.js --instances max

# 增加内存限制
node --max-old-space-size=2048 src/server.js
```

---

## 🎯 下一步

1. **📖 查看完整文档**: 阅读 `API_DOCUMENTATION.md`
2. **🚀 部署到生产环境**: 参考 `DEPLOYMENT_GUIDE.md`
3. **🧪 运行测试**: `npm test`
4. **📊 监控性能**: 访问 `/api/admin/database/health`

**🎉 你已经成功完成快速体验！现在可以开始构建你的聊天应用了！**
