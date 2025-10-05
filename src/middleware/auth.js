import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { config } from '../config/config.js';
import { log } from '../config/logger.js';

/**
 * JWT认证中间件
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: '访问令牌缺失'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        status: false,
        message: '用户不存在'
      });
    }

    req.user = user.toJSON();
    next();
  } catch (error) {
    log.error('Token验证失败:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: false,
        message: '无效的访问令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: false,
        message: '访问令牌已过期'
      });
    }

    return res.status(500).json({
      status: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 可选的JWT认证中间件
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.userId);
      
      if (user) {
        req.user = user.toJSON();
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败不阻止请求
    next();
  }
};

/**
 * 生成JWT令牌
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    uuid: user.uuid
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};
