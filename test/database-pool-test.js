#!/usr/bin/env node

/**
 * 数据库连接池性能测试脚本
 * 使用方法: node test/database-pool-test.js [testType] [duration]
 * 
 * testType:
 *   health     - 基础健康检查
 *   stress     - 压力测试
 *   monitor    - 监控测试
 *   slow       - 慢查询分析
 *   all        - 全部测试
 * 
 * duration: 测试持续时间(毫秒)
 */

import path from 'path';
import { fileURLToPath } from 'url';

// 设置模块解析路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// 动态导入项目模块
const modulePath = path.join(projectRoot, 'src/utils/dbPoolMonitor.js');
const { DatabasePoolMonitor } = await import(modulePath);

const monitor = new DatabasePoolMonitor();

// 解析命令行参数
const [,, testType = 'health', duration = '30000'] = process.argv;

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始数据库连接池测试...\n');
  console.log(`📊 测试类型: ${testType}`);
  console.log(`⏱️  持续时间: ${duration}ms\n`);

  switch (testType.toLowerCase()) {
    case 'health':
      await runHealthCheck();
      break;
    case 'stress':
      await runStressTest(parseInt(duration));
      break;
    case 'monitor':
      await runMonitorTest(parseInt(duration));
      break;
    case 'slow':
      await runSlowQueryAnalysis();
      break;
    case 'all':
      await runAllTests(parseInt(duration));
      break;
    default:
      console.log('❌ 无效的测试类型');
      printUsage();
      process.exit(1);
  }
}

/**
 * 健康检查测试
 */
async function runHealthCheck() {
  console.log('🏥 执行数据库健康检查...\n');

  try {
    const healthReport = await monitor.healthCheck();
    
    console.log(`📈 整体状态: ${getStatusEmoji(healthReport.overallStatus)} ${healthReport.overallStatus.toUpperCase()}`);
    console.log(`📊 健康比例: ${healthReport.healthyRatio}\n`);

    healthReport.checks.forEach(check => {
      console.log(`${getStatusEmoji(check.status)} ${check.name}:`);
      console.log(`   ${check.message}`);
      if (check.responseTime) {
        console.log(`   ⏱️  响应时间: ${check.responseTime}ms`);
      }
      console.log('');
    });

    // 显示优化建议
    if (healthReport.overallStatus === 'warning' || healthReport.overallStatus === 'error') {
      console.log('💡 优化建议:');
      console.log('   - 检查数据库服务器负载');
      console.log('   - 优化数据库查询语句');
      console.log('   - 检查网络连接状态');
      console.log('   - 考虑增加连接池配置\n');
    }

  } catch (error) {
    console.log(`❌ 健康检查失败: ${error.message}\n`);
  }
}

/**
 * 压力测试
 */
async function runStressTest(duration) {
  console.log(`💪 执行压力测试 (${duration}ms)...\n`);

  try {
    const startTime = Date.now();
    const results = await monitor.performStressTest(duration);
    const totalTime = Date.now() - startTime;

    console.log('📊 压力测试结果:');
    console.log(`   📈 总查询数: ${results.totalQueries}`);
    console.log(`   ✅ 成功查询: ${results.successfulQueries}`);
    console.log(`   ❌ 失败查询: ${results.failedQueries}`);
    console.log(`   📊 成功率: ${results.successRate || 0}%`);
    console.log(`   ⏱️  平均响应时间: ${results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   📈 最大响应时间: ${results.maxResponseTime}ms`);
    console.log(`   📉 最小响应时间: ${results.minResponseTime}ms`);
    console.log(`   🕒 总测试时间: ${totalTime}ms\n`);

    // 性能分析
    if (results.successRate < 95) {
      console.log('⚠️  警告: 成功率低于90%');
      console.log('   - 检查数据库负载状态');
      console.log('   - 考虑增加连接池大小');
      console.log('   - 优化查询性能\n');
    }

    if (results.averageResponseTime > 1000) {
      console.log('⚠️  警告: 平均响应时间超过1秒');
      console.log('   - 检查数据库索引');
      console.log('   - 优化慢查询');
      console.log('   - 考虑数据库升级\n');
    }

  } catch (error) {
    console.log(`❌ 压力测试失败: ${error.message}\n`);
  }
}

/**
 * 监控测试
 */
async function runMonitorTest(duration) {
  console.log(`📊 执行连接池监控 (${duration}ms)...\n`);

  try {
    const results = await monitor.monitorPoolUsage(duration, 5000);
    
    console.log('📈 监控结果:');
    console.log(`   📊 数据点: ${results.dataPoints}`);
    console.log(`   📌 平均连接线程: ${results.analysis.averageConnectedThreads}`);
    console.log(`   📈 最大连接线程: ${results.analysis.maxConnectedThreads}`);
    console.log(`   📉 最小连接线程: ${results.analysis.minConnectedThreads}`);
    console.log(`   🎯 平均运行线程: ${results.analysis.averageRunningThreads}`);
    console.log(`   📈 最大运行线程: ${results.analysis.maxRunningThreads}`);
    console.log(`   ⏱️  平均响应时间: ${results.analysis.averageResponseTime}ms`);
    console.log(`   📈 最大响应时间: ${results.analysis.maxResponseTime}ms`);
    console.log(`   📉 最小响应时间: ${results.analysis.minResponseTime}ms`);
    console.log(`   💚 健康状态比例: ${results.analysis.healthyPercentage}%\n`);

  } catch (error) {
    console.log(`❌ 监控测试失败: ${error.message}\n`);
  }
}

/**
 * 慢查询分析
 */
async function runSlowQueryAnalysis() {
  console.log('🐌 分析慢查询...\n');

  try {
    const slowQueries = await monitor.getSlowQueryLog();
    
    if (slowQueries.length === 0) {
      console.log('✅ 未发现慢查询，数据库性能良好\n');
      return;
    }

    console.log(`⚠️  发现 ${slowQueries.length} 条慢查询:\n`);

    slowQueries.forEach((query, index) => {
      console.log(`📄 慢查询 #${index + 1}:`);
      console.log(`   ⏱️  执行时间: ${query.executionTime}s`);
      console.log(`   🔒 锁定时间: ${query.lockTime}s`);
      console.log(`   📊 返回行数: ${query.rowsSent}`);
      console.log(`   🔍 检查行数: ${query.rowsExamined}`);
      console.log(`   📅 开始时间: ${query.startTime}`);
      console.log(`   💬 SQL: ${query.query}\n`);
    });

    console.log('💡 慢查询优化建议:');
    console.log('   - 添加适当的数据库索引');
    console.log('   - 优化复杂查询语句');
    console.log('   - 考虑查询分解或缓存');
    console.log('   - 检查WHERE子句和JOIN条件\n');

  } catch (error) {
    console.log(`❌ 慢查询分析失败:${error.message}\n`);
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(duration) {
  console.log('🎯 执行完整数据库测试套装...\n');

  await runHealthCheck();
  await runStressTest(duration);
  await runMonitorTest(Math.min(duration, 60000)); // 监控测试最多60秒
  await runSlowQueryAnalysis();

  console.log('🎉 所有测试完成！\n');
}

/**
 * 获取状态emoji
 */
function getStatusEmoji(status) {
  const emojiMap = {
    'healthy': '✅',
    'warning': '⚠️',
    'error': '❌',
    'info': 'ℹ️'
  };
  return emojiMap[status] || '❓';
}

/**
 * 打印使用说明
 */
function printUsage() {
  console.log(`
📖 数据库连接池测试工具使用说明:

🔧 使用方法:
   node test/database-pool-test.js [testType] [duration]

📊 测试类型 (testType):
   health     - 基础健康检查
   stress     - 压力测试
   monitor    - 连接池监控
   slow       - 慢查询分析
   all        - 全部测试

⏱️  持续时间 (duration):
   毫秒单位为整数
   默认: 30000ms

💡 示例:
   node test/database-pool-test.js health
   node test/database-pool-test.js stress 60000
   node test/database-pool-test.js all 30000
`);
}

// 捕获未处理的异常
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 测试中断，正在退出...');
  process.exit(0);
});

// 启动测试
runTests().catch(error => {
  console.log(`❌ 测试执行失败: ${error.message}\n`);
  process.exit(1);
});
