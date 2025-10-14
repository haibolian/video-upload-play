# 视频上传播放系统

基于 Vue3 + Express + MySQL 的视频上传和 HLS 播放系统。

## 项目结构

```
video-upload-play/
├── backend/              # Express 后端
│   ├── config/          # 配置文件
│   │   └── db.js       # 数据库连接
│   ├── server.js       # 服务器入口
│   ├── package.json    # 后端依赖
│   └── .env.example    # 环境变量模板
├── frontend/            # Vue3 前端
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── router/     # 路由配置
│   │   ├── App.vue     # 根组件
│   │   └── main.js     # 应用入口
│   ├── index.html      # HTML 入口
│   ├── vite.config.js  # Vite 配置
│   └── package.json    # 前端依赖
├── storage/
│   ├── original/       # 原始视频存储
│   └── hls/           # HLS 切片存储
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env` 并配置：

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=video_upload
JWT_SECRET=your_secret_key
UPLOAD_PASSWORD=admin123
```

### 3. 创建数据库

在 MySQL 中创建数据库：

```sql
CREATE DATABASE video_upload;
```

### 4. 启动服务

```bash
# 启动后端（在 backend 目录）
npm run dev

# 启动前端（在 frontend 目录）
npm run dev
```

### 5. 访问应用

- 前端地址：http://localhost:5173
- 后端地址：http://localhost:3000
- 播放页面：http://localhost:5173/
- 上传页面：http://localhost:5173/upload

## 技术栈

### 后端
- Express - Web 框架
- MySQL2 - 数据库驱动
- Multer - 文件上传
- JWT - 身份验证
- FFmpeg - 视频转码（需单独安装）

### 前端
- Vue 3 - 前端框架
- Vue Router - 路由管理
- Axios - HTTP 客户端
- Video.js - 视频播放器
- Vite - 构建工具

## 下一步

1. 创建数据库表结构
2. 实现视频上传接口
3. 实现 FFmpeg 视频转码功能
4. 实现视频列表和播放功能
5. 添加用户认证和权限控制