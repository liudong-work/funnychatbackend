import groupService from '../services/groupService.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../utils/constants.js';
import { log } from '../config/logger.js';

/**
 * 统一的便捷响应格式
 */
const createResponse = (res, status, success, message, data = null) => {
  return res.status(status).json({
    status: success ? RESPONSE_STATUS.SUCCESS : RESPONSE_STATUS.FAIL,
    message,
    data
  });
};

export const groupController = {
  /**
   * 创建群组
   * POST /api/group
   */
  async createGroup(req, res) {
    try {
      const userUuid = req.user.uuid;
      const groupData = req.body;

      const group = await groupService.createGroup(userUuid, groupData);

      log.info(`用户 ${req.user.username} 创建群组: ${group.name}`);
      return createResponse(res, HTTP_STATUS.CREATED, true, '群组创建成功', group);
    } catch (error) {
      log.error('创建群组失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 获取用户群组列表
   * GET /api/group
   */
  async getUserGroups(req, res) {
    try {
      const userUuid = req.user.uuid;
      const groups = await groupService.getUserGroups(userUuid);

      return createResponse(res, HTTP_STATUS.OK, true, '获取群组列表成功', groups);
    } catch (error) {
      log.error('获取群组列表失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 获取群组详情
   * GET /api/group/:uuid
   */
  async getGroupDetails(req, res) {
    try {
      const { uuid: groupUuid } = req.params;
      const group = await groupService.getGroupDetails(groupUuid);

      return createResponse(res, HTTP_STATUS.OK, true, '获取群组详情成功', group);
    } catch (error) {
      log.error('获取群组详情失败:', error);
      return createResponse(res, HTTP_STATUS.NOT_FOUND, false, error.message);
    }
  },

  /**
   * 加入群组
   * POST /api/group/:groupUuid/join
   */
  async joinGroup(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid } = req.params;
      const { nickname } = req.body;

      const result = await groupService.joinGroup(userUuid, groupUuid, nickname);

      log.info(`用户 ${req.user.username} 加入群组: ${groupUuid}`);
      return createResponse(res, HTTP_STATUS.CREATED, true, '加入群组成功', result);
    } catch (error) {
      log.error('加入群组失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 获取群成员列表
   * GET /api/group/:groupUuid/members
   */
  async getGroupMembers(req, res) {
    try {
      const { groupUuid } = req.params;
      const members = await groupService.getGroupMembers(groupUuid);

      return createResponse(res, HTTP_STATUS.OK, true, '获取群成员列表成功', members);
    } catch (error) {
      log.error('获取群成员列表失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 退出群组
   * DELETE /api/group/:groupUuid/members/self
   */
  async leaveGroup(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid } = req.params;

      await groupService.leaveGroup(userUuid, groupUuid);

      log.info(`用户 ${req.user.username} 退出群组: ${groupUuid}`);
      return createResponse(res, HTTP_STATUS.OK, true, '退出群组成功');
    } catch (error) {


      log.error('退出群组失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 更新群组信息
   * PUT /api/group/:groupUuid
   */
  async updateGroup(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid } = req.params;
      const updateData = req.body;

      const group = await groupService.updateGroup(userUuid, groupUuid, updateData);

      log.info(`用户 ${req.user.username} 更新群组: ${group.name}`);
      return createResponse(res, HTTP_STATUS.OK, true, '群组信息更新成功', group);
    } catch (error) {
      log.error('更新群组信息失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 删除群组
   * DELETE /api/group/:groupUuid
   */
  async deleteGroup(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid } = req.params;

      await groupService.deleteGroup(userUuid, groupUuid);

      log.info(`用户 ${req.user.username} 删除群组: ${groupUuid}`);
      return createResponse(res, HTTP_STATUS.OK, true, '群组删除成功');
    } catch (error) {
      log.error('删除群组失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 设置群成员禁言
   * POST /api/group/:groupUuid/members/:memberUuid/mute
   */
  async muteMember(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid, memberUuid } = req.params;
      const { mute } = req.body;

      await groupService.muteMember(userUuid, groupUuid, memberUuid, mute);

      log.info(`用户 ${req.user.username} ${mute ? '禁言' : '解禁'}群成员: ${memberUuid}`);
      return createResponse(res, HTTP_STATUS.OK, true, `群成员${mute ? '禁言' : '解禁'}成功`);
    } catch (error) {
      log.error('设置群成员禁言失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  },

  /**
   * 设置群昵称
   * PUT /api/group/:groupUuid/nickname
   */
  async setGroupNickname(req, res) {
    try {
      const userUuid = req.user.uuid;
      const { groupUuid } = req.params;
      const { nickname } = req.body;

      const result = await groupService.setMemberNickname(userUuid, groupUuid, nickname);

      log.info(`用户 ${req.user.username} 在群组中设置昵称: ${nickname}`);
      return createResponse(res, HTTP_STATUS.OK, true, '群昵称设置成功', result);
    } catch (error) {
      log.error('设置群昵称失败:', error);
      return createResponse(res, HTTP_STATUS.BAD_REQUEST, false, error.message);
    }
  }
};
