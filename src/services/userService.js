import bcrypt from 'bcryptjs';
import { User, UserFriend } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';

class UserService {
  /**
   * 用户注册
   */
  async register(userData) {
    try {
      // 检查用户名是否已存在
      const existingUser = await User.findOne({
        where: { username: userData.username }
      });

      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // 创建用户
      const user = await User.create({
        username: userData.username,
        password: hashedPassword,
        nickname: userData.nickname || userData.username,
        email: userData.email,
        avatar: '' // 默认头像为空
      });

      // 生成JWT令牌
      const token = generateToken(user);

      return {
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          email: user.email
        },
        token
      };
    } catch (error) {
      log.error('用户注册失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      const user = await User.findOne({
        where: { username }
      });

      if (!user) {
        throw new Error('用户名或密码错误');
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        throw new Error('用户名或密码错误');
      }

      // 生成JWT令牌
      const token = generateToken(user);

      return {
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          email: user.email
        },
        token
      };
    } catch (error) {
      log.error('用户登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetails(uuid) {
    try {
      const user = await User.findOne({
        where: { uuid },
        attributes: ['uuid', 'username', 'nickname', 'avatar', 'email', 'created_at']
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      return user;
    } catch (error) {
      log.error('获取用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 修改用户信息
   */
  async updateUserInfo(uuid, updateData) {
    try {
      const user = await User.findOne({
        where: { uuid }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 更新数据
      const updateFields = {};
      if (updateData.nickname) updateFields.nickname = updateData.nickname;
      if (updateData.email) updateFields.email = updateData.email;
      
      // 如果提供了新密码，进行加密
      if (updateData.password) {
        updateFields.password = await bcrypt.hash(updateData.password, 12);
      }

      await user.update(updateFields);

      return {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email
      };
    } catch (error) {
      log.error('修改用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 修改用户头像
   */
  async updateUserAvatar(uuid, avatarPath) {
    try {
      const user = await User.findOne({
        where: { uuid }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      await user.update({ avatar: avatarPath });

      return avatarPath;
    } catch (error) {
      log.error('修改用户头像失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户好友列表
   */
  async getUserFriends(uuid) {
    try {
      // 先获取当前用户
      const user = await User.findOne({
        where: { uuid }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 查询好友关系并获取好友信息
      const friends = await UserFriend.findAll({
        where: { user_id: user.id },
        include: [{
          model: User,
          as: 'friend',
          attributes: ['uuid', 'username', 'nickname', 'avatar']
        }]
      });

      return friends.map(friendship => ({
        uuid: friendship.friend.uuid,
        username: friendship.friend.username,
        nickname: friendship.friend.nickname,
        avatar: friendship.friend.avatar
      }));
    } catch (error) {
      log.error('获取好友列表失败:', error);
      throw error;
    }
  }

  /**
   * 添加好友
   */
  async addFriend(userUuid, friendUsername) {
    try {
      // 获取当前用户
      const user = await User.findOne({
        where: { uuid: userUuid }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取要添加为好友的用户
      const friend = await User.findOne({
        where: { username: friendUsername }
      });

      if (!friend) {
        throw new Error('无法查询到该好友');
      }

      if (user.id === friend.id) {
        throw new Error('不能添加自己为好友');
      }

      // 检查是否已经是好友
      const existingFriendship = await UserFriend.findOne({
        where: {
          user_id: user.id,
          friend_id: friend.id
        }
      });

      if (existingFriendship) {
        throw new Error('该用户已经是您的好友');
      }

      // 创建双向好友关系
      await Promise.all([
        UserFriend.create({
          user_id: user.id,
          friend_id: friend.id
        }),
        UserFriend.create({
          user_id: friend.id,
          friend_id: user.id
        })
      ]);

      return {
        uuid: friend.uuid,
        username: friend.username,
        nickname: friend.nickname,
        avatar: friend.avatar
      };
    } catch (error) {
      log.error('添加好友失败:', error);
      throw error;
    }
  }

  /**
   * 按名称搜索用户和群组
   */
  async searchUserOrGroup(name) {
    try {
      // 搜索用户
      const users = await User.findAll({
        where: {
          username: {
            [Op.like]: `%${name}%`
          }
        },
        attributes: ['uuid', 'username', 'nickname', 'avatar'],
        limit: 10
      });

      // 搜索群组
      const groups = await sequelize.query(
        `SELECT uuid, name FROM groups WHERE name LIKE :name AND deleted_at IS NULL LIMIT 10`,
        {
          replacements: { name: `%${name}%` },
          type: QueryTypes.SELECT
        }
      );

      return {
        users: users || [],
        groups: groups || []
      };
    } catch (error) {
      log.error('搜索用户或群组失败:', error);
      throw error;
    }
  }
}

export default new UserService();
