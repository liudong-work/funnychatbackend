import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// 用户注册 - 不需要认证
router.post('/user/register', 
  validate(schemas.userRegister),
  userController.register
);

// 用户登录 - 不需要认证
router.post('/user/login',
  validate(schemas.userLogin),
  userController.login
);

// 获取用户详情 - 需要认证
router.get('/user/:uuid',
  validate(schemas.uuidParam, 'params'),
  authenticateToken,
  userController.getUserDetails
);

// 修改用户信息 - 需要认证
router.put('/user',
  authenticateToken,
  validate(schemas.userUpdate),
  userController.updateUserInfo
);

// 获取好友列表 - 需要认证
router.get('/user',
  authenticateToken,
  validate(schemas.usernameQuery),
  userController.getUserFriends
);

// 添加好友 - 需要认证
router.post('/friend',
  authenticateToken,
  validate(schemas.addFriend),
  userController.addFriend
);

// 搜索用户和群组 - 需要认证
router.get('/user/name',
  authenticateToken,
  validate(schemas.usernameQuery, 'query'),
  userController.searchUserOrGroup
);

export default router;
