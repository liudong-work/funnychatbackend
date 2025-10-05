import Joi from 'joi';
import { log } from '../config/logger.js';

/**
 * 验证中间件工厂函数
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      let data;
      
      switch (source) {
        case 'query':
          data = req.query;
          break;
        case 'params':
          data = req.params;
          break;
        case 'body':
        default:
          data = req.body;
          break;
      }

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        log.debug('验证失败:', errorMessages);
        
        return res.status(400).json({
          status: false,
          message: '请求参数验证失败',
          errors: errorMessages
        });
      }

      // 将验证后的数据放回请求对象
      switch (source) {
        case 'query':
          req.query = value;
          break;
        case 'params':
          req.params = value;
          break;
        case 'body':
        default:
          req.body = value;
          break;
      }

      next();
    } catch (error) {
      log.error('验证中间件错误:', error);
      return res.status(500).json({
        status: false,
        message: '服务器内部错误'
      });
    }
  };
};

// 常用验证模式
export const schemas = {
  // 用户注册
  userRegister: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(100).required(),
    nickname: Joi.string().min(1).max(50).optional(),
    email: Joi.string().email().optional()
  }),

  // 用户登录
  userLogin: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  // 用户信息修改
  userUpdate: Joi.object({
    nickname: Joi.string().min(1).max(50).optional(),
    password: Joi.string().min(6).max(100).optional(),
    email: Joi.string().email().optional()
  }),

  // UUID参数
  uuidParam: Joi.object({
    uuid: Joi.string().uuid().required()
  }),

  // 用户名查询
  usernameQuery: Joi.object({
    name: Joi.string().min(1).max(50).required()
  }),

  // 好友添加
  addFriend: Joi.object({
    uuid: Joi.string().uuid().required(),
    friendUsername: Joi.string().required()
  }),

  // 消息查询
  messageQuery: Joi.object({
    uuid: Joi.string().uuid().required(),
    friendUsername: Joi.string().optional(),
    messageType: Joi.number().valid(1, 2).required(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  }),

  // 发送消息
  sendMessage: Joi.object({
    to: Joi.string().uuid().required(),
    content: Joi.string().max(1000).optional(),
    messageType: Joi.number().valid(1, 2).required(),
    contentType: Joi.number().valid(1, 2, 3, 4, 5, 6, 7).required(),
    url: Joi.string().max(350).optional()
  }),

  // 群组创建
  groupCreate: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    notice: Joi.string().max(200).optional()
  }),

  // 群组信息修改
  groupUpdate: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    notice: Joi.string().max(200).optional()
  })
};
