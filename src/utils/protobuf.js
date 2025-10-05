import protobuf from 'protobufjs';

/**
 * Protocol Buffer 工具类
 * 提供消息序列化和反序列化功能，与Go版本保持兼容
 */

class ProtobufUtils {
  constructor() {
    this.Message = null;
    this.User = null;
    this.Group = null;
    this.loaded = false;
  }

  /**
   * 加载protobuf定义
   */
  async loadProtobufDefinitions() {
    try {
      // 动态加载protobuf定义
      const root = await protobuf.load('proto/message.proto');
      
      // 获取消息类型
      this.Message = root.lookupType('protocol.Message');
      this.User = root.lookupType('protocol.User');
      this.Group = root.lookupType('protocol.Group');
      
      this.loaded = true;
      
      console.log('Protobuf定义加载成功');
    } catch (error) {
      console.error('Protobuf定义加载失败:', error);
      throw error;
    }
  }

  /**
   * 序列化消息为二进制 - 模仿Go版本的proto.Marshal
   */
  async encodeMessage(messageData) {
    try {
      if (!this.loaded) {
        await this.loadProtobufDefinitions();
      }

      // 验证消息数据
      const errMsg = this.Message.verify(messageData);
      if (errMsg) {
        throw new Error(`消息验证失败: ${errMsg}`);
      }

      // 创建消息实例
      const message = this.Message.create(messageData);

      // 编码为二进制
      const buffer = this.Message.encode(message).finish();
      
      return buffer;
    } catch (error) {
      throw new Error(`消息编码失败: ${error.message}`);
    }
  }

  /**
   * 反序列化二进制为消息 - 模仿Go版本的proto.Unmarshal
   */
  async decodeMessage(buffer) {
    try {
      if (!this.loaded) {
        await this.loadProtobufDefinitions();
      }

      // 解码二进制数据
      const message = this.Message.decode(buffer);
      
      // 转换为普通对象
      return this.Message.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true
      });
    } catch (error) {
      throw new Error(`消息解码失败: ${error.message}`);
    }
  }

  /**
   * 序列化用户信息
   */
  async encodeUser(userData) {
    try {
      if (!this.loaded) {
        await this.loadProtobufDefinitions();
      }

      const errMsg = this.User.verify(userData);
      if (errMsg) {
        throw new Error(`用户数据验证失败: ${errMsg}`);
      }

      const user = this.User.create(userData);
      const buffer = this.User.encode(user).finish();
      
      return buffer;
    } catch (error) {
      throw new Error(`用户编码失败: ${error.message}`);
    }
  }

  /**
   * 反序列化用户信息
   */
  async decodeUser(buffer) {
    try {
      if (!this.loaded) {
        await this.loadProtobufDefinitions();
      }

      const user = this.User.decode(buffer);
      
      return this.User.toObject(user, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true
      });
    } catch (error) {
      throw new Error(`用户解码失败: ${error.message}`);
    }
  }

  /**
   * 序列化群组信息
   */
  async encodeGroup(groupData) {
    try {
      if (!this.loaded) {
        await this.loadProtobufDefinitions();
      }

      const errMsg = this.Group.verify(groupData);
      if (errMsg) {
        throw new Error(`群组数据验证失败: ${errMsg}`);
      }

      const group = this.Group.create(groupData);
      const buffer = this.Group.encode(group).finish();
      
      return buffer;
    } catch (error) {
      throw new Error(`群组编码失败: ${error.message}`);
    }
  }

  /**
   * 创建文本消息
   */
  createTextMessage(fromUser, toUser, content, messageType = 1) {
    return {
      from: fromUser.uuid,
      fromUsername: fromUser.username,
      to: toUser.uuid || toUser,
      content: content,
      contentType: 1, // 文字
      messageType: messageType, // 1单聊 2群聊
      timestamp: Date.now()
    };
  }

  /**
   * 创建文件消息
   */
  createFileMessage(fromUser, toUser, fileInfo, contentType, messageType = 1) {
    return {
      from: fromUser.uuid,
      fromUsername: fromUser.username,
      to: toUser.uuid || toUser,
      content: fileInfo.filename,
      url: fileInfo.url,
      contentType: contentType, // 2文件 3图片 4音频 5视频
      messageType: messageType,
      filename: fileInfo.filename,
      filesize: fileInfo.size,
      timestamp: Date.now()
    };
  }

  /**
   * 创建系统消息
   */
  createSystemMessage(toUser, content) {
    return {
      from: 'System',
      fromUsername: '系统',
      to: toUser.uuid || toUser,
      content: content,
      contentType: 1, // 文字
      messageType: 1,
      timestamp: Date.now()
    };
  }

  /**
   * 验证消息格式
   */
  validateMessage(messageData) {
    try {
      if (!this.loaded) {
        return false;
      }

      const errmsg = this.Message.verify(messageData);
      return !errmsg;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取消息字节大小
   */
  getMessageSize(messageData) {
    try {
      if (!this.loaded) {
        return 0;
      }

      const message = this.Message.create(messageData);
      const buffer = this.Message.encode(message).finish();
      
      return buffer.length;
    } catch (error) {
      return 0;
    }
  }
}

// 创建单例实例
const protobufUtils = new ProtobufUtils();

export default protobufUtils;
