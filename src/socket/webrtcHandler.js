import { log } from '../config/logger.js';

/**
 * WebRTC信令处理器
 * 处理P2P音视频通话服务
 */
export class WebRTCHandler {
  constructor(io, connectedUsers) {
    this.io = io;
    this.connectedUsers = connectedUsers;
    this.calls = new Map(); // 存储呼叫会话
    this.callRooms = new Map(); // 存储通话房间
  }

  /**
   * 初始化WebRTC处理器
   */
  setupWebRTCHandler() {
    this.io.on('connection', (socket) => {
      
      // 发起语音/视频通话
      socket.on('call_start', (callData) => {
        this.handleCallStart(socket, callData);
      });

      // 接听通话
      socket.on('call_answer', (answerData) => {
        this.handleCallAnswer(socket, answerData);
      });

      // ICE候选交换
      socket.on('ice_candidate', (iceData) => {
        this.handleIceCandidate(socket, iceData);
      });

      // 呼叫被拒绝
      socket.on('call_reject', (rejectData) => {
        this.handleCallReject(socket, rejectData);
      });

      // 挂断通话
      socket.on('call_hangup', (hangupData) => {
        this.handleCallHangup(socket, hangupData);
      });

      // 加入通话房间
      socket.on('join_call_room', (roomData) => {
        this.handleJoinCallRoom(socket, roomData);
      });

      // 离开通话房间
      socket.on('leave_call_room', (roomData) => {
        this.handleLeaveCallRoom(socket, roomData);
      });

      // 屏幕共享请求
      socket.on('screen_share_request', (shareData) => {
        this.handleScreenShareRequest(socket, shareData);
      });

      // 屏幕共享响应
      socket.on('screen_share_response', (responseData) => {
        this.handleScreenShareResponse(socket, responseData);
      });
    });

    log.info('WebRTC处理器初始化完成');
  }

  /**
   * 处理发起通话
   */
  async handleCallStart(socket, callData) {
    try {
      const { to, callType, callId } = callData;
      const from = socket.userUuid;

      // 创建通话会话
      const callSession = {
        callId: callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: from,
        to: to,
        type: callType, // 'audio' 或 'video'
        status: 'calling',
        createdAt: new Date()
      };

      this.calls.set(callSession.callId, callSession);

      // 发送通话请求给目标用户
      const targetSocket = this.connectedUsers.get(to);
      if (targetSocket) {
        targetSocket.emit('call_incoming', {
          callId: callSession.callId,
          from: from,
          fromUsername: socket.username,
          callType: callType,
          timestamp: callSession.createdAt
        });

        log.info(`通话请求已发送: ${from} -> ${to}, 类型: ${callType}`);
        
        socket.emit('call_status', {
          callId: callSession.callId,
          status: 'ringing'
        });

      } else {
        // 目标用户离线
        socket.emit('call_status', {
          callId: callSession.callId,
          status: 'offline',
          message: '对方用户离线'
        });

        this.calls.delete(callSession.callId);
      }

    } catch (error) {
      log.error('处理通话请求失败:', error);
      socket.emit('call_error', {
        message: '发起通话失败',
        error: error.message
      });
    }
  }

  /**
   * 处理接听通话
   */
  async handleCallAnswer(socket, answerData) {
    try {
      const { callId, answer, sdp } = answerData;

      const callSession = this.calls.get(callId);
      if (!callSession) {
        socket.emit('call_error', {
          message: '通话会话不存在'
        });
        return;
      }

      if (answer) {
        // 接受通话
        callSession.status = 'connected';
        callSession.answerer = socket.userUuid;

        // 通知发起方
        const callerSocket = this.connectedUsers.get(callSession.from);
        if (callerSocket) {
          callerSocket.emit('call_answered', {
            callId: callId,
            sdp: sdp,
            answerer: socket.userUuid
          });
        }

        // 创建通话房间
        const roomId = `call_${callId}`;

        // 将双方加入房间
        if (callerSocket) {
          callerSocket.join(roomId);
        }
        socket.join(roomId);

        this.callRooms.set(roomId, {
          callId: callId,
          participants: [callSession.from, socket.userUuid],
          createdAt: new Date()
        });

        log.info(`通话建立成功: ${callId}`);

      } else {
        // 拒绝通话
        callSession.status = 'rejected';
        
        const callerSocket = this.connectedUsers.get(callSession.from);
        if (callerSocket) {
          callerSocket.emit('call_rejected', {
            callId: callId,
            rejecter: socket.userUuid
          });
        }

        this.calls.delete(callId);
        log.info(`通话被拒绝: ${callId}`);
      }

    } catch (error) {
      log.error('处理通话应答失败:', error);
      socket.emit('call_error', {
        message: '处理通话应答失败',
        error: error.message
      });
    }
  }

  /**
   * 处理ICE候选交换
   */
  handleIceCandidate(socket, iceData) {
    try {
      const { callId, candidate, target } = iceData;

      if (typeof candidate === 'undefined' || !candidate) {
        socket.emit('call_error', { message: 'ICE候选无效' });
        return;
      }

      const callSession = this.calls.get(callId);
      if (!callSession) {
        socket.emit('call_error', { message: '通话会话不存在' });
        return;
      }

      // 转发ICE候选给目标用户
      const targetSocket = this.connectedUsers.get(target);
      if (targetSocket) {
        // 确保目标用户在同一个通话中
        const roomId = `call_${callId}`;
        if (this.callRooms.has(roomId)) {
          targetSocket.to(roomId).emit('ice_candidate', {
            callId: callId,
            candidate: candidate,
            sender: socket.userUuid
          });
        }
      }

      log.debug(`ICE候选交换: ${socket.userUuid} -> ${target}`);

    } catch (error) {
      log.error('处理ICE候选失败:', error);
      socket.emit('call_error', {
        message: 'ICE候选处理失败',
        error: error.message
      });
    }
  }

  /**
   * 处理拒绝通话
   */
  handleCallReject(socket, rejectData) {
    try {
      const { callId } = rejectData;

      const callSession = this.calls.get(callId);
      if (callSession) {
        callSession.status = 'rejected';
        
        const callerSocket = this.connectedUsers.get(callSession.from);
        if (callerSocket) {
          callerSocket.emit('call_rejected', {
            callId: callId,
            rejecter: socket.userUuid
          });
        }

        this.calls.delete(callId);
        log.info(`通话被拒绝: ${callId} by ${socket.userUuid}`);
      }

    } catch (error) {
      log.error('处理通话拒绝失败:', error);
      socket.emit('call_error', {
        message: '处理通话拒绝失败',
        error: error.message
      });
    }
  }

  /**
   * 处理挂断通话
   */
  handleCallHangup(socket, hangupData) {
    try {
      const { callId } = hangupData;

      const callSession = this.calls.get(callId);
      if (callSession) {
        callSession.status = 'ended';
        callSession.endedAt = new Date();

        // 通知通话参与者
        const roomId = `call_${callId}`;
        socket.to(roomId).emit('call_ended', {
          callId: callId,
          ender: socket.userUuid,
          duration: this.calculateCallDuration(callSession)
        });

        // 清理房间和会话
        this.cleanupCallSession(callId);

        log.info(`通话结束: ${callId} by ${socket.userUuid}`);

      } else {
        socket.emit('call_error', {
          message: '通话会话不存在'
        });
      }

    } catch (error) {
      log.error('处理通话挂断失败:', error);
      socket.emit('call_error', {
        message: '处理通话挂断失败',
        error: error.message
      });
    }
  }

  /**
   * 计算通话时长
   */
  calculateCallDuration(callSession) {
    const endTime = callSession.endedAt || new Date();
    return endTime.getTime() - callSession.createdAt.getTime();
  }

  /**
   * 清理通话会话
   */
  cleanupCallSession(callId) {
    // 移除通话会话
    this.calls.delete(callId);
    
    // 移除通话房间
    const roomId = `call_${callId}`;
    this.callRooms.delete(roomId);
    
    // 通知所有相关人员离开房间
    this.io.to(roomId).emit('end_call', { callId: callId });
    
    log.info(`通话会话已清理: ${callId}`);
  }

  /**
   * 处理屏幕共享请求
   */
  handleScreenShareRequest(socket, shareData) {
    try {
      const { to, shareId } = shareData;
      
      const targetSocket = this.connectedUsers.get(to);
      if (targetSocket) {
        targetSocket.emit('screen_share_request', {
          from: socket.userUuid,
          fromUsername: socket.username,
          shareId: shareId || `share_${Date.now()}`,
          timestamp: new Date()
        });
        
        log.info(`屏幕共享请求已发送: ${socket.userUuid} -> ${to}`);
      } else {
        socket.emit('call_error', {
          message: '目标用户离线，无法请求屏幕共享'
        });
      }

    } catch (error) {
      log.error('处理屏幕共享请求失败:', error);
      socket.emit('call_error', {
        message: '屏幕共享请求失败',
        error: error.message
      });
    }
  }

  /**
   * 获取通话统计信息
   */
  getCallStats() {
    return {
      activeCalls: this.calls.size,
      activeRooms: this.callRooms.size,
      totalCalls: this.calls.size + Array.from(this.calls.values())
        .filter(call => call.status === 'ended' || call.status === 'rejected').length
    };
  }
}
