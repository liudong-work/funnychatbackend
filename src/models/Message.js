import { DataTypes } from 'sequelize';
import database from '../config/database.js';

const Message = database.define('Message', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    comment: '消息ID'
  },
  from_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '发送人ID'
  },
  to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '接收对象ID（用户ID或群组ID）'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '消息内容'
  },
  url: {
    type: DataTypes.STRING(350),
    allowNull: true,
    comment: '文件或图片地址'
  },
  pic: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '缩略图'
  },
  message_type: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    comment: '消息类型：1单聊，2群聊'
  },
  content_type: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    comment: '消息内容类型：1文字，2文件，3图片，4音频，5视频，6语音通话，7视频通话'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  indexes: [
    {
      fields: ['from_user_id']
    },
    {
      fields: ['to_user_id']
    },
    {
      fields: ['message_type']
    },
    {
      fields: ['content_type']
    }
  ]
});

export default Message;
