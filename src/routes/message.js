import express from 'express';
import messageService from '../services/messageService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { log } from '../config/logger.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../utils/constants.js';

const router = express.Router();

/**
 * 统一的响应格式
 */
const createResponse = (res, status, success, message, data = null) => {
  return res.status(status).json({
    status: success ? RESPONSE_STATUS.SUCCESS : RESPONSE_STATUS.FAIL,
    message,
    data
  });
};

/**
 * 获取聊天历史记录
 * GET /api/message
 */
router.get('/message', authenticateToken, validate(schemas.messageQuery, 'query'), async (req, res) => {
  try {
    const { uuid, friendUsername, messageType, limit, offset } = req.query;
    const userUuid = req.user.uuid;

    // 根据消息类型构建查询参数
    const filters = {
      userUuid,
      messageType: parseInt(messageType),
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    if (messageType === 1) {
      // 单聊消息
      filters.friendUuid = uuid;
    } else if (messageType === 2) {
      // 群聊消息
      filters.groupUuid = uuid;
    }

    const result = await messageService.getMessageHistory(filters);

    log.info(`用户 ${req.user.username} 获取聊天历史成功`);
    return createResponse(res, HTTP_STATUS.OK, true, '获取聊天历史成功', result);

  } catch (error) {
    log.error('获取聊天历史失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

/**
 * 发送消息
 * POST /api/message
 */
router.post('/message', authenticateToken, validate(schemas.sendMessage), async (req, res) => {
  try {
    const { to, content, messageType, contentType, url } = req.body;
    const userUuid = req.user.uuid;

    const messageData = {
      fromUuid: userUuid,
      fromUsername: req.user.username,
      to: to,
      content: content,
      messageType: parseInt(messageType),
      contentType: parseInt(contentType),
      url: url
    };

    // 保存消息到数据库
    const savedMessage = await messageService.saveMessage(messageData);

    log.info(`用户 ${req.user.username} 发送消息成功`);
    return createResponse(res, HTTP_STATUS.CREATED, true, '消息发送成功', savedMessage);

  } catch (error) {
    log.error('发送消息失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

/**
 * 获取未读消息数量
 * GET /api/message/unread
 */
router.get('/message/unread', authenticateToken, async (req, res) => {
  try {
    const userUuid = req.user.uuid;
    const unreadCount = await messageService.getUnreadMessageCount(userUuid);

    return createResponse(res, HTTP_STATUS.OK, true, '获取未读消息数量成功', {
      unreadCount
    });

  } catch (error) {
    log.error('获取未读消息数量失败:', error);
    return createResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, error.message);
  }
});

/**
 * 标记消息为已读
 * PUT /api/message/read
 */
router.put('/message/read', authenticateToken, validate(schemas.uuidParam, 'body'), async (req, res) => {
  try {
    const { uuid: senderUuid } = req.body;
    const userUuid = req.user.uuid;

    await messageService.markMessagesAsRead(userUuid, senderUuid);

    log.info(`用户 ${req.user.username} 标记消息已读成功`);
    return createResponse(res, HTTP_STATUS.OK, true, '消息已标记为已读');

  } catch (error) {
    log.error('标记消息已读失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

/**
 * 删除消息
 * DELETE /api/message/:messageId
 */
router.delete('/message/:messageId', authenticateToken, validate(schemas.uuidParam, 'params'), async (req, res) => {
  try {
    const messageId = req.params.uuid;
    const userUuid = req.user.uuid;

    await messageService.deleteMessage(messageId, userUuid);

    log.info(`用户 ${req.user.username} 删除消息成功`);
    return createResponse(res, HTTP_STATUS.OK, true, '消息删除成功');

  } catch (error) {
    log.error('删除消息失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

/**
 * 搜索消息
 * GET /api/message/search
 */
router.get('/message/search', authenticateToken, async (req, res) => {
  try {
    const { keyword, chatType, chatId, limit } = req.query;
    const userUuid = req.user.uuid;

    if (!keyword || keyword.trim().length === 0) {
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, '搜索关键词不能为空');
    }

    const filters = {
      chatType,
      chatId,
      limit: parseInt(limit) || 100
    };

    const results = await messageService.searchMessages(userUuid, keyword.trim(), filters);

    return createResponse(res, HTTP_STATUS.OK, true, '搜索完成', results);

  } catch (error) {
    log.error('搜索消息失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

/**
 * 撤回消息
 * PUT /api/message/:messageId/recall
 */
router.put('/message/:messageId/recall', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userUuid = req.user.uuid;

    // 检查消息是否存在且为发送者
    const message = await messageService.getMessageById(messageId);
    if (!message || message.from_user_id !== userUuid) {
      return createResponse(res, HTTP_STATUS.FORBIDDEN, false, '无权撤回此消息');
    }

    // 检查消息是否超过撤回时限（2分钟）
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > 2 * 60 * 1000) {
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, '消息发送超过2分钟，无法撤回');
    }

    await messageService.recallMessage(messageId);

    log.info(`用户 ${req.user.username} 撤回消息成功`);
    return createResponse(res, HTTP_STATUS.OK, true, '消息撤回成功');

  } catch (error) {
    log.error('撤回消息失败:', error);
    return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
  }
});

export default router;
