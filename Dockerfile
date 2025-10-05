# Node.js 聊天后端 - Docker开箱即用镜像

FROM node:18-alpine

# 安装系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 创建应用目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY . .

# 创建必要目录
RUN mkdir -p uploads logs && \
    chown -R node:node uploads logs

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S chat -u 1001 -G nodejs

# 设置用户权限
USER chat

# 暴露端口
EXPOSE 8888

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8888/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
