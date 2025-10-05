import { DataTypes } from 'sequelize';
import database from '../config/database.js';

const UserFriend = database.define('UserFriend', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '好友关系ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  friend_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '好友ID'
  }
}, {
  tableName: 'user_friends',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['friend_id']
    },
    {
      fields: ['user_id', 'friend_id'],
      unique: true
    }
  ]
});

export default UserFriend;
