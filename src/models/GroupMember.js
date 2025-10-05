import { DataTypes } from 'sequelize';
import database from '../config/database.js';

const GroupMember = database.define('GroupMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '成员关系ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '群组ID'
  },
  nickname: {
    type: DataTypes.STRING(350),
    allowNull: true,
    comment: '群内昵称'
  },
  mute: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    defaultValue: 0,
    comment: '是否禁言：0不禁言，1禁言'
  }
}, {
  tableName: 'group_members',
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
      fields: ['group_id']
    },
    {
      fields: ['user_id', 'group_id'],
      unique: true
    }
  ]
});

export default GroupMember;
