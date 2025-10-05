import database from '../config/database.js';
import User from './User.js';
import Message from './Message.js';
import Group from './Group.js';
import GroupMember from './GroupMember.js';
import UserFriend from './UserFriend.js';

// 定义模型关联关系
const setupAssociations = () => {
  // User 与 Message 的关联
  User.hasMany(Message, {
    foreignKey: 'from_user_id',
    as: 'sentMessages'
  });
  
  Message.belongsTo(User, {
    foreignKey: 'from_user_id',
    as: 'fromUser'
  });

  // User 与 UserFriend 的关联（自关联）
  User.hasMany(UserFriend, {
    foreignKey: 'user_id',
    as: 'friendships'
  });
  
  User.hasMany(UserFriend, {
    foreignKey: 'friend_id',
    as: 'friendOf'
  });

  UserFriend.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  UserFriend.belongsTo(User, {
    foreignKey: 'friend_id',
    as: 'friend'
  });

  // Group 相关关联
  User.hasMany(Group, {
    foreignKey: 'user_id',
    as: 'ownedGroups'
  });

  Group.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
  });

  Group.hasMany(GroupMember, {
    foreignKey: 'group_id',
    as: 'members'
  });

  GroupMember.belongsTo(Group, {
    foreignKey: 'group_id',
    as: 'group'
  });

  User.hasMany(GroupMember, {
    foreignKey: 'user_id',
    as: 'groupMemberships'
  });

  GroupMember.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // Group 与 Message 的关联
  Group.hasMany(Message, {
    foreignKey: 'to_user_id',
    as: 'groupMessages',
    scope: {
      message_type: 2 // 群聊消息
    }
  });
};

// 初始化数据库连接和模型关联
export const initDatabase = async () => {
  try {
    // 设置关联关系
    setupAssociations();

    // 测试数据库连接
    await database.authenticate();
    console.log('数据库连接成功！');

    // 同步数据库（开发环境）
    if (process.env.NODE_ENV === 'development') {
      await database.sync({ alter: true });
      console.log('数据库同步完成！');
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

export {
  database,
  User,
  Message,
  Group,
  GroupMember,
  UserFriend
};
