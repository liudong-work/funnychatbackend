import cors from 'cors';
import { config } from '../config/config.js';

/**
 * CORS配置中间件
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    // 开发环境允许所有来源
    if (config.app.env === 'development') {
      return callback(null, true);
    }

    // 生产环境配置允许的域名
    const allowedOrigins = [
      'http://localhost:3000',
      'https://your-frontend-domain.com'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的CORS请求'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: [
    'Content-Length',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Cache-Control',
    'Content-Language',
    'Content-Type'
  ]
});

/**
 * 错误处理中间件
 */
export const errorHandler = (err, req, res, next) => {
  console.error('服务器错误:', err);

  // CORS错误
  if (err.message === '不允许的CORS请求') {
    return res.status(403).json({
      status: false,
      message: '跨域请求被拒绝'
    });
  }

  // JSON解析错误
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: false,
      message: '请求数据格式错误'
    });
  }

  // 默认服务器错误
  res.status(500).json({
    status: false,
    message: config.app.env === 'development' ? err.message : '服务器内部错误'
  });
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * 全局异常处理中间件
 */
export const globalErrorHandler = (err, req, res, next) => {
  // 记录错误
  console.error('未处理的错误:', err);

  // 统一错误响应格式
  const response = {
    status: false,
    message: err.message || '服务器内部错误'
  };

  // 开发环境包含堆栈信息
  if (config.app.env === 'development') {
    with.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
};
