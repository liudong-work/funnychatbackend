import express from 'express';
import { groupController } from '../controllers/groupController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * 创建群组
 * POST /api/group
 */
router.post('/group',
  authenticateToken,
  validate(schemas.groupCreate),
  groupController.createGroup
);

/**
 * 获取用户群组列表
 * GET /api/group
 */
router.get('/group',
  authenticateToken,
  groupController.getUserGroups
);

/**
 * 获取群组详情
 * GET /api/group/:uuid
 */
router.get('/group/:uuid',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.getGroupDetails
);

/**
 * 加入群组
 * POST /api/group/:groupUuid/join
 */
router.post('/group/:groupUuid/join',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.joinGroup
);

/**
 * 获取群成员列表
 * GET /api/group/:groupUuid/members
 */
router.get('/group/:groupUuid/members',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.getGroupMembers
);

/**
 * 退出群组
 * DELETE /api/group/:groupUuid/members/self
 */
router.delete('/group/:groupUuid/members/self',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.leaveGroup
);

/**
 * 更新群组信息
 * PUT /api/group/:groupUuid
 */
router.put('/group/:groupUuid',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  validate(schemas.groupUpdate),
  groupController.updateGroup
);

/**
 * 删除群组
 * DELETE /api/group/:groupUuid
 */
router.delete('/group/:groupUuid',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.deleteGroup
);

/**
 * 设置群成员禁言
 * POST /api/group/:groupUuid/members/:memberUuid/mute
 */
router.post('/group/:groupUuid/members/:memberUuid/mute',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.muteMember
);

/**
 * 设置群昵称
 * PUT /api/group/:groupUuid/nickname
 */
router.put('/group/:groupUuid/nickname',
  authenticateToken,
  validate(schemas.uuidParam, 'params'),
  groupController.setGroupNickname
);

export default router;
