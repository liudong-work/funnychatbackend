import { Message, User, Group, GroupMember } from '../models/index.js';
import { log } from '../config/logger.js';
import { FILE_TYPE_MAP, MESSAGE_TYPE, CONTENT_TYPE } from '../utils/constants.js';
import protobufUtils from '../utils/protobuf.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 消息处理器 - 模仿Go版本的消息分发逻辑
 */
export class MessageHandler {
  constructor(io, connectedUsers) {
    this.io = io;
    this.connectedUsers = connectedUsers;
    this.uploadDir = path.join(__dirname, '../../uploads');
    
    // 确保上传目录存在
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  async ensureUploadDir() {
    await fs.ensureDir(this.uploadDir);
  }

  /**
   * 保存消息到数据库
   */
  async saveMessage(messageData) {
    try {
      const message = await Message.create({
        from_user_id: messageData.fromUserId,
        to_user_id: messageData.toUserId,
        content: messageData.content,
        url: messageData.url,
        message_type: messageData.messageType,
        content_type: messageData.contentType
      });
      return message;
    } catch (error) {
      log.error('保存消息失败:', error);
      throw error;
    }
  }

  /**
   * 处理文件保存并返回文件名
   */
  async saveFile(fileData, contentType) {
    try {
      if (!fileData || fileData.length === 0) {
        return null;
      }

      // 确定文件扩展名
      const extension = this.getFileExtension(fileData, contentType);
      const fileName = `${uuidv4()}.${extension}`;
      const filePath = path.join(this.uploadDir, fileName);

      // 保存文件
      await fs.writeFile(filePath, Buffer.from(fileData));
      
      log.info(`文件保存成功: ${fileName}`);
      return fileName;
    } catch (error) {
      log.error('保存文件失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件头和内容类型确定文件扩展名
   */
  getFileExtension(fileData, contentType) {
    const typeMap = {
      [CONTENT_TYPE.IMAGE]: 'jpg',
      [CONTENT_TYPE.VIDEO]: 'webm',
      [CONTENT_TYPE.AUDIO]: 'webm',
      [CONTENT_TYPE.FILE]: 'bin'
    };

    return typeMap[contentType] || 'bin';
  }

  /**
   * 单聊消息分发 - 模仿Go版本的直接路由
   */
  async sendUserMessage(messageData) {
    try {
      log.info(`单聊消息: ${messageData.fromUsername} -> ${messageData.to}`);

      // 查找用户
      const toUser = await User.findOne({ where: { uuid: messageData.to } });
      if (!toUser) {
        throw new Error('目标用户不存在');
      }

      // 查找发送者
      const fromUser = await User.findOne({ where: { username: messageData.fromUsername } });
      if (!fromUser) {
        throw new Error('发送者不存在');
      }

      // 处理文件消息
      let fileName = null;
      let messageUrl = '';
      
      if (messageData.file && messageData.file.length > 0) {
        fileName = await this.saveFile(messageData.file, messageData.contentType);
        if (fileName) {
          messageUrl = `/api/file/${fileName}`;
        }
      }

      // 保存消息到数据库
      await this.saveMessage({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        content: messageData.content,
        url: messageUrl,
        messageType: messageData.messageType,
        contentType: messageData.contentType
      });

      // 生成protobuf格式的消息
      const protoMessage = {
        from: fromUser.uuid,
        fromUsername: fromUser.username,
        to: messageData.to,
        content: messageData.content,
        contentType: messageData.contentType,
        messageType: messageData.messageType,
        url: messageUrl,
        timestamp: Date.now()
      };

      // 编码为二进制消息（如需要）
      let binaryMessage = null;
      try {
        binaryMessage = await protobufUtils.encodeMessage(protoMessage);
        log.debug(`Protobuf消息编码成功，大小: ${binaryMessage.length} bytes`);
      } catch (error) {
        log.warn('Protobuf编码失败，使用JSON格式:', error.message);
      }

      // 发送给目标用户
      const targetSocket = this.connectedUsers.get(messageData.to);
      if (targetSocket) {
        targetSocket.emit('message', protoMessage);
        log.info(`消息已发送给在线用户: ${messageData.to}`);
      } else {
        log.info(`用户离线，消息已存储: ${messageData.to}`);
      }

      return protoMessage;
    } catch (error) {
      log.error('单聊消息发送失败:', error);
      throw error;
    }
  }

  /**
   * 群聊消息广播 - 模仿Go版本的群成员查询和广播
   */
  async sendGroupMessage(messageData) {
    try {
      log.info(`群聊消息: ${messageData.fromUsername} -> ${messageData.to}`);

      // 查找群组
      const group = await Group.findOne({ where: { uuid: messageData.to } });
      if (!group) {
        throw new Error('群组不存在');
      }

      // 查找发送者
      const fromUser = await User.findOne({ where: { username: messageData.fromUsername } });
      if (!fromUser) {
        throw new Error('发送者不存在');
      }

      // 检查发送者是否为群成员
      const memberShip = await GroupMember.findOne({
        where: { user_id: fromUser.id, group_id: group.id }
      });
      if (!memberShip) {
        throw new Error('不是群成员');
      }

      // 获取群所有成员 - 模仿Go版本的查询逻辑
      const groupMembers = await GroupMember.findAll({
        where: { group_id: group.id },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'uuid', 'username', 'nickname']
        }]
      });

      // 处理文件消息
      let fileName = null;
      let messageUrl = '';
      
      if (messageData.file && messageData.file.length > 0) {
        fileName = await this.saveFile(messageData.file, messageData.contentType);
        if (fileName) {
          messageUrl = `/api/file/${fileName}`;
        }
      }

      // 保存消息到数据库
      await this.saveMessage({
        fromUserId: fromUser.id,
        toUserId: group.id, // 群组ID
        content: messageData.content,
        url: messageUrl,
        messageType: messageData.messageType,
        contentType: messageData.contentType
      });

      // 生成protobuf格式的消息
      const protoMessage = {
        from: fromUser.uuid,
        fromUsername: fromUser.username,
        to: messageData.to,
        content: messageData.content,
        contentType: messageData.contentType,
        messageType: messageData.messageType,
        url: messageUrl
      };

      // 广播给所有群成员 - 模仿Go版本的广播逻辑
      let sentCount = 0;
      groupMembers.forEach(member => {
        const memberSocket = this.connectedUsers.get(member.user.uuid);
        if (memberSocket) {
          memberSocket.emit('message', protoMessage);
          sentCount++;
        }
      });

      log.info(`群聊消息广播完成: ${sentCount}/${groupMembers.length} 成员在线`);
      
      return {
        ...protoMessage,
        sentCount,
        totalMembers: groupMembers.length
      };
    } catch (error) {
      log.error('群聊消息发送失败:', error);
      throw error;
    }
  }

  /**
   * 处理消息分发的主入口
   */
  async handleMessage(messageData) {
    try {
      if (messageData.messageType === MESSAGE_TYPE.USER) {
        // 单聊消息
        return await this.sendUserMessage(messageData);
      } else if (messageData.messageType === MESSAGE_TYPE.GROUP) {
        // 群聊消息
        return await this.sendGroupMessage(messageData);
      } else {
        throw new Error('不支持的消息类型');
      }
    } catch (error) {
      log.error('消息处理失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户连接状态
   */
  getUserStatus(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }
}
