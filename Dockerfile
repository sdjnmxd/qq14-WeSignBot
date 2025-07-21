FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY src/ ./src/
COPY tsconfig.json ./

# 构建项目
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist

# 复制配置文件
COPY accounts.example.json ./accounts.json

# 设置环境变量
ENV NODE_ENV=production
ENV USE_MULTI_ACCOUNT=true

# 暴露端口（如果需要）
# EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"] 