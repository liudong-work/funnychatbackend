import database from '../config/database.js';
import { log } from '../config/logger.js';

/**
 * 数据库连接池监控工具
 * 用于监控连接池状态和性能优化
 */
export class DatabasePoolMonitor {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queryCount: 0,
      averageQueryTime: 0,
      errorCount: 0,
      lastCheck: null
    };
  }

  /**
   * 获取连接池状态
   */
  async getConnectionPoolStatus() {
    try {
      // 获取连接池基本信息
      const sequelize = database;
      const config = sequelize.options.pool;
      
      // 执行健康检查查询
      const startTime = Date.now();
      await sequelize.authenticate();
      const healthCheckTime = Date.now() - startTime;

      // 查询连接池状态 (MySQL特定查询)
      const [poolStatus] = await sequelize.query(`
        SELECT 
          VARIABLE_NAME,
          VARIABLE_VALUE 
        FROM performance_schema.status_variables 
        WHERE VARIABLE_NAME IN (
          'Threads_connected',
          'Threads_running',
          'Connections',
          'Max_used_connections'
        )
      `);

      const statusMap = {};
      poolStatus.forEach(row => {
        statusMap[row.VARIABLE_NAME] = parseInt(row.VARIABLE_VALUE);
      });

      // 构建返回状态
      const poolInfo = {
        config: {
          min: config.min,
          max: config.max,
          acquire: config.acquire,
          idle: config.idle,
          evict: config.evict
        },
        current: {
          threadsConnected: statusMap.Threads_connected || 0,
          threadsRunning: statusMap.Threads_running || 0,
          totalConnections: statusMap.Connections || 0,
          maxUsedConnections: statusMap.Max_used_connections || 0
        },
        performance: {
          healthCheckTime: healthCheckTime,
          uptime: Date.now() - this.startTime,
          isHealthy: healthCheckTime < 1000 // 健康检查在1秒内完成
        },
        recommendations: this.generateRecommendations(config, statusMap, healthCheckTime)
      };

      this.stats.lastCheck = new Date();
      log.debug('数据库连接池状态: ', poolInfo);

      return poolInfo;
    } catch (error) {
      log.error('获取连接池状态失败:', error);
      throw error;
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(config, statusMap, healthCheckTime) {
    const recommendations = [];

    // 连接数建议
    const usage = statusMap.Max_used_connections / config.max * 100;
    if (usage > 90) {
      recommendations.push({
        type: 'warning',
        message: '最大连接使用率过高',
        suggestion: '考虑增加max_connections配置',
        current: `${Math.round(usage)}%`
      });
    } else if (usage < 20) {
      recommendations.push({
        type: 'info',
        message: '连接使用率较低',
        suggestion: '可以考虑减少max_connections以节省资源',
        current: `${Math.round(usage)}%`
      });
    }

    // 响应时间建议
    if (healthCheckTime > 500) {
      recommendations.push({
        type: 'warning',
        message: '数据库响应时间较慢',
        suggestion: '考虑优化acquire_timeout或检查数据库性能',
        current: `${healthCheckTime}ms`
      });
    }

    // 连接池配置建议
    if (config.min === 0) {
      recommendations.push({
        type: 'info',
        message: '最小连接数设置',
        suggestion: '建议设置min_connections为5以提高响应速度',
        current: config.min
      });
    }

    return recommendations;
  }

  /**
   * 执行数据库压力测试
   */
  async performStressTest(testDuration = 30000) {
    log.info(`开始数据库压力测试，持续时间: ${testDuration}ms`);

    const startTime = Date.now();
    const results = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      errors: []
    };

    const responseTimes = [];

    // 并发查询任务
    const concurrentQueries = 20;
    const queries = Array.from({ length: concurrentQueries }, () => 
      this.executeRandomQuery()
    );

    // 执行测试
    while (Date.now() - startTime < testDuration) {
      try {
        const promises = queries.slice(0, concurrentQueries);
        const start = Date.now();
        
        await Promise.allSettled(promises);
        
        const responseTime = Date.now() - start;
        results.totalQueries += concurrentQueries;
        responseTimes.push(responseTime);
        
        // 记录响应时间统计
        if (responseTime > results.maxResponseTime) {
          results.maxResponseTime = responseTime;
        }
        if (responseTime < results.minResponseTime) {
          results.minResponseTime = responseTime;
        }

        // 短暂休息避免过度负载
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failedQueries++;
        results.errors.push({
          time: new Date(),
          error: error.message
        });
        log.error('压力测试查询失败:', error);
      }
    }

    // 计算统计结果
    results.successfulQueries = results.totalQueries - results.failedQueries;
    results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    if (results.successfulQueries > 0) {
      results.successRate = (results.successfulQueries / results.totalQueries * 100).toFixed(2);
    }

    log.info(`数据库压力测试完成:`, results);
    return results;
  }

  /**
   * 执行随机查询进行压力测试
   */
  async executeRandomQuery() {
    const queries = [
      'SELECT COUNT(*) as user_count FROM users',
      'SELECT COUNT(*) as message_count FROM messages',
      'SELECT COUNT(*) as group_count FROM groups',
      'SELECT u.username, COUNT(m.id) as message_count FROM users u LEFT JOIN messages m ON u.id = m.from_user_id GROUP BY u.id LIMIT 10',
      'SELECT g.name, COUNT(gm.id) as member_count FROM groups g LEFT JOIN group_members gm ON g.id = gm.group_id GROUP BY g.id LIMIT 10',
      'SELECT DATE(created_at) as date, COUNT(*) as messages_per_date FROM messages GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7',
      'SELECT * FROM users WHERE username LIKE "%test%" LIMIT 5',
      'SELECT * FROM groups WHERE name LIKE "%group%" LIMIT 5'
    ];

    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    return await database.query(randomQuery, { type: database.QueryTypes.SELECT });
  }

  /**
   * 监控连接池使用情况
   */
  async monitorPoolUsage(duration = 60000, interval = 5000) {
    log.info(`开始监控连接池使用情况，持续时间: ${duration}ms，检查间隔: ${interval}ms`);

    const startTime = Date.now();
    const monitoringData = [];

    const monitorInterval = setInterval(async () => {
      try {
        const status = await this.getConnectionPoolStatus();
        
        const usageData = {
          timestamp: new Date(),
          connectedThreads: status.current.threadsConnected,
          runningThreads: status.current.threadsRunning,
          healthy: status.performance.isHealthy,
          responseTime: status.performance.healthCheckTime
        };

        monitoringData.push(usageData);
        log.debug(`连接池监控数据:`, usageData);

      } catch (error) {
        log.error('监控数据收集失败:', error);
      }
    }, interval);

    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(monitorInterval);
        
        // 分析监控数据
        const analysis = this.analyzeMonitoringData(monitoringData);
        
        log.info(`连接池监控完成，分析结果:`, analysis);
        resolve({
          duration: duration,
          interval: interval,
          dataPoints: monitoringData.length,
          analysis: analysis
        });
      }, duration);
    });
  }

  /**
   * 分析监控数据
   */
  analyzeMonitoringData(monitoringData) {
    if (monitoringData.length === 0) {
      return { error: '无监控数据可用' };
    }

    const connectedThreads = monitoringData.map(d => d.connectedThreads);
    const runningThreads = monitoringData.map(d => d.runningThreads);
    const responseTimes = monitoringData.map(d => d.responseTime);

    return {
      averageConnectedThreads: (connectedThreads.reduce((a, b) => a + b, 0) / connectedThreads.length).toFixed(2),
      maxConnectedThreads: Math.max(...connectedThreads),
      minConnectedThreads: Math.min(...connectedThreads),
      
      averageRunningThreads: (runningThreads.reduce((a, b) => a + b, 0) / runningThreads.length).toFixed(2),
      maxRunningThreads: Math.max(...runningThreads),
      
      averageResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2),
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      
      healthyPercentage: (monitoringData.filter(d => d.healthy).length / monitoringData.length * 100).toFixed(2)
    };
  }

  /**
   * 获取慢查询日志
   */
  async getSlowQueryLog() {
    try {
      const [slowQueries] = await database.query(`
        SELECT 
          query_time,
          lock_time,
          rows_sent,
          rows_examined,
          sql_text,
          start_time
        FROM mysql.slow_log 
        WHERE start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY query_time DESC
        LIMIT 20
      `);

      log.info(`发现 ${slowQueries.length} 条慢查询`);
      return slowQueries.map(query => ({
        executionTime: query.query_time,
        lockTime: query.lock_time,
        rowsSent: query.rows_sent,
        rowsExamined: query.rows_examined,
        query: query.sql_text.substring(0, 200) + '...',
        startTime: query.start_time
      }));
    } catch (error) {
      if (error.message.includes('slow_log')) {
        log.warn('慢查询日志不可用，可能是权限问题或slow_log表不存在');
        return [];
      }
      throw error;
    }
  }

  /**
   * 数据库连接池健康检查
   */
  async healthCheck() {
    const checks = [];

    // 基础连接测试
    try {
      const startTime = Date.now();
      await database.authenticate();
      const responseTime = Date.now() - startTime;
      
      checks.push({
        name: '数据库连接',
        status: responseTime < 1000 ? 'healthy' : 'warning',
        responseTime: responseTime,
        message: responseTime < 1000 ? '连接正常' : '响应较慢'
      });
    } catch (error) {
      checks.push({
        name: '数据库连接',
        status: 'error',
        message: `连接失败: ${error.message}`
      });
    }

    // 查询测试
    try {
      const startTime = Date.now();
      await database.query('SELECT 1 as test');
      const responseTime = Date.now() - startTime;
      
      checks.push({
        name: '查询执行',
        status: responseTime < 500 ? 'healthy' : 'warning',
        responseTime: responseTime,
        message: responseTime < 500 ? '查询正常' : '查询较慢'
      });
    } catch (error) {
      checks.push({
        name: '查询执行',
        status: 'error',
        message: `查询失败: ${error.message}`
      });
    }

    // 并发连接测试
    try {
      const promises = Array.from({ length: 5 }, () => 
        database.query('SELECT COUNT(*) as count FROM users')
      );
      await Promise.all(promises);
      
      checks.push({
        name: '并发连接测试',
        status: 'healthy',
        message: '并发连接正常'
      });
    } catch (error) {
      checks.push({
        name: '并发连接测试',
        status: 'error',
        message: `并发测试失败: ${error.message}`
      });
    }

    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const overallStatus = healthyCount === checks.length ? 'healthy' : 
                         healthyCount > 0 ? 'warning' : 'error';

    
    return {
      overallStatus,
      checks,
      timestamp: new Date(),
      healthyRatio: `${healthyCount}/${checks.length}`
    };
  }
}
