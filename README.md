# QQ14微信小程序签到脚本

[![CI](https://github.com/sdjnmxd/qq14-WeSignBot/actions/workflows/ci.yml/badge.svg)](https://github.com/sdjnmxd/qq14-WeSignBot/actions/workflows/ci.yml)
[![Release](https://github.com/sdjnmxd/qq14-WeSignBot/actions/workflows/release.yml/badge.svg)](https://github.com/sdjnmxd/qq14-WeSignBot/actions/workflows/release.yml)
[![Docker Image](https://img.shields.io/docker/pulls/sdjnmxd/qq14-wesignbot)](https://hub.docker.com/r/sdjnmxd/qq14-wesignbot)
[![Test Coverage](https://codecov.io/gh/sdjnmxd/qq14-WeSignBot/branch/main/graph/badge.svg)](https://codecov.io/gh/sdjnmxd/qq14-WeSignBot)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个基于Node.js + TypeScript的QQ14微信小程序自动签到脚本，支持多账号和定时执行。

## ⚠️ 重要免责声明

**本项目仅供学习和研究目的使用。在使用本软件之前，请仔细阅读以下声明：**

### 使用风险

1. **合规性风险**：本软件通过自动化方式完成原本需要人工操作的任务，可能违反相关平台的服务条款。

2. **账号安全风险**：使用自动化脚本可能导致账号被检测、限制或封禁。

3. **法律责任**：使用者需自行承担使用本软件可能产生的法律风险和责任。

### 使用建议

- 请确保您了解并接受使用自动化脚本的风险
- 建议在测试环境中先验证功能
- 使用频率不宜过高，避免对目标平台造成压力
- 定期检查账号状态，发现异常及时停止使用

### 免责条款

- 作者不对使用本软件造成的任何损失承担责任
- 使用者需自行评估使用风险并承担相应后果
- 本软件按"现状"提供，不提供任何明示或暗示的保证

### 道德提醒

请合理使用技术工具，尊重平台规则和其他用户权益。技术应该用于提升效率，而不是破坏公平性。

**使用本软件即表示您已阅读并同意上述声明。**

## 功能特性

### 🔄 自动化任务
- 自动领取每日签到奖励
- 自动完成每日任务并领取奖励
  - 自动点赞帖子
  - 自动查看帖子
  - 其他任务类型暂不支持（也不打算支持）

### 👥 多账号支持
- 可以同时管理多个账号
- 每个账号独立运行，互不影响
- 支持为每个账号设置不同的执行时间
- 支持账号的启用/禁用管理

### ⏰ 定时执行
- 可以设置每天固定的执行时间
- 支持一天执行多次
- 程序启动时可以选择立即执行一次
- 智能调度，避免重复执行

### 🛡️ 安全保护
- 每次操作之间有随机延迟，模拟真人操作
- 遇到错误会自动重试
- 有详细的日志记录，方便查看运行状态
- 频率控制，避免过于频繁的API调用

### 🐳 部署简单
- Docker一键部署
- 配置文件简单易懂
- 支持多架构（amd64/arm64）

## 快速开始

### 🐳 Docker 部署（推荐）

#### 1. 准备配置文件

复制示例配置文件：
```bash
cp accounts.example.json accounts.json
```

编辑 `accounts.json` 文件，配置你的账号信息：

```json
{
  "accounts": [
    {
      "id": "account1",
      "name": "主账号",
      "cookie": "openid=YOUR_OPENID_HERE; acctype=qc; appid=YOUR_APPID_HERE; access_token=YOUR_ACCESS_TOKEN_HERE",
      "schedule": {
        "times": ["08:00", "12:00", "18:00"],
        "runOnStart": true
      },
      "enabled": true
    }
  ],
  "globalSchedule": {
    "times": ["08:00", "12:00", "18:00"],
    "runOnStart": true
  }
}
```

#### 2. 运行容器

**使用最新版本：**
```bash
docker run -d \
  --name qq14-bot \
  -v $(pwd)/accounts.json:/app/accounts.json \
  sdjnmxd/qq14-wesignbot:latest
```

**使用特定版本：**
```bash
docker run -d \
  --name qq14-bot \
  -v $(pwd)/accounts.json:/app/accounts.json \
  sdjnmxd/qq14-wesignbot:v1.0.0
```

**使用Docker Compose：**
```yaml
version: '3.8'
services:
  qq14-bot:
    image: sdjnmxd/qq14-wesignbot:latest
    container_name: qq14-bot
    volumes:
      - ./accounts.json:/app/accounts.json
    restart: unless-stopped
```

#### 3. 查看运行状态

查看日志：
```bash
docker logs qq14-bot
```

查看实时日志：
```bash
docker logs -f qq14-bot
```

停止容器：
```bash
docker stop qq14-bot
```

### 📦 本地部署

#### 1. 环境要求
- Node.js 22.x 或更高版本
- npm 10.x 或更高版本

#### 2. 安装依赖
```bash
npm install
```

#### 3. 配置账号
```bash
cp accounts.example.json accounts.json
# 编辑 accounts.json 文件
```

#### 4. 运行程序
```bash
# 开发模式
npm start

# 生产模式
npm run start:prod

# 多账号模式
npm run start:multi
```

### 🔧 开发环境

#### 1. 克隆项目
```bash
git clone https://github.com/sdjnmxd/qq14-WeSignBot.git
cd qq14-WeSignBot
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

#### 4. 代码质量检查
```bash
# 代码格式化
npm run lint:fix

# 类型检查
npm run type-check
```

## 配置说明

### 账号配置

每个账号包含以下字段：

- `id`: 账号唯一标识（必填）
- `name`: 账号名称（可选，用于日志显示）
- `cookie`: 账号的cookie信息（必填）
- `schedule`: 执行计划配置（可选，不设置则使用全局配置）
- `enabled`: 是否启用该账号（可选，默认为true）

#### 完整配置示例
```json
{
  "accounts": [
    {
      "id": "account1",
      "name": "主账号",
      "cookie": "openid=xxx; acctype=qc; appid=xxx; access_token=xxx",
      "schedule": {
        "times": ["08:00", "12:00", "18:00"],
        "runOnStart": true
      },
      "enabled": true
    },
    {
      "id": "account2", 
      "name": "备用账号",
      "cookie": "openid=yyy; acctype=qc; appid=yyy; access_token=yyy",
      "enabled": false
    }
  ],
  "globalSchedule": {
    "times": ["08:00", "12:00", "18:00"],
    "runOnStart": true
  },
  "globalUA": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "globalReferer": "https://servicewechat.com/wx9d135ab589f8beb9/21/page-frame.html",
  "globalMinDelay": 1000,
  "globalMaxDelay": 3000
}
```

### 执行计划配置

#### 固定时间点执行
```json
{
  "times": ["08:00", "12:00", "18:00"],
  "runOnStart": true
}
```

- `times`: 每天执行的时间点数组（24小时制，格式：HH:MM）
- `runOnStart`: 是否在程序启动时立即执行一次

#### 时间格式说明
- 支持格式：`HH:MM`（如：08:00, 12:30, 18:45）
- 24小时制
- 可以设置多个时间点
- 程序会按照时间顺序执行

### 全局配置

#### globalSchedule
用于设置新账号的默认执行计划。如果账号没有设置 `schedule` 字段，将使用全局配置。

#### globalUA
全局User-Agent设置，用于HTTP请求头。

#### globalReferer  
全局Referer设置，用于HTTP请求头。

#### globalMinDelay / globalMaxDelay
全局延迟范围设置（毫秒），用于控制操作间隔。

### 环境变量支持

支持通过环境变量覆盖配置：

```bash
# 覆盖User-Agent
export WECHAT_UA="自定义UA"

# 覆盖Referer
export WECHAT_REFERER="自定义Referer"

# 覆盖延迟范围
export MIN_DELAY_MS=1000
export MAX_DELAY_MS=3000
```

## 获取Cookie

### 🔍 方法一：使用抓包工具（推荐）

#### 准备工作
1. 安装抓包工具（如：Fiddler、Charles、mitmproxy等）
2. 配置抓包工具代理
3. 在微信中设置代理，连接到抓包工具

#### 获取步骤
1. 打开QQ14小程序
2. 进行任意操作（如查看帖子、点赞等）
3. 在抓包工具中找到API请求
4. 复制请求头中的Cookie信息

#### 推荐工具
- **Fiddler**: Windows平台，功能强大
- **Charles**: 跨平台，界面友好
- **mitmproxy**: 命令行工具，适合自动化

### 📱 方法二：使用手机抓包

#### 准备工作
1. 在手机上安装抓包APP（如：HttpCanary、Packet Capture等）
2. 确保手机和电脑在同一网络

#### 获取步骤
1. 打开抓包APP，选择微信应用
2. 打开QQ14小程序，进行任意操作
3. 在抓包APP中找到API请求
4. 复制请求头中的Cookie信息

#### 推荐APP
- **HttpCanary**: Android平台，功能全面
- **Packet Capture**: 简单易用
- **Thor**: iOS平台专用

### ⚠️ 安全注意事项

#### Cookie安全
- Cookie包含敏感信息，请妥善保管
- 不要在不安全的环境下获取Cookie
- 定期更换Cookie，提高安全性

#### 时效性
- Cookie有时效性，过期需要重新获取
- 建议定期检查Cookie是否有效
- 发现异常及时更新Cookie

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📞 联系方式

- **项目地址**: https://github.com/sdjnmxd/qq14-WeSignBot
- **Docker Hub**: https://hub.docker.com/r/sdjnmxd/qq14-wesignbot
- **问题反馈**: https://github.com/sdjnmxd/qq14-WeSignBot/issues

**⚠️ 再次提醒**: 本项目仅供学习和研究目的使用，请遵守相关平台的服务条款，合理使用技术工具。 