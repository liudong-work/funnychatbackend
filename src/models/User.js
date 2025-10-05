import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';

const User = database.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '用户ID'
  },
  uuid: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    comment: '用户UUID'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '昵称'
  },
  avatar: {
    type: DataTypes.STRING(350),
    allowNull: true,
    comment: '头像'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '邮箱'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (user) => {
      if (!user.uuid) {
        user.uuid = uuidv4();
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['username'],
      unique: true
    }
  ]
});

export default User;
