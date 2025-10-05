import { Message, User, Group, GroupMember } from '../models/index.js';
import { log } from '../config/logger.js';
import { MESSAGE_TYPE, CONTENT_TYPE } from '../utils/constants.js';
import { QueryTypes } from 'sequelize';
import database from '../config/database.js';

/**
 * 消息服务层 - 提供消息查询和管理功能
 */
class MessageService {
  /**
   * 获取聊天历史记录
   */
  async getMessageHistory(filters) {
    try {
      const { 
        userUuid, 
        friendUuid, 
        groupUuid, 
        messageType, 
        limit = 50, 
        offset = 0 
      } = filters;

      let query;
      let replacements = { limit, offset };

      if (messageType === MESSAGE_TYPE.USER && friendUuid) {
        // 单聊消息历史
        query = `
          SELECT m.*, u.username as from_username, u.nickname as from_nickname, u.avatar as from_avatar
          FROM messages m
          LEFT JOIN users u ON m.from_user_id = u.id
          WHERE (
            (m.from_user_id = (SELECT id FROM users WHERE uuid = :userUuid) 
             AND m.to_user_id = (SELECT id FROM users WHERE uuid = :friendUuid))
            OR 
            (m.from_user_id = (SELECT id FROM users WHERE uuid = :friendUuid) 
             AND m.to_user_id = (SELECT id FROM users WHERE uuid = :userUuid))
          )
          AND m.message_type = 1
          AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        replacements.userUuid = userUuid;
        replacements.friendUuid = friendUuid;

      } else if (messageType === MESSAGE_TYPE.GROUP && groupUuid) {
        // 群聊消息历史
        query = `
          SELECT m.*, u.username as from_username, u.nickname as from_nickname, u.avatar as from_avatar,
                 gm.nickname as group_nickname
          FROM messages m
          LEFT JOIN users u ON m.from_user_id = u.id
          LEFT JOIN group_members gm ON m.from_user_id = gm.user_id AND gm.group_id = m.to_user_id
          WHERE m.to_user_id = (SELECT id FROM groups WHERE uuid = :groupUuid)
          AND m.message_type = 2
          AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT :limit OFFSET :offset
        `;
        replacements.groupUuid = groupUuid;

      } else {
        throw new Error('不支持的查询类型');
      }

      const messages = await database.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      // 格式化消息数据
      const formattedMessages = await this.formatMessages(messages);

      return {
        messages: formattedMessages,
        count: messages.length,
        hasMore: messages.length === limit
      };

    } catch (error) {
      log.error('获取消息历史失败:', error);
      throw error;
    }
  }

  /**
   * 格式化消息数据
   */
  async formatMessages(messages) {
    return messages.map(msg => ({
      id: msg.id,
      from: msg.from_user_id,
      fromUsername: msg.from_username,
      fromNickname: msg.from_nickname || msg.from_username,
      fromAvatar: msg.from_avatar,
      groupNickname: msg.group_nickname,
      content: msg.content,
      url: msg.url,
      messageType: msg.message_type,
      contentType: msg.content_type,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at
    }));
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
        pic: messageData.pic,
        message_type: messageData.messageType,
        content_type: messageData.contentType
      });

      log.info(`消息保存成功: ${message.id}`);
      return message;
    } catch (error) {
      log.error('保存消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户未读消息数量
   */
  async getUnreadMessageCount(userUuid) {
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        WHERE m.to_user_id = (SELECT id FROM users WHERE uuid = :userUuid)
        AND m.deleted_at IS NULL
      `;

      const result = await database.query(query, {
        replacements: { userUuid },
        type: QueryTypes.SELECT
      });

      return result[0]?.unread_count || 0;
    } catch (error) {
      log.error('获取未读消息数量失败:', error);
      throw error;
    }
  }

  /**
   * 标记消息为已读
   */
  async markMessagesAsRead(userUuid, senderUuid) {
    try {
      await Message.update(
        { is_read: true },
        {
          where: {
            from_user_id: senderUuid,
            to_user_id: userUuid,
            is_read: false
          }
        }
      );

      log.info(`消息已标记为已读: ${userUuid} <- ${senderUuid}`);
    } catch (error) {
      log.error('标记消息已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId, userUuid) {
    try {
      const message = await Message.findOne({
        where: {
          id: messageId,
          from_user_id: userUuid
        }
      });

      if (!message) {
        throw new Error('消息不存在或无权限删除');
      }

      await message.destroy();
      
      log.info(`消息删除成功: ${messageId}`);
      return true;
    } catch (error) {
      log.error('删除消息失败:', error);
      throw error;
    }
  }

  /**
   * 搜索消息内容
   */
  async searchMessages(userUuid, keyword, filters = {}) {
    try {
      const { chatType, chatId, limit = 100 } = filters;
      
      let whereClause = `
        m.deleted_at IS NULL 
        AND m.content LIKE :keyword
      `;

      const replacements = {
        keyword: `%${keyword}%`,
        userUuid,
        limit
      };

      if (chatType === 'user' && chatId) {
        // 搜索与特定用户的聊天记录
        whereClause += ` AND (
          (m.from_user_id = (SELECT id FROM users WHERE uuid = :userUuid) 
           AND m.to_user_id = (SELECT id FROM users WHERE uuid = :chatId))
          OR 
          (m.from_user_id = (SELECT id FROM users WHERE uuid = :chatId) 
           AND m.to_user_id = (SELECT id FROM users WHERE uuid = :userUuid))
        ) AND m.message_type = 1`;
        replacements.chatId = chatId;
      } else if (chatType === 'group' && chatId) {
        // 搜索群聊消息
        whereClause += ` AND m.to_user_id = (SELECT id FROM groups WHERE uuid = :chatId) AND m.message_type = 2`;
        replacements.chatId = chatId;
      } else {
        // 搜索所有相关消息
        whereClause += ` AND (
          m.from_user_id = (SELECT id FROM users WHERE uuid = :userUuid)
          OR m.to_user_id = (SELECT id FROM users WHERE uuid = :userUuid)
          OR m.to_user_id IN (
            SELECT gm.group_id FROM group_members gm 
            INNER JOIN users u ON gm.user_id = u.id 
            WHERE u.uuid = :userUuid
          )
        )`;
      }

      const query = `
        SELECT m.*, u.username as from_username, u.nickname as from_nickname
        FROM messages m
        LEFT JOIN users u ON m.from_user_id = u.id
        WHERE ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT :limit
      `;

      const messages = await database.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      return messages.map(msg => ({
        id: msg.id,
        from: msg.from_username,
        content: msg.content,
        contentType: msg.content_type,
        createdAt: msg.created_at,
        chatType: chatType || 'both'
      }));
    } catch (error) {
      log.error('搜索消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个消息详情
   */
  async getMessageById(messageId) {
    try {
      const message = await Message.findOne({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('消息不存在');
      }

      return message;
    } catch (error) {
      log.error('获取消息详情失败:', error);
      throw error;
    }
  }

  /**
   * 撤回消息
   */
  async recallMessage(messageId) {
    try {
      const message = await Message.findOne({
        where: { id: messageId }
      });

      if (!message) {
        throw new Error('消息不存在');
      }

      // 标记消息为已撤回
      await message.update({
        content: '[消息已撤回]',
        is_recalled: true
      });

      log.info(`消息撤回成功: ${messageId}`);
      return true;
    } catch (error) {
      log.error('删除消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取消息统计信息
   */
  async getMessageStats(userUuid) {
    try {
      const stats = await Message.findAll({
        where: {
          from_user_id: await User.findOne({ where: { uuid: userUuid } }).then(u => u?.id)
        },
        attributes: [
          'content_type',
          [database.fn('COUNT', '*'), 'count']
        ],
        group: 'content_type',
        raw: true
      });

      return {
        total: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        byType: stats.map(stat => ({
          contentType: stat.content_type,
          count: parseInt(stat.count)
        }))
      };
    } catch (error) {
      log.error('获取消息统计失败:', error);
      throw error;
    }
  }
}
