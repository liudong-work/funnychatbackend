import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import database from '../config/database.js';

const Group = database.define('Group', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '群组ID'
  },
  uuid: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    comment: '群组UUID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '群主ID'
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: '群名称'
  },
  notice: {
    type: DataTypes.STRING(350),
    allowNull: true,
    comment: '群公告'
  }
}, {
  tableName: 'groups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (group) => {
      if (!group.uuid) {
        group.uuid = uuidv4();
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['user_id']
    }
  ]
});

export default Group;
