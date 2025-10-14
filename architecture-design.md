# 课程视频上传播放网站 - 技术架构设计方案

## 1. 项目目录结构

```
video-upload-play/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.js    # 数据库配置
│   │   │   └── app.js         # 应用配置
│   │   ├── controllers/       # 控制器
│   │   │   ├── upload.js      # 上传控制器
│   │   │   ├── course.js      # 课程控制器
│   │   │   └── video.js       # 视频控制器
│   │   ├── models/            # 数据模型
│   │   │   ├── Course.js      # 课程模型
│   │   │   └── Video.js       # 视频模型
│   │   ├── services/          # 业务逻辑
│   │   │   ├── ffmpeg.js      # FFmpeg处理服务
│   │   │   └── queue.js       # 任务队列服务
│   │   ├── middleware/        # 中间件
│   │   │   └── auth.js        # 密码验证中间件
│   │   ├── routes/            # 路由
│   │   │   └── index.js       # 路由配置
│   │   └── app.js             # 应用入口
│   ├── package.json
│   └── .env                   # 环境变量
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── views/             # 页面组件
│   │   │   ├── Home.vue       # 播放页面（首页）
│   │   │   └── Upload.vue     # 上传页面
│   │   ├── components/        # 公共组件
│   │   │   ├── VideoPlayer.vue    # 视频播放器
│   │   │   ├── CourseList.vue     # 课程列表
│   │   │   └── UploadForm.vue     # 上传表单
│   │   ├── router/            # 路由配置
│   │   │   └── index.js
│   │   ├── api/               # API接口
│   │   │   └── index.js
│   │   ├── App.vue
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
├── storage/                    # 存储目录
│   ├── original/              # 原始视频
│   └── hls/                   # HLS切片文件
│       └── [course_id]/
│           └── [video_id]/
│               ├── index.m3u8
│               └── *.ts
├── nginx/                      # Nginx配置
│   └── video-site.conf
├── sql/                        # 数据库脚本
│   └── init.sql
└── README.md
```

## 2. 数据库设计

### 2.1 课程表 (courses)

```sql
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '课程标题',
  description TEXT COMMENT '课程描述',
  cover_image VARCHAR(500) COMMENT '封面图片URL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程表';
```

### 2.2 视频表 (videos)

```sql
CREATE TABLE videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL COMMENT '课程ID',
  title VARCHAR(255) NOT NULL COMMENT '视频标题',
  episode INT NOT NULL COMMENT '集数',
  duration INT COMMENT '时长（秒）',
  original_path VARCHAR(500) COMMENT '原始视频路径',
  hls_path VARCHAR(500) COMMENT 'HLS播放路径',
  status ENUM('uploading', 'processing', 'completed', 'failed') DEFAULT 'uploading' COMMENT '处理状态',
  file_size BIGINT COMMENT '文件大小（字节）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id, episode),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视频表';
```

### 2.3 任务队列表 (task_queue)

```sql
CREATE TABLE task_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  video_id INT NOT NULL COMMENT '视频ID',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT COMMENT '错误信息',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  INDEX idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务队列表';
```

## 3. 后端API设计

### 3.1 上传相关接口

#### POST /api/upload/auth
验证上传密码

**请求体：**
```json
{
  "password": "your-password"
}
```

**响应：**
```json
{
  "success": true,
  "token": "jwt-token"
}
```

#### POST /api/upload/video
上传视频（需要token）

**请求头：**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求体：**
```
courseId: 1
title: "第1集 课程介绍"
episode: 1
file: [视频文件]
```

**响应：**
```json
{
  "success": true,
  "data": {
    "videoId": 1,
    "status": "uploading"
  }
}
```

#### POST /api/upload/course
创建课程（需要token）

**请求体：**
```json
{
  "title": "Vue3从入门到精通",
  "description": "全面学习Vue3框架"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "courseId": 1
  }
}
```

### 3.2 查询相关接口

#### GET /api/courses
获取课程列表

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Vue3从入门到精通",
      "description": "全面学习Vue3框架",
      "coverImage": "/images/cover1.jpg",
      "videoCount": 10,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/courses/:id/videos
获取课程的视频列表

**响应：**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "title": "Vue3从入门到精通"
    },
    "videos": [
      {
        "id": 1,
        "title": "第1集 课程介绍",
        "episode": 1,
        "duration": 1200,
        "hlsPath": "/hls/1/1/index.m3u8",
        "status": "completed"
      }
    ]
  }
}
```

#### GET /api/videos/:id
获取视频详情

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "courseId": 1,
    "title": "第1集 课程介绍",
    "episode": 1,
    "duration": 1200,
    "hlsPath": "/hls/1/1/index.m3u8",
    "status": "completed"
  }
}
```

## 4. 前端路由设计

```javascript
// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Upload from '../views/Upload.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '课程视频' }
  },
  {
    path: '/upload',
    name: 'Upload',
    component: Upload,
    meta: { title: '视频上传', requiresAuth: true }
  },
  {
    path: '/course/:id',
    name: 'CourseDetail',
    component: Home,
    meta: { title: '课程详情' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查上传页面的token
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('uploadToken')
    if (!token) {
      // 显示密码输入弹窗
      next()
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
```

## 5. Nginx配置方案

```nginx
# nginx/video-site.conf

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 上传文件大小限制
        client_max_body_size 500M;
    }

    # HLS视频流代理
    location /hls/ {
        alias /path/to/storage/hls/;
        
        # HLS相关配置
        add_header Cache-Control "public, max-age=3600";
        add_header Access-Control-Allow-Origin *;
        
        # m3u8文件不缓存
        location ~ \.m3u8$ {
            add_header Cache-Control "no-cache";
            add_header Access-Control-Allow-Origin *;
        }
        
        # ts文件缓存
        location ~ \.ts$ {
            add_header Cache-Control "public, max-age=86400";
            add_header Access-Control-Allow-Origin *;
        }
        
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
    }

    # 日志配置
    access_log /var/log/nginx/video-site-access.log;
    error_log /var/log/nginx/video-site-error.log;
}
```

## 6. 核心技术实现要点

### 6.1 FFmpeg视频切片处理

```javascript
// backend/src/services/ffmpeg.js
const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const fs = require('fs').promises

class FFmpegService {
  /**
   * 将视频切片为HLS格式
   * @param {string} inputPath - 输入视频路径
   * @param {string} outputDir - 输出目录
   * @returns {Promise<{duration: number, hlsPath: string}>}
   */
  async convertToHLS(inputPath, outputDir) {
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true })
    
    const outputPath = path.join(outputDir, 'index.m3u8')
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c copy',                    // 不转码，直接复制流
          '-start_number 0',            // 起始序号
          '-hls_time 10',               // 每个切片10秒
          '-hls_list_size 0',           // 保留所有切片在播放列表
          '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
          '-f hls'                      // 输出格式HLS
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg命令:', cmd)
        })
        .on('progress', (progress) => {
          console.log(`处理进度: ${progress.percent}%`)
        })
        .on('end', async () => {
          // 获取视频时长
          const duration = await this.getVideoDuration(inputPath)
          resolve({
            duration,
            hlsPath: outputPath
          })
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg处理失败: ${err.message}`))
        })
        .run()
    })
  }

  /**
   * 获取视频时长
   */
  async getVideoDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err)
        else resolve(Math.floor(metadata.format.duration))
      })
    })
  }
}

module.exports = new FFmpegService()
```

### 6.2 异步任务队列实现

```javascript
// backend/src/services/queue.js
const db = require('../config/database')
const ffmpegService = require('./ffmpeg')
const path = require('path')

class QueueService {
  constructor() {
    this.isProcessing = false
    this.startProcessing()
  }

  /**
   * 添加任务到队列
   */
  async addTask(videoId) {
    await db.query(
      'INSERT INTO task_queue (video_id, status) VALUES (?, ?)',
      [videoId, 'pending']
    )
  }

  /**
   * 启动队列处理
   */
  startProcessing() {
    setInterval(() => {
      if (!this.isProcessing) {
        this.processNextTask()
      }
    }, 5000) // 每5秒检查一次
  }

  /**
   * 处理下一个任务
   */
  async processNextTask() {
    this.isProcessing = true

    try {
      // 获取待处理任务
      const [tasks] = await db.query(
        `SELECT tq.*, v.original_path, v.course_id, v.id as video_id
         FROM task_queue tq
         JOIN videos v ON tq.video_id = v.id
         WHERE tq.status = 'pending'
         ORDER BY tq.created_at ASC
         LIMIT 1`
      )

      if (tasks.length === 0) {
        this.isProcessing = false
        return
      }

      const task = tasks[0]

      // 更新任务状态为处理中
      await db.query(
        'UPDATE task_queue SET status = ?, updated_at = NOW() WHERE id = ?',
        ['processing', task.id]
      )

      // 更新视频状态
      await db.query(
        'UPDATE videos SET status = ? WHERE id = ?',
        ['processing', task.video_id]
      )

      // 执行FFmpeg切片
      const outputDir = path.join(
        __dirname, '../../storage/hls',
        task.course_id.toString(),
        task.video_id.toString()
      )

      const result = await ffmpegService.convertToHLS(
        task.original_path,
        outputDir
      )

      // 更新视频信息
      const hlsPath = `/hls/${task.course_id}/${task.video_id}/index.m3u8`
      await db.query(
        'UPDATE videos SET status = ?, hls_path = ?, duration = ? WHERE id = ?',
        ['completed', hlsPath, result.duration, task.video_id]
      )

      // 更新任务状态为完成
      await db.query(
        'UPDATE task_queue SET status = ?, updated_at = NOW() WHERE id = ?',
        ['completed', task.id]
      )

      console.log(`任务 ${task.id} 处理完成`)

    } catch (error) {
      console.error('任务处理失败:', error)
      
      // 更新任务状态为失败
      if (task) {
        await db.query(
          `UPDATE task_queue 
           SET status = ?, error_message = ?, retry_count = retry_count + 1 
           WHERE id = ?`,
          ['failed', error.message, task.id]
        )

        await db.query(
          'UPDATE videos SET status = ? WHERE id = ?',
          ['failed', task.video_id]
        )
      }
    } finally {
      this.isProcessing = false
    }
  }
}

module.exports = new QueueService()
```

### 6.3 密码保护中间件

```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken')

const UPLOAD_PASSWORD = 'your-secure-password' // 硬编码密码
const JWT_SECRET = 'your-jwt-secret-key'

// 验证密码
exports.verifyPassword = (req, res, next) => {
  const { password } = req.body

  if (password !== UPLOAD_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: '密码错误'
    })
  }

  // 生成token
  const token = jwt.sign({ auth: true }, JWT_SECRET, { expiresIn: '24h' })

  res.json({
    success: true,
    token
  })
}

// 验证token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    })
  }

  const token = authHeader.substring(7)

  try {
    jwt.verify(token, JWT_SECRET)
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token无效或已过期'
    })
  }
}
```

### 6.4 HLS播放器集成（Video.js）

```vue
<!-- frontend/src/components/VideoPlayer.vue -->
<template>
  <div class="video-player">
    <video
      ref="videoPlayer"
      class="video-js vjs-default-skin"
      controls
      preload="auto"
    ></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const props = defineProps({
  src: {
    type: String,
    required: true
  }
})

const videoPlayer = ref(null)
let player = null

onMounted(() => {
  player = videojs(videoPlayer.value, {
    controls: true,
    autoplay: false,
    preload: 'auto',
    fluid: true,
    sources: [{
      src: props.src,
      type: 'application/x-mpegURL'
    }]
  })
})

watch(() => props.src, (newSrc) => {
  if (player) {
    player.src({
      src: newSrc,
      type: 'application/x-mpegURL'
    })
  }
})

onBeforeUnmount(() => {
  if (player) {
    player.dispose()
  }
})
</script>

<style scoped>
.video-player {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
```

### 6.5 文件上传处理

```javascript
// backend/src/controllers/upload.js
const multer = require('multer')
const path = require('path')
const db = require('../config/database')
const queueService = require('../services/queue')

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/original'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|flv/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('只支持视频文件格式'))
    }
  }
})

exports.uploadMiddleware = upload.single('file')

exports.uploadVideo = async (req, res) => {
  try {
    const { courseId, title, episode } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件'
      })
    }

    // 插入视频记录
    const [result] = await db.query(
      `INSERT INTO videos (course_id, title, episode, original_path, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, title, episode, file.path, file.size, 'uploading']
    )

    const videoId = result.insertId

    // 添加到任务队列
    await queueService.addTask(videoId)

    res.json({
      success: true,
      data: {
        videoId,
        status: 'uploading'
      }
    })

  } catch (error) {
    console.error('上传失败:', error)
    res.status(500).json({
      success: false,
      message: '上传失败'
    })
  }
}
```

## 7. 部署流程

### 7.1 开发环境（Windows 11）

```bash
# 1. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 2. 配置环境变量
# backend/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=video_platform
PORT=3000

# 3. 初始化数据库
mysql -u root -p < sql/init.sql

# 4. 启动后端
cd backend && npm run dev

# 5. 启动前端
cd frontend && npm run dev
```

### 7.2 生产环境（Linux）

```bash
# 1. 构建前端
cd frontend && npm run build

# 2. 配置Nginx
sudo cp nginx/video-site.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/video-site.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 3. 使用PM2启动后端
cd backend
npm install -g pm2
pm2 start src/app.js --name video-backend
pm2 save
pm2 startup
```

## 8. 技术要点总结

### 8.1 关键技术选型理由

- **FFmpeg不转码切片**：使用 `-c copy` 参数直接复制流，避免转码耗时，适合已经是H.264编码的视频
- **HLS协议**：广泛支持，适合HTTP传输，支持自适应码率
- **异步队列**：避免上传接口阻塞，提升用户体验
- **JWT认证**：简单有效的无状态认证方案

### 8.2 性能优化建议

1. **数据库索引**：已在关键字段添加索引
2. **Nginx缓存**：m3u8不缓存，ts文件缓存24小时
3. **并发控制**：队列单线程处理，避免服务器过载
4. **文件清理**：定期清理原始视频文件（可选）

### 8.3 安全考虑

1. **密码硬编码**：生产环境建议使用环境变量
2. **文件上传限制**：限制文件大小和类型
3. **SQL注入防护**：使用参数化查询
4. **CORS配置**：Nginx添加适当的CORS头

### 8.4 扩展性考虑

- 支持多服务器部署：使用Redis作为任务队列
- 支持CDN加速：HLS文件可上传到OSS
- 支持多清晰度：FFmpeg可生成多码率切片
- 支持断点续传：前端使用分片上传

## 9. 系统架构图

```
┌─────────────┐
│   用户浏览器  │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  播放页面    │   │  上传页面    │
│  (Vue3)     │   │  (Vue3)     │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 │ (需要密码)
       ▼                 ▼
┌──────────────────────────────┐
│         Nginx 反向代理         │
├──────────────┬───────────────┤
│  静态资源     │   API代理      │
│  /hls/*      │   /api/*      │
└──────┬───────┴───────┬───────┘
       │               │
       │               ▼
       │        ┌─────────────┐
       │        │   Express   │
       │        │   后端服务   │
       │        └──────┬──────┘
       │               │
       │               ├──────────┐
       │               │          │
       │               ▼          ▼
       │        ┌──────────┐ ┌──────────┐
       │        │  MySQL   │ │ 任务队列  │
       │        │  数据库   │ │  服务    │
       │        └──────────┘ └─────┬────┘
       │                           │
       │                           ▼
       │                    ┌─────────────┐
       │                    │   FFmpeg    │
       │                    │  视频切片    │
       │                    └──────┬──────┘
       │                           │
       │                           ▼
       └────────────────────> ┌──────────┐
                               │ storage/ │
                               │ HLS文件  │
                               └──────────┘
```

## 10. 下一步实施建议

1. **创建项目基础结构**：按照目录结构创建文件夹和基础文件
2. **初始化数据库**：执行SQL脚本创建表结构
3. **实现后端核心功能**：
   - 数据库连接
   - 上传接口
   - FFmpeg服务
   - 任务队列
4. **实现前端页面**：
   - 播放页面
   - 上传页面
   - 视频播放器组件
5. **配置Nginx**：设置反向代理和静态资源服务
6. **测试验证**：上传测试视频，验证切片和播放功能

---

**注意事项：**
- 确保服务器已安装FFmpeg：`ffmpeg -version`
- 确保storage目录有写权限
- 生产环境建议使用HTTPS
- 定期备份数据库和视频文件