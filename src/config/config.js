import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // 应用配置
  app: {
    name: 'Node.js Chat Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 8888,
    host: process.env.HOST || 'localhost'
  },

  // 数据库配置
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'chat',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root1234',
    prefix: process.env.DB_TABLE_PREFIX || ''
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'nodejs-chat-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // 文件上传配置
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads/',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'debug',
    path: process.env.LOG_PATH || 'logs/chat.log'
  },

  // WebSocket配置
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000
  },

  // Kafka配置
  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true',
    hosts: process.env.KAFKA_HOSTS || 'kafka:9092',
    topic: process.env.KAFKA_TOPIC || 'node-chat-message'
  }
};
