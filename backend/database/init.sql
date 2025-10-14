-- 创建数据库
CREATE DATABASE IF NOT EXISTS video_upload DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE video_upload;

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '课程标题',
  description TEXT COMMENT '课程描述',
  cover_image VARCHAR(500) COMMENT '封面图片路径',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课程表';

-- 视频表
CREATE TABLE IF NOT EXISTS videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL COMMENT '课程ID',
  title VARCHAR(255) NOT NULL COMMENT '视频标题',
  episode INT NOT NULL COMMENT '集数',
  original_path VARCHAR(500) COMMENT '原始视频路径',
  hls_path VARCHAR(500) COMMENT 'HLS m3u8文件路径',
  duration INT COMMENT '视频时长（秒）',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '处理状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id, episode),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视频表';

-- 任务队列表
CREATE TABLE IF NOT EXISTS task_queue (
  id INT PRIMARY KEY AUTO_INCREMENT,
  video_id INT NOT NULL COMMENT '视频ID',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '任务状态',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  INDEX idx_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务队列表';