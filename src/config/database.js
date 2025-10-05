import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'chat',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root1234',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 20,        // 最大连接数
    min: parseInt(process.env.DB_POOL_MIN) || 5,         // 最小连接数
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000, // 获取连接超时时间
    idle: parseInt(process.env.DB_POOL_IDLE) || 30000,   // 连接空闲超时时间
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000,  // 检查空闲连接间隔
    handleDisconnects: process.env.DB_HANDLE_DISCONNECTS !== 'false'
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true, // 软删除
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
};

const sequelize = new Sequelize(dbConfig);

export default sequelize;
