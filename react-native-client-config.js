/**
 * React Native 客户端配置示例
 * 用于在React Native中连接此聊天后端
 */

import io from 'socket.io-client';

// React Native WebRTC支持检查
const checkWebRTCSupport = async () => {
  try {
    // 检查是否支持WebRTC
    const hasWebRTC = typeof RTCPeerConnection !== 'undefined';
    const hasWebSocket = typeof WebSocket !== 'undefined';
    
    return {
      webrtc: hasWebRTC,
      websocket: hasWebSocket,
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
    };
  } catch (error) {
    return {
      webrtc: false,
      websocket: false,
      platform: 'unknown'
    };
  }
};

// React Native Socket.IO客户端配置
export class ReactNativeChatClient {
  constructor(config) {
    this.serverUrl = config.serverUrl || 'http://localhost:8888';
    this.userId = config.userId;
    this.username = config.username;
    this.deviceInfo = config.deviceInfo || {};
    
    this.socket = null;
    this.isConnected = false;
    this.webrtcSupport = false;
    
    this.init();
  }

  async init() {
    try {
      // 检查WebRTC支持
      const supports = await checkWebRTCSupport();
      this.webrtcSupport = supports.webrtc;
      
      // 连接Socket.IO服务器
      this.socket = io(this.serverUrl, {
        transports: ['websocket'], // React Native优先使用WebSocket
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.setupEventListeners();
      
      // 注册React Native客户端
      this.registerRNClient();

    } catch (error) {
      console.error('React Native客户端初始化失败:', error);
    }
  }

  async registerRNClient() {
    this.socket.emit('rn_client_register', {
      uuid: this.userId,
      username: this.username,
      deviceType: this.deviceInfo.type || 'mobile',
      osVersion: this.deviceInfo.osVersion || 'unknown',
      webrtcSupport: this.webrtcSupport,
      deviceInfo: {
        ...this.deviceInfo,
        platform: 'react-native'
      }
    });
  }

  setupEventListeners() {
    // 连接成功
    this.socket.on('connect', () => {
      console.log('Socket连接成功');
      this.isConnected = true;
    });

    // 注册确认
    this.socket.on('rn_client_registered', (data) => {
      console.log('React Native客户端注册成功:', data);
    });

    // 通话相关事件
    this.socket.on('call_incoming', (data) => {
      this.handleIncomingCall(data);
    });

    this.socket.on('call_answered', (data) => {
      this.handleCallAnswered(data);
    });

    this.socket.on('call_rejected', (data) => {
      this.handleCallRejected(data);
    });

    this.socket.on('ice_candidate', (data) => {
      this.handleIceCandidate(data);
    });

    // 断开连接
    this.socket.on('disconnect', () => {
      console.log('Socket连接断开');
      this.isConnected = false;
    });

    // 错误处理
    this.socket.on('rn_client_error', (error) => {
      console.error('React Native客户端错误:', error);
    });
  }

  // WebRTC通话功能
  async startCall(targetUserId, callType = 'audio') {
    if (!this.webrtcSupport && callType === 'video') {
      throw new Error('设备不支持视频通话');
    }

    const callId = `rn_call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.socket.emit('call_start', {
      to: targetUserId,
      callType: callType,
      callId: callId,
      platform: 'react-native',
      deviceInfo: this.deviceInfo
    });

    return callId;
  }

  handleIncomingCall(callData) {
    // React Native中处理来电
    console.log('来电:', callData.fromUsername);
    
    // 这里应该显示通话界面
    if (callData.callType === 'video') {
      console.log('视频通话请求');
    } else {
      console.log('音频通话请求');
    }
  }

  handleCallAnswered(callData) {
    // 处理通话接听
    console.log('通话被接听:', callData.callId);
    
    // 开始WebRTC协商
    this.startWebRTCProcess(callData);
  }

  handleCallRejected(callData) {
    // 处理通话拒绝
    console.log('通话被拒绝:', callData.callId);
  }

  handleIceCandidate(candidateData) {
    // 处理ICE候选
    console.log('收到ICE候选:', candidateData);
    
    // 添加到PeerConnection
    if (this.peerConnection) {
      this.peerConnection.addIceCandidate(candidateData.candidate);
    }
  }

  // WebRTC处理 - React Native简化版
  async startWebRTCProcess(callData) {
    try {
      if (this.webrtcSupport) {
        // 创建RTCPeerConnection
        this.peerConnection = new RTCPeerConnection();
        
        // 配置音频/视频轨道
        if (callData.callType === 'video') {
          // 获取视频流
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
          });
        } else {
          // 仅音频
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          stream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, stream);
          });
        }

        // ICE候选处理
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.socket.emit('ice_candidate', {
              callId: callData.callId,
              candidate: event.candidate,
              target: callData.from,
              platform: 'react-native',
              rnCandidateType: 'local'
            });
          }
        };

      } else {
        // 使用备用方案：仅音频通话
        console.log('WebRTC不支持，使用音频流');
        this.startAssetFallback(callData);
      }

    } catch (error) {
      console.error('WebRTC启动失败:', error);
    }
  }

  // WebRTC不支持时的音频回退方案
  async startAudioFallback(callData) {
    // 使用Web Audio API进行音频处理
    console.log('使用音频回退方案');
    
    // 这里可以实现简单的音频流传送
    // 比如使用WebSocket传输音频数据
  }

  // 消息发送
  sendMessage(targetUserId, messageContent) {
    if (!this.isConnected) {
      throw new Error('未连接到服务器');
    }

    this.socket.emit('send_message', {
      to: targetUserId,
      content: messageContent,
      contentType: 1, // 文字消息
      messageType: 1  // 单聊
    });
  }

  // 文件上传
  async uploadFile(file, targetUserId, contentType = 2) {
    const fileData = await this.fileToUint8Array(file);
    
    this.socket.emit('send_message', {
      to: targetUserId,
      content: file.name,
      contentType: contentType,
      messageType: 1,
      file: fileData
    });
  }

  // React Native文件转Uint8Array
  async fileToUint8Array(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// 使用示例
export const createRNChatClient = (config) => {
  return new ReactNativeChatClient(config);
};

// React Native环境检测
export const isReactNative = () => {
  return typeof navigator !== 'undefined' && 
         navigator.product === 'ReactNative';
};

// WebRTC支持检测
export const supportsWebRTC = () => {
  return {
    peerConnection: typeof RTCPeerConnection !== 'undefined',
    mediaDevices: typeof navigator !== 'undefined' && 
                  typeof navigator.mediaDevices !== 'undefined',
    webSocket: typeof WebSocket !== 'undefined'
  };
};
