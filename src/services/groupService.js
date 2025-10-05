import { Group, GroupMember, User, Message } from '../models/index.js';
import { log } from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * 群组服务层 - 提供群组管理功能
 */
class GroupService {
  /**
   * 创建群组
   */
  async createGroup(ownerUuid, groupData) {
    try {
      const owner = await User.findOne({ where: { uuid: ownerUuid } });
      if (!owner) {
        throw new Error('群主不存在');
      }

      const group = await Group.create({
        uuid: uuidv4(),
        user_id: owner.id,
        name: groupData.name,
        notice: groupData.notice || ''
      });

      // 群主自动加入群组
      await GroupMember.create({
        user_id: owner.id,
        group_id: group.id,
        nickname: groupData.nickname || owner.nickname,
        mute: 0
      });

      log.info(`群组创建成功: ${group.name} (${group.uuid}) by ${owner.username}`);

      return {
        id: group.id,
        uuid: group.uuid,
        name: group.name,
        notice: group.notice,
        ownerId: owner.id,
        ownerUsername: owner.username,
        createdAt: group.created_at
      };
    } catch (error) {
      log.error('创建群组失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户群组列表
   */
  async getUserGroups(userUuid) {
    try {
      const getUserQuery = "SELECT g.*, gm.nickname as group_nickname " +
        "FROM groups g " +
        "INNER JOIN group_members gm ON g.id = gm.group_id " +
        "INNER JOIN users u ON gm.user_id = u.id " +
        "WHERE u.uuid = ? AND g.deleted_at IS NULL AND gm.deleted_at IS NULL";

      const groups = await database.query(getUserQuery, {
        replacements: [userUuid],
        type: QueryTypes.SELECT
      });

      return groups.map(group => ({
        id: group.id,
        uuid: group.uuid,
        name: group.name,
        notice: group.notice,
        nickname: group.group_nickname,
        createdAt: group.created_at
      }));
    } catch (error) {
      log.error('获取用户群组列表失败:', error);
      throw error;
    }
  }

  /**
   * 加入群组
   */
  async joinGroup(userUuid, groupUuid, nickname) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (!user) {
        throw new Error('用户不存在');
      }

      const group = await Group.findOne({ where: { uuid: groupUuid } });
      if (!group) {
        throw new Error('群组不存在');
      }

      // 检查是否已是群成员
      const existingMember = await GroupMember.findOne({
        where: {
          user_id: user.id,
          group_id: group.id
        }
      });

      if (existingMember) {
        throw new Error('已是群成员');
      }

      // 创建群成员关系
      const member = await GroupMember.create({
        user_id: user.id,
        group_id: group.id,
        nickname: nickname || user.nickname,
        mute: 0
      });

      log.info(`用户 ${user.username} 加入群组 ${group.name}`);

      return {
        userId: user.id,
        username: user.username,
        nickname: member.nickname,
        joinedAt: member.created_at
      };
    } catch (error) {
      log.error('加入群组失败:', error);
      throw error;
    }
  }

  /**
   * 获取群组成员列表
   */
  async getGroupMembers(groupUuid) {
    try {
      const group = await Group.findOne({ 
        where: { uuid: groupUuid },
        include: [{
          model: GroupMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'uuid', 'username', 'nickname', 'avatar']
          }]
        }]
      });

      if (!group) {
        throw new Error('群组不存在');
      }

      return group.members.map(member => ({
        id: member.id,
        userId: member.user.id,
        uuid: member.user.uuid,
        username: member.user.username,
        nickname: member.nickname || member.user.nickname,
        avatar: member.user.avatar,
        mute: member.mute,
        joinedAt: member.created_at
      }));
    } catch (error) {
      log.error('获取群成员列表失败:', error);
      throw error;
    }
  }

  /**
   * 退出群组
   */
  async leaveGroup(userUuid, groupUuid) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (!user) {
        throw new Error('用户不存在');
      }

      const group = await Group.findOne({ where: { uuid: groupUuid } });
      if (!group) {
        throw new Error('群组不存在');
      }

      const member = await GroupMember.findOne({
        where: {
          user_id: user.id,
          group_id: group.id
        }
      });

      if (!member) {
        throw new Error('不是群成员');
      }

      // 群主不能退出群组
      if (group.user_id === user.id) {
        throw new Error('群主不能退出群组');
      }

      await member.destroy();

      log.info(`用户 ${user.username} 退出群组 ${group.name}`);

      return true;
    } catch (error) {
      log.error('退出群组失败:', error);
      throw error;
    }
  }

  /**
   * 更新群组信息
   */
  async updateGroup(userUuid, groupUuid, updateData) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (!user) {
        throw new Error('用户不存在');
      }

      const group = await Group.findOne({ where: { uuid: groupUuid } });
      if (!group) {
        throw new Error('群组不存在');
      }

      // 检查是否为群主
      if (group.user_id !== user.id) {
        throw new Error('无权限修改群组信息');
      }

      const updateFields = {};
      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.notice !== undefined) updateFields.notice = updateData.notice;

      await group.update(updateFields);

      log.info(`群组信息更新成功: ${group.name}`);

      return {
        id: group.id,
        uuid: group.uuid,
        name: group.name,
        notice: group.notice,
        updatedAt: group.updated_at
      };
    } catch (error) {
      log.error('更新群组信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除群组
   */
  async deleteGroup(userUuid, groupUuid) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (!user) {
        throw new Error('用户不存在');
      }

      const group = await Group.findOne({ where: { uuid: groupUuid } });
      if (!group) {
        throw new Error('群组不存在');
      }

      // 检查是否为群主
      if (group.user_id !== user.id) {
        throw new Error('无权限删除群组');
      }

      // 软删除群组
      await group.destroy();

      log.info(`群组删除成功: ${group.name}`);

      return true;
    } catch (error) {
      log.error('删除群组失败:', error);
      throw error;
    }
  }

  /**
   * 设置群成员禁言
   */
  async muteMember(userUuid, groupUuid, memberUuid, mute) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      const targetUser = await User.findOne({ where: { uuid: memberUuid } });
      const group = await Group.findOne({ where: { uuid: groupUuid } });

      if (!user || !targetUser || !group) {
        throw new Error('用户或群组不存在');
      }

      // 检查操作者是否为群主或管理员
      if (group.user_id !== user.id) {
        throw new Error('无权限设置禁言');
      }

      const member = await GroupMember.findOne({
        where: {
          user_id: targetUser.id,
          group_id: group.id
        }
      });

      if (!member) {
        throw new Error('目标用户不是群成员');
      }

      await member.update({ mute: mute ? 1 : 0 });

      log.info(`群成员 ${targetUser.username} ${mute ? '禁言' : '解禁'}成功`);

      return true;
    } catch (error) {
      log.error('设置群成员禁言失败:', error);
      throw error;
    }
  }

  /**
   * 设置群成员昵称
   */
  async setMemberNickname(userUuid, groupUuid, nickname) {
    try {
      const user = await User.findOne({ where: { uuid: userUuid } });
      if (!user) {
        throw new Error('用户不存在');
      }

      const group = await Group.findOne({ where: { uuid: groupUuid } });
      if (!group) {
        throw new Error('群组不存在');
      }

      const member = await GroupMember.findOne({
        where: {
          user_id: user.id,
          group_id: group.id
        }
      });

      if (!member) {
        throw new Error('不是群成员');
      }

      await member.update({ nickname });

      log.info(`用户 ${user.username} 在群 ${group.name} 中设置昵称为 ${nickname}`);

      return {
        nickname,
        updatedAt: member.updated_at
      };
    } catch (error) {
      log.error('设置群昵称失败:', error);
      throw error;
    }
  }

  /**
   * 获取群组详情
   */
  async getGroupDetails(groupUuid) {
    try {
      const group = await Group.findOne({
        where: { uuid: groupUuid },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'uuid', 'username', 'nickname']
        }]
      });

      if (!group) {
        throw new Error('群组不存在');
      }

      // 获取成员数量
      const memberCount = await GroupMember.count({
        where: { group_id: group.id }
      });

      return {
        id: group.id,
        uuid: group.uuid,
        name: group.name,
        notice: group.notice,
        owner: group.owner,
        memberCount,
        createdAt: group.created_at
      };
    } catch (error) {
      log.error('获取群组详情失败:', error);
      throw error;
    }
  }
}

export default new GroupService();
