# 部署和测试指南

本文档提供完整的部署和测试流程，帮助您快速启动和测试视频上传播放系统。

## 环境要求

### 必需软件
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **FFmpeg**: >= 4.0（用于视频转码）
- **Nginx**: >= 1.18（生产环境）

### 验证安装
```bash
node --version
mysql --version
ffmpeg -version
nginx -v
```

## 快速开始（开发环境）

### 步骤1：安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 步骤2：配置数据库

登录 MySQL 并创建数据库：

```bash
mysql -u root -p
```

```sql
CREATE DATABASE video_upload CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 步骤3：初始化数据库

执行初始化脚本：

```bash
mysql -u root -p video_upload < backend/database/init.sql
```

### 步骤4：配置环境变量

复制环境变量模板并修改配置：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=video_upload
JWT_SECRET=your-random-secret-key-here
UPLOAD_PASSWORD=admin123
```

### 步骤5：启动后端服务

```bash
cd backend
npm run dev
```

后端将在 `http://localhost:3000` 启动。

### 步骤6：启动前端服务

打开新终端：

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 步骤7：访问应用

- **播放页面**: http://localhost:5173/
- **上传页面**: http://localhost:5173/upload

## 生产环境部署

### 1. 构建前端

```bash
cd frontend
npm run build
```

构建产物位于 `frontend/dist` 目录。

### 2. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/video-upload`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/video-upload-play/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # HLS 视频文件
    location /hls/ {
        alias /path/to/video-upload-play/storage/hls/;
        add_header Cache-Control "public, max-age=3600";
        add_header Access-Control-Allow-Origin *;
    }

    client_max_body_size 2G;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/video-upload /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 使用 PM2 管理后端

安装 PM2：

```bash
npm install -g pm2
```

启动后端服务：

```bash
cd backend
pm2 start server.js --name video-upload-backend
pm2 save
pm2 startup
```

常用 PM2 命令：

```bash
pm2 list              # 查看进程列表
pm2 logs              # 查看日志
pm2 restart all       # 重启所有进程
pm2 stop all          # 停止所有进程
```

### 4. 配置系统服务（可选）

创建 systemd 服务文件 `/etc/systemd/system/video-upload.service`:

```ini
[Unit]
Description=Video Upload Backend
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/video-upload-play/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable video-upload
sudo systemctl start video-upload
sudo systemctl status video-upload
```

## 测试流程

### 1. 测试上传功能

1. 访问上传页面：http://localhost:5173/upload
2. 输入上传密码（默认：`admin123`）
3. 填写课程信息：
   - 课程名称：测试课程
   - 讲师：测试讲师
4. 选择视频文件（建议使用小文件测试，如 < 100MB）
5. 点击"开始上传"
6. 观察上传进度条

**预期结果**：
- 上传进度显示正常
- 上传完成后显示成功消息
- 后台开始视频转码任务

### 2. 测试视频切片

查看后端日志确认转码进度：

```bash
# 开发环境
cd backend
npm run dev

# 生产环境（PM2）
pm2 logs video-upload-backend
```

**预期日志**：
```
开始处理视频转码任务...
FFmpeg 转码开始: test-video.mp4
FFmpeg 转码完成: test-video.mp4
视频转码完成，更新数据库状态
```

检查 HLS 文件生成：

```bash
ls -lh storage/hls/
```

应该看到 `.m3u8` 和 `.ts` 文件。

### 3. 测试播放功能

1. 访问播放页面：http://localhost:5173/
2. 在课程列表中找到刚上传的视频
3. 点击"播放"按钮
4. 测试播放器功能：
   - 播放/暂停
   - 进度条拖动
   - 音量调节
   - 全屏模式

**预期结果**：
- 视频加载正常
- 播放流畅无卡顿
- 控制按钮响应正常

## 常见问题

### FFmpeg 未安装

**症状**：上传成功但视频状态一直为"处理中"

**解决方案**：

Windows:
```bash
# 使用 Chocolatey
choco install ffmpeg

# 或下载安装包
# https://ffmpeg.org/download.html
```

Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

macOS:
```bash
brew install ffmpeg
```

### 数据库连接失败

**症状**：后端启动报错 `ER_ACCESS_DENIED_ERROR`

**解决方案**：

1. 检查 `.env` 文件中的数据库配置
2. 确认 MySQL 服务运行中：
   ```bash
   # Linux
   sudo systemctl status mysql
   
   # Windows
   net start MySQL80
   ```
3. 测试数据库连接：
   ```bash
   mysql -u root -p -h localhost video_upload
   ```

### 文件上传失败

**症状**：上传时报错 `Request Entity Too Large`

**解决方案**：

1. 检查 Nginx 配置中的 `client_max_body_size`
2. 修改配置并重启：
   ```nginx
   client_max_body_size 2G;
   ```
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 视频无法播放

**症状**：播放器显示错误或黑屏

**解决方案**：

1. 检查 HLS 文件是否生成：
   ```bash
   ls storage/hls/
   ```

2. 检查文件权限：
   ```bash
   chmod -R 755 storage/
   ```

3. 检查浏览器控制台错误：
   - 按 F12 打开开发者工具
   - 查看 Console 和 Network 标签

4. 验证 CORS 配置（生产环境）：
   ```nginx
   add_header Access-Control-Allow-Origin *;
   ```

### 端口被占用

**症状**：启动时报错 `EADDRINUSE`

**解决方案**：

查找并终止占用端口的进程：

Windows:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Linux/macOS:
```bash
lsof -i :3000
kill -9 <PID>
```

或修改 `.env` 中的 `PORT` 配置。

## 性能优化建议

### 1. 数据库优化
- 为常用查询字段添加索引
- 定期清理过期数据
- 使用连接池

### 2. 视频存储优化
- 使用 CDN 分发 HLS 文件
- 定期清理未使用的视频文件
- 考虑使用对象存储（如 AWS S3）

### 3. 转码优化
- 调整 FFmpeg 参数以平衡质量和速度
- 使用硬件加速（如 NVIDIA GPU）
- 实现分布式转码队列

## 安全建议

1. **修改默认密码**：更改 `UPLOAD_PASSWORD` 和 `JWT_SECRET`
2. **启用 HTTPS**：使用 Let's Encrypt 免费证书
3. **限制上传大小**：根据需求设置合理的文件大小限制
4. **定期备份**：备份数据库和视频文件
5. **监控日志**：定期检查异常访问和错误日志

## 监控和维护

### 日志位置
- **后端日志**：PM2 日志或 systemd journal
- **Nginx 日志**：`/var/log/nginx/access.log` 和 `error.log`
- **MySQL 日志**：`/var/log/mysql/error.log`

### 定期维护任务
```bash
# 清理旧的视频文件（示例：30天前）
find storage/hls/ -type f -mtime +30 -delete

# 优化数据库表
mysql -u root -p video_upload -e "OPTIMIZE TABLE courses;"

# 检查磁盘空间
df -h
```

## 技术支持

如遇到其他问题，请检查：
1. 后端日志输出
2. 浏览器开发者工具
3. Nginx 错误日志
4. MySQL 错误日志

确保所有服务正常运行并且配置正确。