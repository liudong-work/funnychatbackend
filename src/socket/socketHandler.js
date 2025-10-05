import { log } from '../config/logger.js';
import { MessageHandler } from './messageHandler.js';
import { WebRTCHandler } from './webrtcHandler.js';
import { WS_EVENTS } from '../utils/constants.js';

/**
 * Socket.IO处理器 - 模仿Go版本的核心逻辑
 */
export const setupSocketHandlers = (io, connectedUsers) => {
  // 初始化消息处理器
  const messageHandler = new MessageHandler(io, connectedUsers);
  
  // 初始化WebRTC处理器
  const webrtcHandler = new WebRTCHandler(io, connectedUsers);

  io.on('connection', (socket) => {
    log.info(`新用户连接: ${socket.id}`);

    // 处理用户注册 - 模仿Go版本的Register机制
    socket.on('register', (userData) => {
      const { uuid, username } = userData;
      
      if (!uuid) {
        socket.emit('error', { message: '用户UUID不能为空' });
        return;
      }

      // 将用户添加到连接映射中 - 模仿Go版本的 Clients map
      connectedUsers.set(uuid, socket);
      socket.userUuid = uuid;
      socket.username = username;

      log.info(`用户注册成功: ${username} (${uuid})`);

      // 发送欢迎消息 - 模仿Go版本的系统消息
      socket.emit('welcome', {
        from: 'System',
        fromUsername: '系统',
        content: '欢迎加入聊天！',
        type: 'system'
      });

      // 广播用户上线状态给好友
      socket.broadcast.emit('user_online', {
        uuid: uuid,
        username: username,
        status: 'online'
      });
    });

    // 处理消息发送 - 模仿Go版本的Broadcast处理
    socket.on('send_message', async (messageData) => {
      try {
        log.info('收到消息:', JSON.stringify(messageData, null, 2));
        
        // 验证用户身份
        if (!socket.userUuid) {
          socket.emit('error', { message: '未注册用户' });
          return;
        }

        // 添加发送者信息
        messageData.fromUsername = socket.username;
        messageData.from = socket.userUuid;

        // 处理消息分发
        const result = await messageHandler.handleMessage(messageData);
        
        // 发送确认消息给发送者
        socket.emit('message_sent', {
          success: true,
          messageId: result.from ? result.timestamp : Date.now(),
          data: result
        });

      } catch (error) {
        log.error('消息处理失败:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // 处理心跳检测 - 增强心跳机制
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // 处理心跳 - 模仿Go版本的Ping机制
    socket.on('heartbeat', () => {
      socket.isAlive = true;
      socket.emit('heartbeat_ack');
    });

    // 处理加入房间/群组
    socket.on('join_room', (roomData) => {
      const { roomId, roomType } = roomData;
      socket.join(roomId);
      log.info(`用户 ${socket.userUuid} 加入房间: ${roomId}`);
      
      // 通知房间成员有用户加入
      socket.to(roomId).emit('user_joined', {
        userUuid: socket.userUuid,
        username: socket.username,
        roomId: roomId
      });
    });

    // 处理离开房间
    socket.on('leave_room', (roomData) => {
      const { roomId } = roomData;
      socket.leave(roomId);
      log.info(`用户 ${socket.userUuid} 离开房间: ${roomId}`);
      
      // 通知房间成员有用户离开
      socket.to(roomId).emit('user_left', {
        userUuid: socket.userUuid,
        username: socket.username,
        roomId: roomId
      });
    });

    // 处理断开连接 - 模仿Go版本的Ungister机制
    socket.on('disconnect', (reason) => {
      log.info(`用户断开连接: ${socket.userUuid || socket.id}, 原因: ${reason}`);

      // 广播用户下线状态
      if (socket.userUuid) {
        socket.broadcast.emit('user_offline', {
          uuid: socket.userUuid,
          username: socket.username,
          status: 'offline'
        });

        // 从连接映射中移除 - 模仿Go版本的delete操作
        connectedUsers.delete(socket.userUuid);
        
        log.info(`用户已从连接池移除: ${socket.userUuid}`);
      }
    });

    // 错误处理
    socket.on('error', (error) => {
      log.error(`Socket错误: ${socket.userUuid || socket.id}`, error);
    });
  });

  // 心跳检测机制 - 模仿Go版本的连接保持
  setInterval(() => {
    io.sockets.sockets.forEach((socket) => {
      if (!socket.isAlive && socket.userUuid) {
        log.info(`用户长时间无响应，断开连接: ${socket.userUuid}`);
        socket.disconnect();
      }
      socket.isAlive = false;
      socket.emit('ping');
    });
  }, 30000); // 30秒心跳检测

  // 启动WebRTC处理器
  webrtcHandler.setupWebRTCHandler();
  
  log.info('Socket.IO处理器初始化完成');
};