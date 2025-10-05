import express from 'express';
import { DatabasePoolMonitor } from '../utils/dbPoolMonitor.js';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';

const router = express.Router();

// 初始化监控器
const dbMonitor = new DatabasePoolMonitor();

/**
 * 管理员路由 - 数据库连接池监控和管理
 */

/**
 * 数据库健康检查
 * GET /api/admin/database/health
 */
router.get('/database/health', authenticateToken, async (req, res) => {
  try {
    // TODO: 添加管理员权限检查
    const healthReport = await dbMonitor.healthCheck();
    
    res.json({
      status: true,
      message: '数据库健康检查完成',
      data: healthReport
    });
  } catch (error) {
    log.error('数据库健康检查失败:', error);
    res.status(500).json({
      status: false,
      message: '数据库健康检查失败',
      error: error.message
    });
  }
});

/**
 * 获取连接池状态
 * GET /api/admin/database/status
 */
router.get('/database/status', authenticateToken, async (req, res) => {
  try {
    const status = await dbMonitor.getConnectionPoolStatus();
    
    res.json({
      status: true,
      message: '连接池状态获取成功',
      data: status
    });
  } catch (error) {
    log.error('获取连接池状态失败:', error);
    res.status(500).json({
      status: false,
      message: '获取连接池状态失败',
      error: error.message
    });
  }
});

/**
 * 数据库压力测试
 * POST /api/admin/database/stress-test
 */
router.post('/database/stress-test', authenticateToken, async (req, res) => {
  try {
    const { duration = 30000 } = req.body;
    
    // 限制测试时间，防止过长测试
    const testDuration = Math.min(parseInt(duration) || 30000, 120000);
    
    log.info(`管理员 ${req.user.username} 启动数据库压力测试，持续时间: ${testDuration}ms`);
    
    // 异步执行压力测试
    const testPromise = dbMonitor.performStressTest(testDuration);
    
    res.json({
      status: true,
      message: `压力测试已启动，预计耗时 ${testDuration}ms`,
      data: {
        testId: `stress_test_${Date.now()}`,
        duration: testDuration,
        startedAt: new Date()
      }
    });

    // 等待测试完成并记录结果
    testPromise.then(results => {
      log.info('压力测试完成:', results);
    }).catch(error => {
      log.error('压力测试失败:', error);
    });

  } catch (error) {
    log.error('启动压力测试失败:', error);
    res.status(500).json({
      status: false,
      message: '启动压力测试失败',
      error: error.message
    });
  }
});

/**
 * 慢查询分析
 * GET /api/admin/database/slow-queries
 */
router.get('/database/slow-queries', authenticateToken, async (req, res) => {
  try {
    const slowQueries = await dbMonitor.getSlowQueryLog();
    
    res.json({
      status: true,
      message: `发现 ${slowQueries.length} 条慢查询`,
      data: {
        count: slowQueries.length,
        queries: slowQueries
      }
    });
  } catch (error) {
    log.error('慢查询分析失败:', error);
    res.status(500).json({
      status: false,
      message: '慢查询分析失败',
      error: error.message
    });
  }
});

/**
 * 连接池监控数据
 * POST /api/admin/database/monitor
 */
router.post('/database/monitor', authenticateToken, async (req, res) => {
  try {
    const { duration = 60000, interval = 5000 } = req.body;
    
    // 限制监控时间和间隔
    const monitorDuration = Math.min(parseInt(duration) || 60000, 300000);
    const monitorInterval = Math.min(parseInt(interval) || 5000, 30000);
    
    log.info(`管理员 ${req.user.username} 启动数据库监控，持续时间: ${monitorDuration}ms`);
    
    // 异步执行监控
    const monitorPromise = dbMonitor.monitorPoolUsage(monitorDuration, monitorInterval);
    
    res.json({
      status: true,
      message: `连接池监控已启动`,
      data: {
        monitorId: `monitor_${Date.now()}`,
        duration: monitorDuration,
        interval: monitorInterval,
        startedAt: new Date()
      }
    });

    // 等待监控完成并记录结果
    monitorPromise.then(results => {
      log.info('连接池监控完成:', results);
    }).catch(error => {
      log.error('连接池监控失败:', error);
    });

  } catch (error) {
    log.error('启动连接池监控失败:', error);
    res.status(500).json({
      status: false,
      message: '启动连接池监控失败',
      error: error.message
    });
  }
});

export default router;
