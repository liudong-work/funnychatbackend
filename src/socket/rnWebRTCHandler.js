import { log } from '../config/logger.js';

/**
 * React Native WebRTC处理器
 * 专门为移动端设计的WebRTC信令服务
 */
export class RNWebRTCHandler {
  constructor(io, connectedUsers) {
    this.io = io;
    this.connectedUsers = connectedUsers;
    this.activeCalls = new Map(); // 活跃通话
    this.callRooms = new Map();   // 通话房间
    this.mobileUsers = new Set(); // 移动端用户
  }

  /**
   * 初始化React Native WebRTC处理器
   */
  setupRNWebRTCHandler() {
    this.io.on('connection', (socket) => {
      
      // React Native客户端注册
      socket.on('rn_client_register', (clientData) => {
        this.handleRNClientRegister(socket, clientData);
      });

      // 发起音视频通话 - React Native适配
      socket.on('call_start', (callData) => {
        this.handleCallStart(socket, callData);
      });

      // 接听通话
      socket.on('call_answer', (answerData) => {
        this.handleCallAnswer(socket, answerData);
      });

      // ICE候选交换 - React Native优化
      socket.on('ice_candidate', (iceData) => {
        this.handleIceCandidate(socket, iceData);
      });

      // React Native特定的媒体流事件
      socket.on('rn_stream_change', (streamData) => {
        this.handleStreamChange(socket, streamData);
      });

      // React Native屏幕录制
      socket.on('rn_screen_recording', (recordingData) => {
        this.handleScreenRecording(socket, recordingData);
      });

      // React Native通话状态同步
      socket.on('rn_call_state', (stateData) => {
        this.handleRNCallState(socket, stateData);
      });

      // React Native网络状态变化
      socket.on('rn_network_change', (networkData) => {
        this.handleRNNetworkChange(socket, networkData);
      });

      // 处理断开连接
      socket.on('disconnect', () => {
        this.handleRNDisconnect(socket);
      });
    });

    log.info('React Native WebRTC处理器初始化完成');
  }

  /**
   * React Native客户端注册
   */
  handleRNClientRegister(socket, clientData) {
    try {
      const { uuid, username, deviceType, osVersion, webrtcSupport } = clientData;
      
      // 标记为移动端用户
      this.mobileUsers.add(uuid);
      
      // 存储设备信息
      socket.userUuid = uuid;
      socket.username = username;
      socket.deviceType = deviceType || 'mobile';
      socket.osVersion = osVersion;
      socket.webrtcSupport = webrtcSupport || false;

      log.info(`React Native客户端注册: ${username} (${deviceType}, WebRTC: ${webrtcSupport})`);

      // 发送注册确认
      socket.emit('rn_client_registered', {
        success: true,
        features: {
          voiceCall: true,
          videoCall: webrtcSupport,
          screenShare: webrtcSupport && deviceType !== 'ios', // iOS限制
          fileTransfer: true
        }
      });

    } catch (error) {
      log.error('React Native客户端注册失败:', error);
      socket.emit('rn_client_error', { message: '注册失败' });
    }
  }

  /**
   * React Native优化版的通话发起
   */
  handleCallStart(socket, callData) {
    try {
      const { to, callType, callId, deviceInfo } = callData;
      
      if (!socket.userUuid) {
        socket.emit('call_error', { message: '客户端未注册' });
        return;
      }

      // 为React Native优化通话配置
      const callSession = {
        callId: callId || `rn_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: socket.userUuid,
        to: to,
        type: callType, // 'audio' | 'video'
        status: 'calling',
        platform: 'react-native',
        deviceInfo: deviceInfo || {},
        createdAt: new Date()
      };

      this.activeCalls.set(callSession.callId, callSession);

      // 发送给目标用户 - React Native格式化
      const targetSocket = this.connectedUsers.get(to);
      if (targetSocket) {
        targetSocket.emit('call_incoming', {
          callId: callSession.callId,
          from: socket.userUuid,
          fromUsername: socket.username,
          callType: callType,
          platform: 'react-native',
          timestamp: callSession.createdAt,
          // React Native特定配置
          rnConfig: {
            audioSettings: this.getRNAudioSettings(callType),
            videoSettings: this.getRNVideoSettings(callType),
            networkConfig: this.getRNNetworkConfig()
          }
        });

        log.info(`React Native通话请求: ${socket.username} -> ${to} (${callType})`);
        
        socket.emit('call_status', {
          callId: callSession.callId,
          status: 'ringing',
          rnStatus: 'waiting_for_answer'
        });

      } else {
        socket.emit('call_status', {
          callId: callSession.callId,
          status: 'offline',
          message: '目标用户离线',
          rnStatus: 'target_unavailable'
        });

        this.activeCalls.delete(callSession.callId);
      }

    } catch (error) {
      log.error('React Native通话发起失败:', error);
      socket.emit('call_error', {
        message: '发起通话失败',
        error: error.message,
        rnError: 'call_init_failed'
      });
    }
  }

  /**
   * React Native接听处理
   */
  handleCallAnswer(socket, answerData) {
    try {
      const { callId, accept, sdp, rnStreamInfo } = answerData;

      const callSession = this.activeCalls.get(callId);
      if (!callSession) {
        socket.emit('call_error', { message: '通话会话不存在', rnError: 'invalid_call_session' });
        return;
      }

      if (accept) {
        // 接受通话 - React Native格式
        callSession.status = 'connected';
        callSession.answerer = socket.userUuid;
        callSession.rnStreamInfo = rnStreamInfo || {};

        // 创建React Native优化房间
        const roomId = `rn_call_${callId}`;
        
        const callerSocket = this.connectedUsers.get(callSession.from);
        if (callerSocket) {
          callerSocket.emit('call_answered', {
            callId: callId,
            sdp: sdp,
            answerer: socket.userUuid,
            platform: 'react-native',
            rnAnswer: {
              sdp: sdp,
              streamInfo: rnStreamInfo,
              deviceCapabilities: {
                video: socket.webrtcSupport,
                audio: true,
                screenShare: socket.webrtcSupport && socket.deviceType !== 'ios'
              }
            }
          });
        }

        // 加入房间 - 双方
        if (callerSocket) callerSocket.join(roomId);
        socket.join(roomId);

        this.callRooms.set(roomId, {
          callId: callId,
          roomType: 'react-native',
          participants: [callSession.from, socket.userUuid],
          createdAt: new Date(),
          rnConfig: {
            audioCodec: 'opus',
            videoCodec: socket.webrtcSupport ? 'h264' : null,
            bandwidth: this.getRNBandwidthSettings(socket.deviceType)
          }
        });

        log.info(`React Native通话建立: ${callId}`);

      } else {
        // 拒绝通话
        callSession.status = 'rejected';
        
        const callerSocket = this.connectedUsers.get(callSession.from);
        if (callerSocket) {
          callerSocket.emit('call_rejected', {
            callId: callId,
            rejecter: socket.userUuid,
            platform: 'react-native',
            rnRejectReason: answerData.reason || 'user_declined'
          });
        }

        this.activeCalls.delete(callId);
      }

    } catch (error) {
      log.error('React Native通话应答失败:', error);
      socket.emit('call_error', {
        message: '处理通话应答失败',
        rnError: 'call_answer_failed'
      });
    }
  }

  /**
   * React Native ICE候选优化处理
   */
  handleIceCandidate(socket, iceData) {
    try {
      const { callId, candidate, target, rnCandidateType } = iceData;

      const callSession = this.activeCalls.get(callId);
      if (!callSession) {
        socket.emit('call_error', { message: '通话会话不存在', rnError: 'invalid_call_state' });
        return;
      }

      // React Native优化ICE传输
      const targetSocket = this.connectedUsers.get(target);
      if (targetSocket) {
        const roomId = `rn_call_${callId}`;
        if (this.callRooms.has(roomId)) {
          targetSocket.to(roomId).emit('ice_candidate', {
            callId: callId,
            candidate: candidate,
            sender: socket.userUuid,
            platform: 'react-native',
            rnCandidate: {
              candidate: candidate,
              sdpMLineIndex: iceData.sdpMLineIndex,
              sdpMid: iceData.sdpMid,
              candidateType: rnCandidateType || 'unknown'
            }
          });
        }
      }

      log.debug(`React Native ICE候选: ${socket.userUuid} -> ${target} (${rnCandidateType})`);

    } catch (error) {
      log.error('React Native ICE处理失败:', error);
      socket.emit('call_error', {
        message: 'ICE候选处理失败',
        rnError: 'ice_candidate_error'
      });
    }
  }

  /**
   * 处理React Native媒体流变化
   */
  handleStreamChange(socket, streamData) {
    try {
      const { callId, streamType, enabled, quality } = streamData;
      
      const roomId = `rn_call_${callId}`;
      const callSession = this.activeCalls.get(callId);

      if (callSession && this.callRooms.has(roomId)) {
        // 通知房间其他成员媒体流状态变化
        socket.to(roomId).emit('rn_stream_changed', {
          callId: callId,
          sender: socket.userUuid,
          streamType: streamType, // 'audio' | 'video'
          enabled: enabled,
          quality: quality,
          timestamp: new Date()
        });

        log.info(`React Native媒体流变化: ${socket.userUuid} ${streamType} ${enabled ? '启用' : '禁用'}`);
      }

    } catch (error) {
      log.error('React Native媒体流处理失败:', error);
    }
  }

  /**
   * React Native组件回调处理
   */
  handleRNDisconnect(socket) {
    try {
      if (socket.userUuid) {
        // 清理React Native客户端相关的通话
        for (const [callId, call] of this.activeCalls) {
          if (call.from === socket.userUuid || call.to === socket.userUuid) {
            this.cleanupRNCallSession(callId, socket.userUuid);
          }
        }

        this.mobileUsers.delete(socket.userUuid);
        log.info(`React Native客户端断开: ${socket.username || socket.userUuid}`);
      }

    } catch (error) {
      log.error('React Native断开连接处理失败:', error);
    }
  }

  /**
   * React Native特定配置
   */
  getRNAudioSettings(callType) {
    return {
      codec: 'opus',
      sampleRate: 16000,
      channels: 1,
      bitrate: 32000, // 32kbps for mobile
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
  }

  getRNVideoSettings(callType) {
    return {
      codec: 'h264',
      resolution: { width: 640, height: 480 },
      framerate: 15,
      bitrate: 300000, // 300kbps for mobile
      keyFrameInterval: 30
    };
  }

  getRNNetworkConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
  }

  getRNBandwidthSettings(deviceType) {
    const configs = {
      'android': { audio: 32000, video: 300000 },
      'ios': { audio: 32000, video: 250000 },
      'mobile': { audio: 28000, video: 200000 }
    };
    return configs[deviceType] || configs.mobile;
  }

  /**
   * React Native通话会话清理
   */
  cleanupRNCallSession(callId, userUuid) {
    try {
      const callSession = this.activeCalls.get(callId);
      if (callSession) {
        callSession.status = 'ended';
        callSession.endedAt = new Date();

        // 通知通话参与者
        const roomId = `rn_call_${callId}`;
        this.io.to(roomId).emit('call_ended', {
          callId: callId,
          ender: userUuid,
          platform: 'react-native',
          duration: this.calculateRNCallDuration(callSession),
          rnEndReason: 'user_disconnected'
        });

        // 清理房间和会话
        this.activeCalls.delete(callId);
        this.callRooms.delete(roomId);
        
        log.info(`React Native通话会话清理: ${callId}`);
      }

    } catch (error) {
      log.error('React Native通话清理失败:', error);
    }
  }

  calculateRNCallDuration(callSession) {
    const endTime = callSession.endedAt || new Date();
    return endTime.getTime() - callSession.createdAt.getTime();
  }

  /**
   * 获取React Native通话统计
   */
  getRNCallStats() {
    return {
      totalRNCalls: this.activeCalls.size,
      activeRNRooms: this.callRooms.size,
      mobileUsers: this.mobileUsers.size,
      platformDistribution: {
        android: 0,
        ios: 0,
        other: 0
      }
    };
  }
}
