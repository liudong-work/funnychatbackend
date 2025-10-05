# 数据库连接池优化配置

## 环境变量配置

将以下配置添加到 `.env` 文件中：

```bash
# ===========================================
# 连接池优化配置
# ===========================================

# 连接池大小配置
# - max: 最大连接数，建议值 10-50，根据服务器配置调整
# - min: 最小连接数，建议值 5-10，预热连接池
DB_POOL_MAX=20
DB_POOL_MIN=5

# 超时配置 (毫秒)
# - acquire: 获取连接超时，建议值 30000-60000
# - idle: 连接空闲超时，建议值 10000-30000
# - evict: 空闲连接检查间隔，建议值 1000-5000
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=30000
DB_POOL_EVICT=1000

# 连接处理配置
DB_HANDLE_DISCONNECTS=true
```

## MySQL性能调优

### my.cnf 配置文件优化

```ini
[mysqld]
# 连接相关
max_connections = 200              # 最大连接数
max_connect_errors = 10000        # 最大连接错误数
connect_timeout = 10              # 连接超时
wait_timeout = 28800              # 等待超时
interactive_timeout = 28800       # 交互超时

# 缓冲区配置
innodb_buffer_pool_size = 1G      # InnoDB缓冲池大小
innodb_log_buffer_size = 64M      # InnoDB日志缓冲区
innodb_log_file_size = 256M       # InnoDB日志文件大小

# 查询缓存
query_cache_size = 64M            # 查询缓存大小
query_cache_type = 1              # 查询缓存类型

# 慢查询日志
slow_query_log = 1                # 启用慢查询日志
long_query_time = 1               # 慢查询时间阈值(秒)
slow_query_log_file = /var/log/mysql/slow.log
```

## 使用场景优化

### 🎯 高并发场景 (WebSocket+实时消息)
```bash
DB_POOL_MAX=50
DB_POOL_MIN=10
DB_POOL_ACQUIRE=30000
```

### 🎯 中等负载 (普通Web应用)
```bash
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
```

### 🎯 低负载 (开发环境)
```bash
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=10000
```

## 生产环境建议

### 🚀 硬件要求
- **RAM**: 最少4GB，推荐8GB+
- **CPU**: 多核处理器
- **存储**: SSD硬盘推荐

### 📊 监控指标
- 连接池使用率
- 平均响应时间
- 慢查询数量
- 数据库错误率
