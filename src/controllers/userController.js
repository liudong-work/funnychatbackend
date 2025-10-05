import userService from '../services/userService.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../utils/constants.js';
import { log } from '../config/logger.js';

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

export const userController = {
  /**
   * 用户注册
   * POST /api/user/register
   */
  async register(req, res, next) {
    try {
      const result = await userService.register(req.body);
      
      log.info(`用户注册成功: ${result.user.username}`);
      return createResponse(res, HTTP_STATUS.CREATED, true, '注册成功', result);
    } catch (error) {
      log.error('用户注册失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 用户登录
   * POST /api/user/login
   */
  async login(req, res, next) {
    try {
      const result = await userService.login(req.body.username, req.body.password);
      
      log.info(`用户登录成功: ${result.user.username}`);
      return createResponse(res, HTTP_STATUS.OK, true, '登录成功', result);
    } catch (error) {
      log.error('用户登录失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 获取用户详情
   * GET /api/user/:uuid
   */
  async getUserDetails(req, res, next) {
    try {
      const user = await userService.getUserDetails(req.params.uuid);
      
      return createResponse(res, HTTP_STATUS.OK, true, '获取用户信息成功', user);
    } catch (error) {
      log.error('获取用户详情失败:', error);
      return createResponse(res, HTTP_STATUS.NOT_FOUND, false, error.message);
    }
  },

  /**
   * 修改用户信息
   * PUT /api/user
   */
  async updateUserInfo(req, res, next) {
    try {
      const result = await userService.updateUserInfo(req.body.username, req.body);
      
      log.info(`用户信息修改成功: ${req.body.username}`);
      return createResponse(res, HTTP_STATUS.OK, true, '修改成功', result);
    } catch (error) {
      log.error('修改用户信息失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 获取好友列表
   * GET /api/user
   */
  async getUserFriends(req, res, next) {
    try {
      const friends = await userService.getUserFriends(req.query.uuid);
      
      return createResponse(res, HTTP_STATUS.OK, true, '获取好友列表成功', friends);
    } catch (error) {
      log.error('获取好友列表失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 添加好友
   * POST /api/friend
   */
  async addFriend(req, res, next) {
    try {
      const friend = await userService.addFriend(req.body.uuid, req.body.friendUsername);
      
      log.info(`添加好友成功: ${req.body.friendUsername}`);
      return createResponse(res, HTTP_STATUS.CREATED, true, '添加好友成功', friend);
    } catch (error) {
      log.error('添加好友失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 按名称搜索用户和群组
   * GET /api/user/name
   */
  async searchUserOrGroup(req, res, next) {
    try {
      const result = await userService.searchUserOrGroup(req.query.name);
      
      return createResponse(res, HTTP_STATUS.OK, true, '搜索完成', result);
    } catch (error) {
      log.error('搜索用户或群组失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  }
};
